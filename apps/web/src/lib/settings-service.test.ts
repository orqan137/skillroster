import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitTeamRepository } from "@skillspace/git";
import { afterEach, describe, expect, it } from "vitest";
import { runtimeConnection, saveTeamConnection } from "./local-config.js";
import { moveActiveTeamDirectory } from "./settings-service.js";

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

describe("roster local directory settings", () => {
  it("moves a clean clone and updates only the active roster connection", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillroster-settings-"));
    temporaryDirectories.push(root);
    process.env.SKILLSPACE_CONFIG = join(root, "config.yaml");
    delete process.env.SKILLSPACE_REGISTRY;
    delete process.env.SKILLSPACE_MEMBER;
    const source = join(root, "before");
    const target = join(root, "after");
    await GitTeamRepository.initialize({
      directory: source,
      name: "platform",
      displayName: "Platform",
      owner: "hong",
      ownerDisplayName: "Hong",
      ownerEmail: "hong@example.com",
      identity: { name: "Hong", email: "hong@example.com" },
    });
    await saveTeamConnection("platform", { directory: source, member: "hong" });

    await expect(moveActiveTeamDirectory(target)).resolves.toBe(target);
    await expect(stat(source)).rejects.toThrow();
    await expect(stat(target)).resolves.toMatchObject({});
    await expect(runtimeConnection()).resolves.toMatchObject({ directory: target, member: "hong" });
  }, 30_000);
});
