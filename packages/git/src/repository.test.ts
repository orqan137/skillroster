import { access, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { simpleGit } from "simple-git";
import { GitTeamRepository } from "./repository.js";

describe("GitTeamRepository", () => {
  it("initializes an empty remote and lets a member join", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillspace-git-"));
    const remote = join(root, "team.git");
    await simpleGit().raw(["init", "--bare", "--initial-branch=main", remote]);

    const ownerClone = join(root, "owner");
    const owner = await GitTeamRepository.initialize({
      directory: ownerClone,
      remote,
      name: "backend",
      displayName: "Backend Team",
      owner: "hong",
      ownerDisplayName: "Hong",
      ownerEmail: "hong@example.com",
      identity: { name: "Hong", email: "hong@example.com" },
      now: new Date("2026-08-25T00:00:00.000Z"),
    });
    expect((await owner.snapshot()).team.metadata.name).toBe("backend");
    await expect(owner.identity()).resolves.toEqual({ name: "Hong", email: "hong@example.com" });
    await owner.setIdentity({ name: "Hong Git", email: "hong.git@example.com" });
    await expect(owner.identity()).resolves.toEqual({ name: "Hong Git", email: "hong.git@example.com" });
    await expect(owner.ensureClean()).resolves.toBeUndefined();

    const memberClone = join(root, "member");
    const member = await GitTeamRepository.join({
      remote,
      directory: memberClone,
      member: "kim",
      displayName: "Kim",
      email: "kim@example.com",
      identity: { name: "Kim", email: "kim@example.com" },
    });
    expect((await member.snapshot()).members.map((item) => item.metadata.name)).toEqual([
      "hong",
      "kim",
    ]);

    await owner.sync();
    expect((await owner.snapshot()).members).toHaveLength(2);
    expect((await owner.revision()).length).toBeGreaterThanOrEqual(7);

    const beforeFailure = await owner.revision();
    await expect(owner.transaction("test: must rollback", async () => {
      await writeFile(join(ownerClone, "partial-write.txt"), "must be removed", "utf8");
      throw new Error("simulated mutation failure");
    })).rejects.toThrow("simulated mutation failure");
    await expect(access(join(ownerClone, "partial-write.txt"))).rejects.toThrow();
    expect((await simpleGit(ownerClone).status()).isClean()).toBe(true);
    expect(await owner.revision()).toBe(beforeFailure);

    const sameClone = await GitTeamRepository.open(ownerClone);
    await Promise.all([
      owner.transaction("test: concurrent one", () => writeFile(join(ownerClone, "one.txt"), "1", "utf8")),
      sameClone.transaction("test: concurrent two", () => writeFile(join(ownerClone, "two.txt"), "2", "utf8")),
    ]);
    expect((await simpleGit(ownerClone).status()).isClean()).toBe(true);
  }, 20_000);
});
