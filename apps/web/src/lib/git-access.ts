import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function isGitAuthenticationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /authentication failed|could not read username|terminal prompts disabled|permission denied \(publickey\)|publickey denied|access denied|authorization failed|invalid username or password|personal access token|403 forbidden|repository not found|could not read from remote repository|host key verification failed/i.test(message);
}

export async function checkGitRemoteAccess(remote: string): Promise<void> {
  const value = remote.trim();
  if (!value) throw new Error("원격 Git 저장소 주소가 필요합니다.");
  const directory = await mkdtemp(join(tmpdir(), "skillroster-git-check-"));
  const options = {
    cwd: directory,
    windowsHide: true,
    timeout: 20_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  };
  try {
    await execFileAsync("git", ["init", "--initial-branch=main"], options);
    await execFileAsync("git", ["config", "user.name", "SkillRoster access check"], options);
    await execFileAsync("git", ["config", "user.email", "access-check@skillroster.local"], options);
    await execFileAsync("git", ["commit", "--allow-empty", "-m", "SkillRoster access check"], options);
    await execFileAsync("git", ["push", "--dry-run", value, "HEAD:refs/heads/skillroster-access-check"], options);
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}
