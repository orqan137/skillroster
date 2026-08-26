import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";

export interface TeamConnection {
  remote?: string;
  directory: string;
  member: string;
}

export interface ClientConfig {
  version: 1;
  activeTeam?: string;
  teams: Record<string, TeamConnection>;
}

export function defaultConfigPath(): string {
  return process.env.SKILLSPACE_CONFIG
    ? resolve(process.env.SKILLSPACE_CONFIG)
    : join(homedir(), ".skillspace", "config.yaml");
}

export async function readConfig(path = defaultConfigPath()): Promise<ClientConfig> {
  try {
    const value = parse(await readFile(path, "utf8")) as Partial<ClientConfig>;
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

export async function writeConfig(config: ClientConfig, path = defaultConfigPath()): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify(config, { lineWidth: 100 }), "utf8");
}

export async function saveTeamConnection(
  team: string,
  connection: TeamConnection,
  path = defaultConfigPath(),
): Promise<void> {
  const config = await readConfig(path);
  config.activeTeam = team;
  config.teams[team] = connection;
  await writeConfig(config, path);
}

export async function resolveTeamConnection(team?: string): Promise<{ name: string; connection: TeamConnection }> {
  const config = await readConfig();
  const name = team ?? config.activeTeam;
  if (!name) throw new Error("No active team. Run `skillspace team init` or `skillspace team join`.");
  const connection = config.teams[name];
  if (!connection) throw new Error(`Unknown team: ${name}`);
  return { name, connection };
}
