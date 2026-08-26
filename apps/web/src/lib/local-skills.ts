import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { mkdir, readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";
import type {
  LocalSkillScanPayload,
  LocalSkillSourceSummary,
  LocalSkillSummary,
} from "./contracts.js";
import { readLocalSourcesConfig } from "./local-config.js";

type AgentKind = LocalSkillSourceSummary["agent"];

function expandPath(path: string): string {
  const trimmed = path.trim();
  if (trimmed === "~") return homedir();
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) return join(homedir(), trimmed.slice(2));
  return resolve(trimmed);
}

function defaultSources(): Array<{ agent: AgentKind; label: string; path: string }> {
  const home = homedir();
  return [
    { agent: "codex", label: "Codex", path: join(home, ".codex", "skills") },
    { agent: "opencode", label: "OpenCode", path: join(home, ".config", "opencode", "skills") },
    { agent: "claude", label: "Claude Code", path: join(home, ".claude", "skills") },
    { agent: "agents", label: "Agent Skills 표준", path: join(home, ".agents", "skills") },
  ];
}

async function parseSkill(path: string, sourcePath: string, agent: AgentKind): Promise<LocalSkillSummary | null> {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile() || info.size > 256_000) return null;
  const source = await readFile(path, "utf8");
  let metadata: Record<string, unknown> = {};
  if (source.startsWith("---")) {
    const end = source.indexOf("\n---", 3);
    if (end >= 0) {
      try {
        metadata = (parse(source.slice(3, end)) as Record<string, unknown>) ?? {};
      } catch {
        metadata = {};
      }
    }
  }
  const parent = basename(dirname(path));
  const flatName = basename(path).replace(/\.md$/i, "");
  return {
    name: String(metadata.name ?? (basename(path).toUpperCase() === "SKILL.MD" ? parent : flatName)),
    description: String(metadata.description ?? "설명 없음").trim() || "설명 없음",
    path,
    sourcePath,
    agent,
  };
}

async function scanSource(
  sourcePath: string,
  agent: AgentKind,
  maxSkills = 500,
): Promise<LocalSkillSummary[]> {
  const skills: LocalSkillSummary[] = [];
  const visited = new Set<string>();
  let directoryCount = 0;

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > 4 || skills.length >= maxSkills || directoryCount >= 1_000) return;
    const canonical = await realpath(directory).catch(() => resolve(directory));
    if (visited.has(canonical)) return;
    visited.add(canonical);
    directoryCount += 1;
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    const skillFile = entries.find((entry) => entry.isFile() && entry.name.toUpperCase() === "SKILL.MD");
    if (skillFile) {
      const parsed = await parseSkill(join(directory, skillFile.name), sourcePath, agent);
      if (parsed) skills.push(parsed);
      return;
    }
    for (const entry of entries) {
      if (skills.length >= maxSkills) return;
      const child = join(directory, entry.name);
      if (entry.isDirectory()) await walk(child, depth + 1);
      else if (entry.isSymbolicLink()) {
        const target = await stat(child).catch(() => null);
        if (target?.isDirectory()) await walk(child, depth + 1);
      }
    }
  }

  await walk(sourcePath, 0);
  return skills;
}

export async function scanLocalSkills(customPaths: string[] = []): Promise<LocalSkillScanPayload> {
  const config = await readLocalSourcesConfig();
  const candidates = [
    ...defaultSources(),
    ...[...config.sources, ...customPaths].map((path) => ({
      agent: "custom" as const,
      label: "사용자 지정",
      path: expandPath(path),
    })),
  ];
  const unique = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    const key = expandPath(candidate.path).toLowerCase();
    if (!unique.has(key)) unique.set(key, candidate);
  }
  const connected = new Set(config.sources.map((path) => expandPath(path).toLowerCase()));
  const sources: LocalSkillSourceSummary[] = [];
  const skills: LocalSkillSummary[] = [];

  for (const candidate of unique.values()) {
    const path = expandPath(candidate.path);
    const exists = (await stat(path).catch(() => null))?.isDirectory() ?? false;
    const found = exists ? await scanSource(path, candidate.agent) : [];
    skills.push(...found);
    sources.push({
      agent: candidate.agent,
      label: candidate.label,
      path,
      exists,
      connected: connected.has(path.toLowerCase()),
      skillCount: found.length,
    });
  }

  return {
    sources,
    skills: skills.sort((a, b) => a.name.localeCompare(b.name)),
    scannedAt: new Date().toISOString(),
  };
}

function assertSkillSlug(value: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error("스킬 ID는 영문 소문자, 숫자와 하이픈만 사용할 수 있습니다.");
  }
  return value;
}

function inside(parent: string, child: string): boolean {
  const root = resolve(parent);
  const target = resolve(child);
  return target === root || target.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
}

export async function connectedLocalSkillSources(): Promise<LocalSkillSourceSummary[]> {
  const scan = await scanLocalSkills();
  return scan.sources.filter((source) => source.connected && source.exists);
}

export async function createLocalSkill(input: {
  sourcePath: string;
  name: string;
  description: string;
  instructions: string;
}): Promise<string> {
  const sources = await connectedLocalSkillSources();
  const source = sources.find((item) => resolve(item.path).toLowerCase() === resolve(input.sourcePath).toLowerCase());
  if (!source) throw new Error("연결된 개인 스킬 저장소를 선택해주세요.");
  const name = assertSkillSlug(input.name);
  const target = resolve(source.path, name);
  if (!inside(source.path, target)) throw new Error("스킬 저장 경로가 올바르지 않습니다.");
  if (await stat(target).then(() => true, () => false)) {
    throw new Error(`개인 저장소에 같은 이름의 스킬이 있습니다: ${name}`);
  }
  const description = input.description.trim();
  const instructions = input.instructions.trim();
  if (!description || !instructions) throw new Error("스킬 설명과 사용 방법을 입력해주세요.");
  const frontmatter = stringify({ name, description, compatibility: ["opencode", "codex", "claude"] }).trim();
  await mkdir(target, { recursive: false });
  await writeFile(join(target, "SKILL.md"), `---\n${frontmatter}\n---\n\n# ${name}\n\n${instructions}\n`, "utf8");
  return target;
}

export async function resolveConnectedLocalSkill(skillPath: string): Promise<LocalSkillSummary> {
  const scan = await scanLocalSkills();
  const connected = new Set(scan.sources.filter((source) => source.connected && source.exists).map((source) => resolve(source.path).toLowerCase()));
  const target = resolve(skillPath);
  const skill = scan.skills.find((item) => resolve(dirname(item.path)).toLowerCase() === target.toLowerCase() && connected.has(resolve(item.sourcePath).toLowerCase()));
  if (!skill || !inside(skill.sourcePath, target)) {
    throw new Error(`연결된 개인 저장소의 스킬을 찾을 수 없습니다: ${relative(process.cwd(), target)}`);
  }
  return skill;
}
