import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  addMember,
  initializeTeamStore,
  loadTeamSnapshot,
  type InitializeTeamInput,
  type TeamSnapshot,
} from "@skillspace/core";
import { DOCUMENT_SCHEMAS } from "@skillspace/schemas";
import { simpleGit, type SimpleGit } from "simple-git";

const transactionQueues = new Map<string, Promise<void>>();
const lastPullAt = new Map<string, number>();

async function withRepositoryLock<T>(directory: string, task: () => Promise<T>): Promise<T> {
  const key = resolve(directory).toLowerCase();
  const previous = transactionQueues.get(key) ?? Promise.resolve();
  let release = (): void => {};
  const gate = new Promise<void>((resolveGate) => { release = resolveGate; });
  const tail = previous.then(() => gate);
  transactionQueues.set(key, tail);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (transactionQueues.get(key) === tail) transactionQueues.delete(key);
  }
}

export class RepositoryStateError extends Error {
  readonly code = "GIT_WORKTREE_DIRTY";
  constructor(message: string) {
    super(message);
    this.name = "RepositoryStateError";
  }
}

export interface GitIdentity {
  name: string;
  email: string;
}

export interface InitializeRepositoryInput extends InitializeTeamInput {
  directory: string;
  remote?: string;
  identity: GitIdentity;
}

export interface JoinRepositoryInput {
  remote: string;
  directory: string;
  member: string;
  displayName: string;
  email: string;
  identity: GitIdentity;
}

async function pathExists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

async function isEmptyDirectory(path: string): Promise<boolean> {
  if (!(await pathExists(path))) return true;
  return (await readdir(path)).length === 0;
}

async function configureIdentity(git: SimpleGit, identity: GitIdentity): Promise<void> {
  await git.addConfig("user.name", identity.name, false, "local");
  await git.addConfig("user.email", identity.email, false, "local");
}

async function installSchemas(directory: string): Promise<void> {
  const target = join(directory, "schemas");
  await mkdir(target, { recursive: true });
  await Promise.all(
    Object.entries(DOCUMENT_SCHEMAS).map(([name, schema]) =>
      writeFile(join(target, `${name}.schema.json`), `${JSON.stringify(schema, null, 2)}\n`, "utf8"),
    ),
  );
}

export class GitTeamRepository {
  readonly directory: string;
  private readonly git: SimpleGit;

  private constructor(directory: string) {
    this.directory = resolve(directory);
    this.git = simpleGit({ baseDir: this.directory, binary: "git", maxConcurrentProcesses: 1 });
  }

  static async initialize(input: InitializeRepositoryInput): Promise<GitTeamRepository> {
    const directory = resolve(input.directory);
    if (!(await isEmptyDirectory(directory))) {
      throw new Error(`Initialization directory must be empty: ${directory}`);
    }
    await mkdir(dirname(directory), { recursive: true });

    if (input.remote) {
      const references = await simpleGit().listRemote(["--heads", "--tags", input.remote]);
      if (references.trim()) {
        throw new Error(`원격 Git 저장소가 비어 있지 않습니다: ${input.remote}`);
      }
      await simpleGit().clone(input.remote, directory);
    } else {
      await mkdir(directory, { recursive: true });
      await simpleGit(directory).init(false, { "--initial-branch": input.defaultBranch ?? "main" });
    }

    const repository = new GitTeamRepository(directory);
    await configureIdentity(repository.git, input.identity);
    const branch = input.defaultBranch ?? "main";
    const currentBranch = await repository.currentBranch();
    if (currentBranch !== branch) {
      await repository.git.checkoutLocalBranch(branch);
    }

    await initializeTeamStore(directory, input);
    await installSchemas(directory);
    await repository.commit("chore(skillspace): initialize team registry");
    await repository.pushIfConfigured(branch, true);
    return repository;
  }

  static async join(input: JoinRepositoryInput): Promise<GitTeamRepository> {
    const directory = resolve(input.directory);
    if (!(await isEmptyDirectory(directory))) {
      throw new Error(`Join directory must be empty: ${directory}`);
    }
    await mkdir(dirname(directory), { recursive: true });
    await simpleGit().clone(input.remote, directory);
    const repository = await GitTeamRepository.open(directory);
    await configureIdentity(repository.git, input.identity);
    await repository.transaction(`chore(member): add ${input.member}`, async () => {
      await addMember(directory, {
        name: input.member,
        displayName: input.displayName,
        email: input.email,
      });
    });
    return repository;
  }

  static async open(directory: string): Promise<GitTeamRepository> {
    const root = resolve(directory);
    if (!(await pathExists(join(root, ".git")))) {
      throw new Error(`Not a Git worktree: ${root}`);
    }
    if (!(await pathExists(join(root, "skillspace.yaml")))) {
      throw new Error(`Not a SkillRoster team repository: ${root}`);
    }
    return new GitTeamRepository(root);
  }

  async snapshot(): Promise<TeamSnapshot> {
    return withRepositoryLock(this.directory, () => loadTeamSnapshot(this.directory));
  }

  async state(refresh = false): Promise<{ snapshot: TeamSnapshot; revision: string }> {
    return withRepositoryLock(this.directory, async () => {
      const key = this.directory.toLowerCase();
      if (refresh && Date.now() - (lastPullAt.get(key) ?? 0) >= 5_000) {
        await this.assertClean();
        await this.pullIfConfigured();
        lastPullAt.set(key, Date.now());
      }
      return {
        snapshot: await loadTeamSnapshot(this.directory),
        revision: (await this.git.revparse(["HEAD"])).trim(),
      };
    });
  }

  async transaction<T>(message: string, mutate: () => Promise<T>): Promise<T> {
    return withRepositoryLock(this.directory, async () => {
      await this.assertClean();
      await this.pullIfConfigured();
      lastPullAt.set(this.directory.toLowerCase(), Date.now());
      const baseRevision = (await this.git.revparse(["HEAD"])).trim();
      try {
        const result = await mutate();
        await loadTeamSnapshot(this.directory);
        const committed = await this.commit(message);
        if (committed) await this.pushWithRetry();
        return result;
      } catch (error) {
        await this.git.reset(["--hard", baseRevision]).catch(() => undefined);
        await this.git.raw(["clean", "-fd"]).catch(() => undefined);
        throw error;
      }
    });
  }

  async sync(): Promise<void> {
    await withRepositoryLock(this.directory, () => this.pullIfConfigured());
  }

  async revision(): Promise<string> {
    return withRepositoryLock(this.directory, async () => (await this.git.revparse(["HEAD"])).trim());
  }

  async identity(): Promise<GitIdentity> {
    return withRepositoryLock(this.directory, async () => ({
      name: (await this.git.getConfig("user.name", "local")).value ?? "",
      email: (await this.git.getConfig("user.email", "local")).value ?? "",
    }));
  }

  async setIdentity(identity: GitIdentity): Promise<void> {
    const name = identity.name.trim();
    const email = identity.email.trim();
    if (!name || !email) throw new Error("Git 작성자 이름과 이메일이 필요합니다.");
    await withRepositoryLock(this.directory, () => configureIdentity(this.git, { name, email }));
  }

  async ensureClean(): Promise<void> {
    await withRepositoryLock(this.directory, () => this.assertClean());
  }

  private async currentBranch(): Promise<string> {
    try {
      return (await this.git.raw(["symbolic-ref", "--short", "HEAD"])).trim();
    } catch {
      const branch = (await this.git.revparse(["--abbrev-ref", "HEAD"])).trim();
      return branch === "HEAD" ? "main" : branch;
    }
  }

  private async assertClean(): Promise<void> {
    const status = await this.git.status();
    if (!status.isClean()) {
      throw new RepositoryStateError("팀 Git 작업 폴더에 커밋되지 않은 변경이 있습니다. 변경을 정리한 뒤 다시 시도해주세요.");
    }
  }

  private async hasOrigin(): Promise<boolean> {
    const remotes = await this.git.getRemotes();
    return remotes.some((remote) => remote.name === "origin");
  }

  private async commit(message: string): Promise<boolean> {
    await this.git.add(["-A"]);
    const status = await this.git.status();
    if (status.isClean()) return false;
    await this.git.commit(message);
    return true;
  }

  private async pullIfConfigured(): Promise<void> {
    if (!(await this.hasOrigin())) return;
    const branch = await this.currentBranch();
    try {
      await this.git.pull("origin", branch, { "--rebase": "true" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/couldn't find remote ref|no tracking information|unborn/i.test(message)) throw error;
    }
  }

  private async pushIfConfigured(branch: string, setUpstream = false): Promise<void> {
    if (!(await this.hasOrigin())) return;
    const args = setUpstream ? ["-u", "origin", branch] : ["origin", branch];
    await this.git.push(args);
  }

  private async pushWithRetry(): Promise<void> {
    if (!(await this.hasOrigin())) return;
    const branch = await this.currentBranch();
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await this.pushIfConfigured(branch);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await this.git.pull("origin", branch, { "--rebase": "true" });
      }
    }
    throw lastError;
  }
}
