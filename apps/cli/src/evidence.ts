import { readdir, readFile, rm } from "node:fs/promises";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, resolve } from "node:path";
import { createEvidence, writeEvidence } from "@skillspace/core";
import type { GitTeamRepository } from "@skillspace/git";
import type { EvidenceStatus } from "@skillspace/schemas";
import { readLocalProjectConfig } from "./project-config.js";

const execFileAsync = promisify(execFile);

interface QueuedEvidenceEvent {
  id: string;
  sessionId: string;
  skill: string;
  version: string;
  usedAt: string;
  privacy: { promptStored: false; sourceStored: false };
}

export interface FlushEvidenceResult {
  processed: number;
  status: EvidenceStatus | null;
  verificationCommands: string[];
}

function isQueuedEvent(value: unknown): value is QueuedEvidenceEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<QueuedEvidenceEvent>;
  return Boolean(
    event.id &&
      /^[a-z0-9-]+$/.test(event.id) &&
      event.sessionId &&
      typeof event.skill === "string" &&
      /^[a-z0-9-]+\/[a-z0-9-]+$/.test(event.skill) &&
      event.version &&
      event.usedAt &&
      event.privacy?.promptStored === false &&
      event.privacy?.sourceStored === false,
  );
}

async function readQueue(projectRoot: string): Promise<Array<{ path: string; event: QueuedEvidenceEvent }>> {
  const directory = join(projectRoot, ".skillspace", "events");
  const files = (await readdir(directory).catch(() => []))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const queue: Array<{ path: string; event: QueuedEvidenceEvent }> = [];
  for (const name of files) {
    const path = join(directory, name);
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!isQueuedEvent(value)) throw new Error(`Invalid SkillRoster evidence event: ${path}`);
    queue.push({ path, event: value });
  }
  return queue;
}

async function changedFileCount(projectRoot: string, commit: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["show", "--pretty=format:", "--name-only", commit],
      { cwd: projectRoot, windowsHide: true },
    );
    return new Set(stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)).size;
  } catch {
    return 0;
  }
}

async function runCommand(command: string, cwd: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", () => resolvePromise(false));
    child.once("exit", (code) => resolvePromise(code === 0));
  });
}

async function verify(commands: string[], projectRoot: string): Promise<boolean | null> {
  if (!commands.length) return null;
  for (const command of commands) {
    if (!(await runCommand(command, projectRoot))) return false;
  }
  return true;
}

export async function flushEvidence(input: {
  projectRoot: string;
  commit: string;
  repository: GitTeamRepository;
  member: string;
}): Promise<FlushEvidenceResult> {
  const projectRoot = resolve(input.projectRoot);
  if (!/^[a-f0-9]{7,64}$/i.test(input.commit)) throw new Error("Invalid Git commit SHA");
  const queue = await readQueue(projectRoot);
  if (!queue.length) return { processed: 0, status: null, verificationCommands: [] };

  const project = await readLocalProjectConfig(projectRoot);
  const commands = project.spec.verificationCommands;
  const verificationPassed = await verify(commands, projectRoot);
  const status: EvidenceStatus =
    verificationPassed === null ? "used" : verificationPassed ? "verified" : "failed";
  const changedFiles = await changedFileCount(projectRoot, input.commit);
  const sessions = new Map<string, Set<string>>();
  for (const { event } of queue) {
    const used = sessions.get(event.sessionId) ?? new Set<string>();
    used.add(event.skill);
    sessions.set(event.sessionId, used);
  }

  await input.repository.transaction(
    `chore(evidence): record ${queue.length} skill use event(s)`,
    async () => {
      for (const { event } of queue) {
        const coUsedSkills = [...(sessions.get(event.sessionId) ?? [])]
          .filter((skill) => skill !== event.skill)
          .sort();
        const document = createEvidence({
          skill: event.skill,
          version: event.version,
          member: input.member,
          project: project.metadata.name,
          sessionId: event.sessionId,
          status,
          changedFiles,
          ...(commands[0] ? { verificationCommand: commands.join(" && ") } : {}),
          ...(verificationPassed === null ? {} : { verificationPassed }),
          acceptedCommit: input.commit,
          coUsedSkills,
          createdAt: event.usedAt,
        });
        document.metadata.name = event.id;
        await writeEvidence(input.repository.directory, document);
      }
    },
  );

  await Promise.all(queue.map(({ path }) => rm(path)));
  return { processed: queue.length, status, verificationCommands: commands };
}
