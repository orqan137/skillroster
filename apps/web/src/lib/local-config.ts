import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";

export interface TeamConnection {
  remote?: string;
  directory: string;
  member: string;
}

interface ClientConfig {
  version: 1;
  activeTeam?: string;
  teams: Record<string, TeamConnection>;
}

export interface LocalSourcesConfig {
  version: 1;
  completed: boolean;
  sources: string[];
}

export interface RuntimeConnection extends TeamConnection {
  team: string;
  source: "environment" | "local-config";
}

export function localConfigPath(): string {
  return process.env.SKILLSPACE_CONFIG
    ? resolve(process.env.SKILLSPACE_CONFIG)
    : join(homedir(), ".skillspace", "config.yaml");
}

export function localSourcesConfigPath(): string {
  return process.env.SKILLSPACE_SOURCES_CONFIG
    ? resolve(process.env.SKILLSPACE_SOURCES_CONFIG)
    : join(dirname(localConfigPath()), "sources.yaml");
}

export function defaultTeamDirectory(team = "my-team"): string {
  const base = process.env.SKILLSPACE_TEAMS_DIRECTORY
    ? resolve(process.env.SKILLSPACE_TEAMS_DIRECTORY)
    : join(homedir(), ".skillspace", "teams");
  return join(base, team);
}

async function readConfig(): Promise<ClientConfig> {
  try {
    const value = parse(await readFile(localConfigPath(), "utf8")) as Partial<ClientConfig>;
    return {
      version: 1,
      ...(value.activeTeam ? { activeTeam: value.activeTeam } : {}),
      teams: value.teams ?? {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, teams: {} };
    throw error;
  }
}

async function writeConfig(config: ClientConfig): Promise<void> {
  const path = localConfigPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify(config, { lineWidth: 100 }), "utf8");
}

export async function listTeamConnections(): Promise<{
  activeTeam?: string;
  teams: Array<{ team: string } & TeamConnection>;
  source: "environment" | "local-config";
}> {
  const registry = process.env.SKILLSPACE_REGISTRY;
  const member = process.env.SKILLSPACE_MEMBER;
  if (registry && member) {
    return {
      activeTeam: "environment",
      teams: [{ team: "environment", directory: resolve(registry), member }],
      source: "environment",
    };
  }
  const config = await readConfig();
  return {
    ...(config.activeTeam ? { activeTeam: config.activeTeam } : {}),
    teams: Object.entries(config.teams).map(([team, connection]) => ({ team, ...connection })),
    source: "local-config",
  };
}

export async function activateTeam(team: string): Promise<void> {
  if (process.env.SKILLSPACE_REGISTRY || process.env.SKILLSPACE_MEMBER) {
    throw new Error("환경 변수로 연결한 팀은 전환할 수 없습니다.");
  }
  const config = await readConfig();
  if (!config.teams[team]) throw new Error("연결된 팀을 찾을 수 없습니다.");
  config.activeTeam = team;
  await writeConfig(config);
}

export async function runtimeConnection(): Promise<RuntimeConnection | null> {
  const registry = process.env.SKILLSPACE_REGISTRY;
  const member = process.env.SKILLSPACE_MEMBER;
  if (registry && member) {
    return { team: "environment", directory: resolve(registry), member, source: "environment" };
  }

  const config = await readConfig();
  if (!config.activeTeam) return null;
  const connection = config.teams[config.activeTeam];
  if (!connection) return null;
  return { team: config.activeTeam, ...connection, source: "local-config" };
}

export async function saveTeamConnection(
  team: string,
  connection: TeamConnection,
): Promise<void> {
  const config = await readConfig();
  config.activeTeam = team;
  config.teams[team] = connection;
  await writeConfig(config);
}

export async function readLocalSourcesConfig(): Promise<LocalSourcesConfig> {
  try {
    const value = parse(await readFile(localSourcesConfigPath(), "utf8")) as Partial<LocalSourcesConfig>;
    return {
      version: 1,
      completed: value.completed ?? false,
      sources: Array.isArray(value.sources) ? value.sources.map(String) : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, completed: false, sources: [] };
    }
    throw error;
  }
}

export async function saveLocalSources(sources: string[], completed = true): Promise<void> {
  const path = localSourcesConfigPath();
  const unique = [...new Set(sources.map((source) => resolve(source)))];
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify({ version: 1, completed, sources: unique }, { lineWidth: 100 }), "utf8");
}
