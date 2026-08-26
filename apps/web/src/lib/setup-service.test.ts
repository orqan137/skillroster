import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeConnection } from "./local-config.js";
import { initializeTeam, joinTeam } from "./setup-service.js";

const execFileAsync = promisify(execFile);
const originalConfig = process.env.SKILLSPACE_CONFIG;
const originalRegistry = process.env.SKILLSPACE_REGISTRY;
const originalMember = process.env.SKILLSPACE_MEMBER;
const temporaryDirectories: string[] = [];

afterEach(async () => {
  if (originalConfig === undefined) delete process.env.SKILLSPACE_CONFIG;
  else process.env.SKILLSPACE_CONFIG = originalConfig;
  if (originalRegistry === undefined) delete process.env.SKILLSPACE_REGISTRY;
  else process.env.SKILLSPACE_REGISTRY = originalRegistry;
  if (originalMember === undefined) delete process.env.SKILLSPACE_MEMBER;
  else process.env.SKILLSPACE_MEMBER = originalMember;
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  })));
});

describe("team initialization service", () => {
  it("requires an empty remote Git repository", async () => {
    await expect(initializeTeam({
      team: "platform",
      displayName: "Platform Team",
      owner: "lead",
      ownerName: "Team Lead",
      email: "lead@example.com",
      remote: "",
    })).rejects.toThrow("원격 Git 저장소");
  });

  it("clones, commits, pushes and saves a reusable CLI connection", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillspace-remote-setup-"));
    temporaryDirectories.push(root);
    const remote = join(root, "team.git");
    const registry = join(root, "registry");
    const config = join(root, "client", "config.yaml");
    process.env.SKILLSPACE_CONFIG = config;
    delete process.env.SKILLSPACE_REGISTRY;
    delete process.env.SKILLSPACE_MEMBER;
    await execFileAsync("git", ["init", "--bare", "--initial-branch=main", remote]);

    const result = await initializeTeam({
      team: "platform",
      displayName: "Platform Team",
      owner: "lead",
      ownerName: "Team Lead",
      email: "lead@example.com",
      remote,
      directory: registry,
    });

    const [{ stdout: remoteRevision }, { stdout: origin }, connection, configSource] = await Promise.all([
      execFileAsync("git", ["--git-dir", remote, "rev-parse", "refs/heads/main"]),
      execFileAsync("git", ["-C", registry, "remote", "get-url", "origin"]),
      runtimeConnection(),
      readFile(config, "utf8"),
    ]);
    expect(result.revision).toBe(remoteRevision.trim());
    expect(origin.trim()).toBe(remote);
    expect(connection).toMatchObject({ team: "platform", directory: registry, member: "lead", remote });
    expect(configSource).toContain("activeTeam: platform");
    await expect(initializeTeam({
      team: "second-team",
      displayName: "Second Team",
      owner: "lead",
      ownerName: "Team Lead",
      email: "lead@example.com",
      remote,
      directory: join(root, "second-registry"),
    })).rejects.toThrow("비어 있지 않습니다");

    const memberRegistry = join(root, "member-registry");
    const joined = await joinTeam({
      member: "kim",
      displayName: "Kim Developer",
      email: "kim@example.com",
      remote,
      directory: memberRegistry,
    });
    const [{ stdout: memberFile }, memberConnection] = await Promise.all([
      execFileAsync("git", ["--git-dir", remote, "show", "main:members/kim.yaml"]),
      runtimeConnection(),
    ]);
    expect(joined.team).toBe("platform");
    expect(memberFile).toContain("displayName: Kim Developer");
    expect(memberConnection).toMatchObject({ team: "platform", directory: memberRegistry, member: "kim", remote });
  }, 30_000);
});
