import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addMember,
  createProject,
  initializeTeamStore,
  loadTeamSnapshot,
  publishSkill,
} from "@skillspace/core";
import type { GitTeamRepository } from "@skillspace/git";
import { describe, expect, it } from "vitest";
import { writeLocalProjectConfig } from "./project-config.js";
import { flushEvidence } from "./evidence.js";

const execFileAsync = promisify(execFile);

describe("evidence flush", () => {
  it("turns a private local queue event into verified Git-native evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillspace-evidence-"));
    const registry = join(root, "registry");
    const projectRoot = join(root, "project");
    await initializeTeamStore(registry, {
      name: "backend",
      displayName: "Backend",
      owner: "kim",
      ownerDisplayName: "Kim",
      ownerEmail: "kim@example.com",
    });
    await addMember(registry, {
      name: "hong",
      displayName: "Hong",
      email: "hong@example.com",
    });
    const skillSource = join(root, "spring-review");
    await mkdir(skillSource, { recursive: true });
    await writeFile(
      join(skillSource, "SKILL.md"),
      "---\nname: spring-review\ndescription: Review Spring code\n---\n\n# Review\n",
      "utf8",
    );
    await publishSkill(registry, {
      sourceDirectory: skillSource,
      owner: "hong",
      version: "1.0.0",
    });
    const project = await createProject(registry, {
      name: "checkout-api",
      displayName: "Checkout API",
      tags: ["typescript"],
      verificationCommands: ['node -e "process.exit(0)"'],
      createdBy: "kim",
    });
    await mkdir(projectRoot, { recursive: true });
    await writeLocalProjectConfig(projectRoot, project);
    await execFileAsync("git", ["init", "--initial-branch=main", projectRoot]);
    await execFileAsync("git", ["config", "user.name", "Kim"], { cwd: projectRoot });
    await execFileAsync("git", ["config", "user.email", "kim@example.com"], { cwd: projectRoot });
    await writeFile(join(projectRoot, "result.txt"), "accepted\n", "utf8");
    await execFileAsync("git", ["add", "result.txt"], { cwd: projectRoot });
    await execFileAsync("git", ["commit", "-m", "feat: accepted result"], { cwd: projectRoot });
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: projectRoot });

    const eventDirectory = join(projectRoot, ".skillspace", "events");
    await mkdir(eventDirectory, { recursive: true });
    await writeFile(
      join(eventDirectory, "event-session-call.json"),
      JSON.stringify({
        id: "event-session-call",
        sessionId: "session-1",
        skill: "hong/spring-review",
        version: "1.0.0",
        usedAt: "2026-08-25T00:00:00.000Z",
        privacy: { promptStored: false, sourceStored: false },
      }),
      "utf8",
    );

    const repository = {
      directory: registry,
      transaction: async (_message: string, mutate: () => Promise<unknown>) => mutate(),
    } as unknown as GitTeamRepository;
    const result = await flushEvidence({
      projectRoot,
      commit: stdout.trim(),
      repository,
      member: "kim",
    });
    const snapshot = await loadTeamSnapshot(registry);

    expect(result).toMatchObject({ processed: 1, status: "verified" });
    expect(snapshot.evidence[0]?.spec).toMatchObject({
      skill: "hong/spring-review",
      verificationPassed: true,
      changedFiles: 1,
      privacy: { promptStored: false, sourceStored: false },
    });
  }, 20_000);
});
