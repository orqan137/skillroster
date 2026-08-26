import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { activateTeam, listTeamConnections, runtimeConnection, saveTeamConnection } from "./local-config.js";

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
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("local dashboard config", () => {
  it("shares the same active team connection format as the CLI", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skillspace-web-config-"));
    temporaryDirectories.push(directory);
    process.env.SKILLSPACE_CONFIG = join(directory, "config.yaml");
    delete process.env.SKILLSPACE_REGISTRY;
    delete process.env.SKILLSPACE_MEMBER;

    await expect(runtimeConnection()).resolves.toBeNull();
    await saveTeamConnection("platform", {
      directory: join(directory, "registry"),
      member: "lead",
    });

    await expect(runtimeConnection()).resolves.toMatchObject({
      team: "platform",
      member: "lead",
      source: "local-config",
    });
  });

  it("stores multiple teams and switches the active roster", async () => {
    const directory = await mkdtemp(join(tmpdir(), "skillroster-team-switch-"));
    temporaryDirectories.push(directory);
    process.env.SKILLSPACE_CONFIG = join(directory, "config.yaml");
    delete process.env.SKILLSPACE_REGISTRY;
    delete process.env.SKILLSPACE_MEMBER;
    await saveTeamConnection("platform", { directory: join(directory, "platform"), member: "hong" });
    await saveTeamConnection("mobile", { directory: join(directory, "mobile"), member: "kim" });

    await expect(listTeamConnections()).resolves.toMatchObject({
      activeTeam: "mobile",
      teams: [{ team: "platform" }, { team: "mobile" }],
    });
    await activateTeam("platform");
    await expect(runtimeConnection()).resolves.toMatchObject({ team: "platform", member: "hong" });
    await expect(activateTeam("missing")).rejects.toThrow("찾을 수 없습니다");
  });
});
