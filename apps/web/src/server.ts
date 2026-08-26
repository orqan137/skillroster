import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { addProjectSkill, createProject, deleteProject, installProjectSkills, publishSkill, removeProjectSkill, updateMember, updateProject, writeReview } from "@skillspace/core";
import { activeMember, dashboardData, projectData, repository, skillData } from "./lib/data.js";
import {
  defaultTeamDirectory,
  activateTeam,
  listTeamConnections,
  localConfigPath,
  readLocalSourcesConfig,
  runtimeConnection,
  saveLocalSources,
} from "./lib/local-config.js";
import { createLocalSkill, resolveConnectedLocalSkill, scanLocalSkills } from "./lib/local-skills.js";
import { checkGitRemoteAccess } from "./lib/git-access.js";
import { ApiInputError, ApiNotFoundError, classifyApiError, PayloadTooLargeError } from "./lib/api-errors.js";
import { syncProjectRepository } from "./lib/project-repository.js";
import { initializeTeam, joinTeam } from "./lib/setup-service.js";
import { parseTags } from "./lib/tags.js";
import { moveActiveTeamDirectory } from "./lib/settings-service.js";

const appDirectory = resolve(process.cwd());
const development = process.argv.includes("--dev");
const execFileAsync = promisify(execFile);

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const hostname = argument("--hostname") ?? process.env.HOSTNAME ?? "127.0.0.1";
const port = Number(argument("--port") ?? process.env.PORT ?? 3210);

function skillReferences(value: unknown): Array<{ label?: string; location: string; includeFile?: boolean }> {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ApiInputError("참고 자료 형식을 확인해주세요.");
  if (value.length > 20) throw new ApiInputError("참고 자료는 최대 20개까지 등록할 수 있습니다.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new ApiInputError("참고 자료 형식을 확인해주세요.");
    const reference = item as { label?: unknown; location?: unknown; includeFile?: unknown };
    const label = String(reference.label ?? "").trim();
    const location = String(reference.location ?? "").trim();
    if (!location) throw new ApiInputError("참고 링크 또는 파일 경로를 입력해주세요.");
    if (/(?:[?&](?:access_?token|token|signature|sig|x-amz-signature)=)|(?:https?:\/\/)[^/\s]+:[^@/\s]+@/i.test(location)) {
      throw new ApiInputError("인증 토큰이나 비밀번호가 포함된 참고 주소는 등록할 수 없습니다.");
    }
    if (label.length > 80 || location.length > 2048 || [...location].some((character) => character.charCodeAt(0) < 32)) {
      throw new ApiInputError("참고 자료 이름 또는 위치가 너무 길거나 올바르지 않습니다.");
    }
    return { ...(label ? { label } : {}), location, ...(reference.includeFile === true ? { includeFile: true } : {}) };
  });
}

function assertRemoteGitUrl(remote: string): string {
  const value = remote.trim();
  if (!/^(?:https?:\/\/|ssh:\/\/|git@)[^\s]+$/i.test(value)) {
    throw new ApiInputError("HTTPS 또는 SSH 형식의 원격 Git 주소가 필요합니다.");
  }
  return value;
}

async function syncLinkedProject(name: string) {
  const [project, connection, repo] = await Promise.all([projectData(name), runtimeConnection(), repository()]);
  if (!project) throw new ApiNotFoundError("프로젝트를 찾을 수 없습니다.");
  const projectRemote = project.project.spec.repository;
  if (!projectRemote) throw new ApiInputError("연결된 프로젝트 Git 저장소가 없습니다.");
  return syncProjectRepository({
    project: name,
    displayName: project.project.spec.displayName,
    projectRepository: projectRemote,
    ...(connection?.remote ? { teamRegistry: connection.remote } : {}),
    skills: project.selected,
    identity: await repo.identity(),
  });
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new PayloadTooLargeError();
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

async function gitConfig(key: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["config", "--global", key]);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function setupStatus() {
  const [connection, gitName, gitEmail, localSources] = await Promise.all([
    runtimeConnection(),
    gitConfig("user.name"),
    gitConfig("user.email"),
    readLocalSourcesConfig(),
  ]);
  let gitIdentity = { name: gitName, email: gitEmail };
  let memberProfile: { id: string; displayName: string; email: string; role: string } | null = null;
  if (connection) {
    const repo = await repository();
    const [identity, snapshot] = await Promise.all([repo.identity(), repo.snapshot()]);
    gitIdentity = identity;
    const member = snapshot.members.find((item) => item.metadata.name === connection.member);
    if (member) {
      memberProfile = {
        id: member.metadata.name,
        displayName: member.spec.displayName,
        email: member.spec.email,
        role: member.spec.role,
      };
    }
  }
  return {
    configured: Boolean(connection),
    connection,
    configPath: localConfigPath(),
    defaultTeamDirectory: defaultTeamDirectory(),
    gitIdentity,
    memberProfile,
    localSources,
  };
}

async function api(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (!url.pathname.startsWith("/api/")) return false;

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      const connection = await runtimeConnection();
      if (!connection) {
        json(response, 200, { ok: true, setupRequired: true });
        return true;
      }
      const data = await dashboardData();
      json(response, 200, { ok: true, team: data.snapshot.team.metadata.name, revision: data.revision });
      return true;
    }
    if (request.method === "GET" && url.pathname === "/api/setup/status") {
      json(response, 200, await setupStatus());
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/git/preflight") {
      const input = await body(request);
      await checkGitRemoteAccess(String(input.remote ?? ""));
      json(response, 200, { ok: true, pushAccess: true });
      return true;
    }
    if (request.method === "PATCH" && url.pathname === "/api/settings/profile") {
      const input = await body(request);
      const displayName = String(input.displayName ?? "").trim();
      const email = String(input.email ?? "").trim();
      const gitName = String(input.gitName ?? "").trim();
      const gitEmail = String(input.gitEmail ?? "").trim();
      if (!displayName || !email || !gitName || !gitEmail) {
        throw new ApiInputError("표시 이름, 이메일과 Git 작성자 정보가 필요합니다.");
      }
      if (!/^\S+@\S+\.\S+$/.test(email) || !/^\S+@\S+\.\S+$/.test(gitEmail)) {
        throw new ApiInputError("이메일 형식을 확인해주세요.");
      }
      const member = await activeMember();
      const repo = await repository();
      const previousIdentity = await repo.identity();
      await repo.setIdentity({ name: gitName, email: gitEmail });
      try {
        await repo.transaction(`docs(member): update ${member}`, () =>
          updateMember(repo.directory, member, { displayName, email }),
        );
      } catch (error) {
        await repo.setIdentity(previousIdentity).catch(() => undefined);
        throw error;
      }
      json(response, 200, { ok: true, member });
      return true;
    }
    if (request.method === "PATCH" && url.pathname === "/api/settings/directory") {
      const input = await body(request);
      const directory = await moveActiveTeamDirectory(String(input.directory ?? ""));
      json(response, 200, { ok: true, directory });
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/setup/initialize") {
      const input = await body(request);
      const result = await initializeTeam({
        team: String(input.team ?? ""),
        displayName: String(input.displayName ?? ""),
        owner: String(input.owner ?? ""),
        ownerName: String(input.ownerName ?? ""),
        email: String(input.email ?? ""),
        remote: String(input.remote ?? ""),
        ...(input.directory ? { directory: String(input.directory) } : {}),
      });
      json(response, 201, result);
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/setup/join") {
      const input = await body(request);
      const result = await joinTeam({
        member: String(input.member ?? ""),
        displayName: String(input.displayName ?? ""),
        email: String(input.email ?? ""),
        remote: String(input.remote ?? ""),
        directory: String(input.directory ?? ""),
      });
      json(response, 201, result);
      return true;
    }
    if (request.method === "GET" && url.pathname === "/api/teams") {
      const connections = await listTeamConnections();
      const teams = await Promise.all(connections.teams.map(async (connection) => {
        let displayName = connection.team;
        try {
          const repo = await import("@skillspace/git").then(({ GitTeamRepository }) => GitTeamRepository.open(connection.directory));
          displayName = (await repo.snapshot()).team.spec.displayName;
        } catch {
          // Keep the local team identifier when a clone is temporarily unavailable.
        }
        return {
          ...connection,
          displayName,
          active: connection.team === connections.activeTeam,
        };
      }));
      json(response, 200, {
        activeTeam: connections.activeTeam ?? null,
        switchable: connections.source === "local-config",
        teams,
      });
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/teams/activate") {
      const input = await body(request);
      await activateTeam(String(input.team ?? ""));
      json(response, 200, { ok: true });
      return true;
    }
    if (request.method === "GET" && url.pathname === "/api/local-skills/scan") {
      json(response, 200, await scanLocalSkills(url.searchParams.getAll("path")));
      return true;
    }
    if (request.method === "POST" && url.pathname === "/api/local-skills/connect") {
      const input = await body(request);
      if (!Array.isArray(input.sources)) {
        throw new ApiInputError("연결할 스킬 저장소 목록이 필요합니다.");
      }
      const sources = input.sources.map(String);
      const scan = await scanLocalSkills(sources);
      const existing = new Set(scan.sources.filter((source) => source.exists).map((source) => resolve(source.path).toLowerCase()));
      const invalid = sources.find((source) => !existing.has(resolve(source).toLowerCase()));
      if (invalid) {
        throw new ApiInputError(`스킬 저장소 폴더를 찾을 수 없습니다: ${invalid}`);
      }
      await saveLocalSources(sources, true);
      json(response, 200, { ok: true, connected: sources.length });
      return true;
    }
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      const localSkills = await scanLocalSkills();
      const connected = new Set(localSkills.sources.filter((source) => source.connected).map((source) => source.path.toLowerCase()));
      json(response, 200, {
        ...(await dashboardData()),
        member: await activeMember(),
        localSkills: {
          ...localSkills,
          sources: localSkills.sources.filter((source) => source.connected),
          skills: localSkills.skills.filter((skill) => connected.has(skill.sourcePath.toLowerCase())),
        },
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/skills") {
      const input = await body(request);
      const mode = String(input.mode ?? "create");
      const version = String(input.version ?? "1.0.0");
      const tags = Array.isArray(input.tags) ? input.tags.flatMap((tag) => parseTags(String(tag))) : parseTags(String(input.tags ?? ""));
      const references = skillReferences(input.references);
      let sourceDirectory: string;
      let publishName = String(input.name ?? "");
      if (mode === "existing") {
        if (!input.skillPath) {
          throw new ApiInputError("공유할 개인 로컬 스킬을 선택해주세요.");
        }
        const localSkill = await resolveConnectedLocalSkill(String(input.skillPath));
        sourceDirectory = dirname(localSkill.path);
        publishName = localSkill.name;
      } else {
        sourceDirectory = await createLocalSkill({
          sourcePath: String(input.sourcePath ?? ""),
          name: String(input.name ?? ""),
          description: String(input.description ?? ""),
          instructions: String(input.instructions ?? ""),
        });
      }
      const member = await activeMember();
      const repo = await repository();
      const selfReview = input.selfReview && typeof input.selfReview === "object"
        ? input.selfReview as { score?: unknown; comment?: unknown }
        : null;
      const skill = await repo.transaction(`feat(skill): publish ${member}/${publishName}@${version}`, async () => {
        const published = await publishSkill(repo.directory, { sourceDirectory, owner: member, version, tags, references });
        if (selfReview) {
          await writeReview(repo.directory, {
            skill: `${member}/${published.metadata.name}`,
            version: published.spec.version,
            reviewer: member,
            score: Number(selfReview.score),
            comment: String(selfReview.comment ?? "").trim(),
          });
        }
        return published;
      });
      json(response, 201, {
        ok: true,
        id: `${skill.spec.owner}/${skill.metadata.name}`,
        version: skill.spec.version,
        localDirectory: sourceDirectory,
        selfReviewCreated: Boolean(selfReview),
      });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/projects") {
      const input = await body(request);
      const name = String(input.name ?? "");
      const displayName = String(input.displayName ?? "").trim();
      const projectRemote = assertRemoteGitUrl(String(input.repository ?? ""));
      const tags = Array.isArray(input.tags) ? input.tags.flatMap((tag) => parseTags(String(tag))) : parseTags(String(input.tags ?? ""));
      const skills = Array.isArray(input.skills)
        ? input.skills.map((item) => item as { skill?: unknown; version?: unknown })
        : [];
      if (!name || !displayName) {
        throw new ApiInputError("프로젝트 이름과 ID를 입력해주세요.");
      }
      await checkGitRemoteAccess(projectRemote);
      const current = await dashboardData();
      const references = skills.map((item) => ({ skill: String(item.skill ?? ""), version: String(item.version ?? "") }));
      for (const reference of references) {
        const available = current.snapshot.skills.find((item) => item.id === reference.skill);
        if (!available || available.document.spec.version !== reference.version) {
          throw new ApiInputError(`선택한 스킬 버전을 찾을 수 없습니다: ${reference.skill}@${reference.version}`);
        }
      }
      const member = await activeMember();
      const repo = await repository();
      const project = await repo.transaction(`feat(project): create ${name}`, async () => {
        const created = await createProject(repo.directory, {
          name,
          displayName,
          tags,
          verificationCommands: [],
          repository: projectRemote,
          createdBy: member,
        });
        for (const reference of references) {
          await addProjectSkill(repo.directory, name, reference.skill, reference.version);
        }
        return created;
      });
      let repositorySynced = true;
      let warning = "";
      try {
        await syncLinkedProject(project.metadata.name);
      } catch (error) {
        repositorySynced = false;
        warning = `프로젝트는 생성됐지만 프로젝트 Git 구성 반영에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`;
      }
      json(response, 201, { ok: true, project: project.metadata.name, linkedSkills: references.length, repositorySynced, ...(warning ? { warning } : {}) });
      return true;
    }

    const skillMatch = url.pathname.match(/^\/api\/skills\/([^/]+)\/([^/]+)$/);
    if (request.method === "GET" && skillMatch) {
      const data = await skillData(decodeURIComponent(skillMatch[1] ?? ""), decodeURIComponent(skillMatch[2] ?? ""));
      if (!data) throw new ApiNotFoundError("스킬을 찾을 수 없습니다.");
      else json(response, 200, { ...data, member: await activeMember() });
      return true;
    }

    const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (request.method === "GET" && projectMatch) {
      const name = decodeURIComponent(projectMatch[1] ?? "");
      const project = await projectData(name);
      if (!project) throw new ApiNotFoundError("프로젝트를 찾을 수 없습니다.");
      else {
        const dashboard = await dashboardData();
        json(response, 200, { ...project, dashboard: { ...dashboard, member: await activeMember() } });
      }
      return true;
    }
    if (request.method === "PATCH" && projectMatch) {
      const name = decodeURIComponent(projectMatch[1] ?? "");
      const input = await body(request);
      const displayName = String(input.displayName ?? "").trim();
      const tags = Array.isArray(input.tags) ? input.tags.flatMap((tag) => parseTags(String(tag))) : parseTags(String(input.tags ?? ""));
      if (!displayName) throw new ApiInputError("프로젝트 이름이 필요합니다.");
      const repo = await repository();
      const project = await repo.transaction(`docs(project): update ${name}`, () => updateProject(repo.directory, name, { displayName, tags }));
      let warning = "";
      try { await syncLinkedProject(name); } catch (error) { warning = error instanceof Error ? error.message : String(error); }
      json(response, 200, { ok: true, project: project.metadata.name, repositorySynced: !warning, ...(warning ? { warning } : {}) });
      return true;
    }
    if (request.method === "DELETE" && projectMatch) {
      const name = decodeURIComponent(projectMatch[1] ?? "");
      const repo = await repository();
      await repo.transaction(`chore(project): remove ${name}`, () => deleteProject(repo.directory, name));
      json(response, 200, { ok: true, project: name });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/reviews") {
      const input = await body(request);
      if (!input.skill || !input.version || !input.score || !input.comment) {
        throw new ApiInputError("스킬, 버전, 평점, 평가 의견이 필요합니다.");
      }
      const member = await activeMember();
      const repo = await repository();
      await repo.transaction(`docs(review): ${member} reviewed ${input.skill}@${input.version}`, () =>
        writeReview(repo.directory, {
          skill: String(input.skill),
          version: String(input.version),
          reviewer: member,
          score: Number(input.score),
          comment: String(input.comment),
          ...(input.project ? { project: String(input.project) } : {}),
        }),
      );
      json(response, 200, { ok: true });
      return true;
    }

    const projectSkillMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/skills$/);
    if (request.method === "POST" && projectSkillMatch) {
      const name = decodeURIComponent(projectSkillMatch[1] ?? "");
      const input = await body(request);
      if (!input.skill || !input.version) {
        throw new ApiInputError("스킬과 버전이 필요합니다.");
      }
      const repo = await repository();
      await repo.transaction(`feat(project): add ${input.skill}@${input.version} to ${name}`, () =>
        addProjectSkill(repo.directory, name, String(input.skill), String(input.version)),
      );
      let warning = "";
      try { await syncLinkedProject(name); } catch (error) { warning = error instanceof Error ? error.message : String(error); }
      json(response, 200, { ok: true, repositorySynced: !warning, ...(warning ? { warning } : {}) });
      return true;
    }

    const projectRepositorySyncMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/repository\/sync$/);
    if (request.method === "POST" && projectRepositorySyncMatch) {
      const name = decodeURIComponent(projectRepositorySyncMatch[1] ?? "");
      const result = await syncLinkedProject(name);
      json(response, 200, { ok: true, ...result });
      return true;
    }

    const projectSyncMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/sync$/);
    if (request.method === "POST" && projectSyncMatch) {
      const name = decodeURIComponent(projectSyncMatch[1] ?? "");
      const input = await body(request);
      const projectRoot = resolve(String(input.projectRoot ?? "").trim());
      if (!String(input.projectRoot ?? "").trim()) throw new ApiInputError("스킬을 설치할 로컬 프로젝트 폴더가 필요합니다.");
      const info = await stat(projectRoot).catch(() => null);
      if (!info?.isDirectory()) throw new ApiInputError(`로컬 프로젝트 폴더를 찾을 수 없습니다: ${projectRoot}`);
      const repo = await repository();
      await repo.sync();
      const installed = await installProjectSkills(repo.directory, name, projectRoot);
      json(response, 200, { ok: true, project: name, projectRoot, installed });
      return true;
    }
    if (request.method === "DELETE" && projectSkillMatch) {
      const name = decodeURIComponent(projectSkillMatch[1] ?? "");
      const input = await body(request);
      if (!input.skill) {
        throw new ApiInputError("연결을 해제할 스킬이 필요합니다.");
      }
      const repo = await repository();
      await repo.transaction(`feat(project): remove ${input.skill} from ${name}`, () =>
        removeProjectSkill(repo.directory, name, String(input.skill)),
      );
      let warning = "";
      try { await syncLinkedProject(name); } catch (error) { warning = error instanceof Error ? error.message : String(error); }
      json(response, 200, { ok: true, repositorySynced: !warning, ...(warning ? { warning } : {}) });
      return true;
    }

    throw new ApiNotFoundError("API 경로를 찾을 수 없습니다.");
  } catch (error) {
    const requestId = randomUUID().slice(0, 12);
    const failure = classifyApiError(error, requestId);
    if (failure.report) console.error(`[${requestId}]`, error);
    json(response, failure.status, failure.body);
  }
  return true;
}

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function serveProduction(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const dist = resolve(appDirectory, "dist");
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const requested = resolve(dist, `.${pathname}`);
  const safe = requested === dist || requested.startsWith(`${dist}${sep}`);
  let file = safe ? requested : join(dist, "index.html");
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) file = join(dist, "index.html");
  response.writeHead(200, { "content-type": mimeTypes[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
}

async function start(): Promise<void> {
  let vite: Awaited<ReturnType<typeof import("vite")["createServer"]>> | undefined;
  if (development) {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({ root: appDirectory, appType: "spa", server: { middlewareMode: true } });
  } else {
    await readFile(join(appDirectory, "dist", "index.html"));
  }

  const server = createServer(async (request, response) => {
    if (await api(request, response)) return;
    if (vite) vite.middlewares(request, response, () => json(response, 404, { error: "찾을 수 없습니다." }));
    else await serveProduction(request, response);
  });
  server.listen(port, hostname, () => {
    const displayHost = hostname === "0.0.0.0" ? "127.0.0.1" : hostname;
    console.log(`SkillRoster React dashboard: http://${displayHost}:${port}`);
  });
}

void start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
