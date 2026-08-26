import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parse, stringify } from "yaml";

const execFileAsync = promisify(execFile);

export interface ProjectRepositoryConfig {
  project: string;
  displayName: string;
  projectRepository: string;
  teamRegistry?: string;
  skills: Array<{ skill: string; version: string }>;
}

export function projectConfigurationDocument(input: ProjectRepositoryConfig, updatedAt = new Date()): object {
  return {
    apiVersion: "skillroster.dev/v1alpha1",
    kind: "ProjectConfiguration",
    metadata: { name: input.project },
    spec: {
      displayName: input.displayName,
      projectRepository: input.projectRepository,
      ...(input.teamRegistry ? { teamRegistry: input.teamRegistry } : {}),
      skills: input.skills,
      updatedAt: updatedAt.toISOString(),
      privacy: {
        referencedFilesUploaded: false,
      },
    },
  };
}

function comparableProjectConfiguration(document: unknown): string {
  if (!document || typeof document !== "object") return "";
  const copy = structuredClone(document) as { spec?: { updatedAt?: unknown } };
  if (copy.spec) copy.spec.updatedAt = "<ignored>";
  return JSON.stringify(copy);
}

async function git(directory: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: directory,
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return stdout.trim();
}

export async function syncProjectRepository(
  input: ProjectRepositoryConfig & { identity: { name: string; email: string } },
): Promise<{ branch: string; changed: boolean }> {
  const root = await mkdtemp(join(tmpdir(), "skillroster-project-"));
  const checkout = join(root, "repository");
  try {
    await git(root, ["clone", "--quiet", "--no-tags", input.projectRepository, checkout]);
    await git(checkout, ["config", "user.name", input.identity.name]);
    await git(checkout, ["config", "user.email", input.identity.email]);

    let branch = "main";
    try {
      branch = await git(checkout, ["branch", "--show-current"]) || "main";
      await git(checkout, ["rev-parse", "--verify", "HEAD"]);
    } catch {
      await git(checkout, ["symbolic-ref", "HEAD", `refs/heads/${branch}`]);
    }

    const configurationDirectory = join(checkout, ".skillroster");
    const configurationPath = join(configurationDirectory, "project.yaml");
    await mkdir(configurationDirectory, { recursive: true });
    const currentSource = await readFile(configurationPath, "utf8").catch(() => "");
    const currentDocument = currentSource ? parse(currentSource) : null;
    const nextDocument = projectConfigurationDocument(input);
    if (
      currentDocument &&
      comparableProjectConfiguration(currentDocument) === comparableProjectConfiguration(nextDocument)
    ) {
      return { branch, changed: false };
    }
    await writeFile(
      configurationPath,
      stringify(nextDocument, { lineWidth: 0 }),
      "utf8",
    );
    await git(checkout, ["add", ".skillroster/project.yaml"]);
    const changed = Boolean(await git(checkout, ["status", "--porcelain", "--", ".skillroster/project.yaml"]));
    if (!changed) return { branch, changed: false };

    await git(checkout, ["commit", "-m", `chore(skillroster): sync ${input.project} skills`]);
    await git(checkout, ["push", "--set-upstream", "origin", `HEAD:${branch}`]);
    return { branch, changed: true };
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}
