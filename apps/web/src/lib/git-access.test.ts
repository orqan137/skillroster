import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { checkGitRemoteAccess, isGitAuthenticationError } from "./git-access.js";

const execFileAsync = promisify(execFile);
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Git remote access check", () => {
  it("checks push access without creating a remote branch", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillroster-access-test-"));
    directories.push(root);
    const remote = join(root, "team.git");
    await execFileAsync("git", ["init", "--bare", "--initial-branch=main", remote]);
    await expect(checkGitRemoteAccess(remote)).resolves.toBeUndefined();
    await expect(execFileAsync("git", ["--git-dir", remote, "show-ref"])).rejects.toThrow();
  }, 20_000);

  it("recognizes common HTTPS and SSH authentication failures", () => {
    expect(isGitAuthenticationError(new Error("Authentication failed for remote"))).toBe(true);
    expect(isGitAuthenticationError(new Error("Permission denied (publickey)"))).toBe(true);
    expect(isGitAuthenticationError(new Error("Host key verification failed"))).toBe(true);
    expect(isGitAuthenticationError(new Error("repository does not exist"))).toBe(false);
  });
});
