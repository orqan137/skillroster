import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addMember,
  addProjectSkill,
  createEvidence,
  createProject,
  publishSkill,
  writeEvidence,
  writeReview,
} from "@skillspace/core";
import { GitTeamRepository } from "@skillspace/git";

const DEMO_NOW = new Date("2026-08-26T09:00:00.000Z");

function exampleSkillsDirectory(): string {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  return resolve(moduleDirectory, "../../../examples/skills");
}

export interface DemoRegistry {
  directory: string;
  member: string;
  repository: GitTeamRepository;
  sourcesConfig: string;
}

export async function createDemoRegistry(parentDirectory?: string): Promise<DemoRegistry> {
  const parent = resolve(parentDirectory ?? tmpdir());
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, "skillroster-demo-"));
  const sourcesConfig = join(parent, `${basename(directory)}-sources.yaml`);
  await writeFile(
    sourcesConfig,
    `version: 1\ncompleted: true\nsources:\n  - ${JSON.stringify(exampleSkillsDirectory())}\n`,
    "utf8",
  );
  const repository = await GitTeamRepository.initialize({
    directory,
    name: "platform-team",
    displayName: "Platform Team",
    owner: "minjun",
    ownerDisplayName: "김민준",
    ownerEmail: "minjun@example.com",
    identity: { name: "SkillRoster Demo", email: "demo@skillroster.dev" },
    now: DEMO_NOW,
  });

  await repository.transaction("chore(member): add demo teammates", async () => {
    await addMember(directory, {
      name: "seoyeon",
      displayName: "박서연",
      email: "seoyeon@example.com",
      now: DEMO_NOW,
    });
    await addMember(directory, {
      name: "jihoon",
      displayName: "이지훈",
      email: "jihoon@example.com",
      now: DEMO_NOW,
    });
  });

  const examples = exampleSkillsDirectory();
  const skills = [
    { name: "api-contract-check", tags: ["api", "typescript", "review"] },
    { name: "docker-debug", tags: ["docker", "debug", "devops"] },
    { name: "spring-review", tags: ["spring", "java", "review"] },
  ];
  for (const skill of skills) {
    await repository.transaction(`feat(skill): publish minjun/${skill.name}@1.0.0`, () =>
      publishSkill(directory, {
        sourceDirectory: join(examples, skill.name),
        owner: "minjun",
        version: "1.0.0",
        visibility: "team",
        tags: skill.tags,
        now: DEMO_NOW,
      }),
    );
  }

  await repository.transaction("feat(project): register checkout-api", () =>
    createProject(directory, {
      name: "checkout-api",
      displayName: "Checkout API",
      tags: ["api", "typescript", "docker"],
      verificationCommands: ["pnpm test"],
      createdBy: "seoyeon",
      now: DEMO_NOW,
    }),
  );

  await repository.transaction("feat(project): configure checkout-api skills", async () => {
    await addProjectSkill(directory, "checkout-api", "minjun/api-contract-check", "1.0.0", DEMO_NOW);
    await addProjectSkill(directory, "checkout-api", "minjun/docker-debug", "1.0.0", DEMO_NOW);
  });

  await repository.transaction("feat(project): register inventory-console", async () => {
    await createProject(directory, {
      name: "inventory-console",
      displayName: "Inventory Console",
      tags: ["spring", "java", "docker"],
      verificationCommands: ["./gradlew test"],
      createdBy: "jihoon",
      now: DEMO_NOW,
    });
    await addProjectSkill(directory, "inventory-console", "minjun/spring-review", "1.0.0", DEMO_NOW);
    await addProjectSkill(directory, "inventory-console", "minjun/docker-debug", "1.0.0", DEMO_NOW);
  });

  await repository.transaction("docs(review): add team skill reviews", async () => {
    await writeReview(directory, {
      skill: "minjun/api-contract-check",
      version: "1.0.0",
      reviewer: "seoyeon",
      score: 5,
      comment: "요청과 응답 스키마 누락을 배포 전에 찾는 데 도움 됨.",
      project: "checkout-api",
      now: DEMO_NOW,
    });
    await writeReview(directory, {
      skill: "minjun/api-contract-check",
      version: "1.0.0",
      reviewer: "jihoon",
      score: 4,
      comment: "체크 항목이 짧고 실제 코드 리뷰에 바로 적용 가능.",
      project: "checkout-api",
      now: DEMO_NOW,
    });
    await writeReview(directory, {
      skill: "minjun/docker-debug",
      version: "1.0.0",
      reviewer: "minjun",
      score: 4,
      comment: "작성자 자체 점검 완료. 파괴적 정리를 기본 금지함.",
      project: "checkout-api",
      now: DEMO_NOW,
    });
    await writeReview(directory, {
      skill: "minjun/spring-review",
      version: "1.0.0",
      reviewer: "jihoon",
      score: 5,
      comment: "트랜잭션 경계와 예외 처리 누락을 일관된 순서로 확인 가능.",
      project: "inventory-console",
      now: DEMO_NOW,
    });
  });

  await repository.transaction("test(evidence): record accepted skill use", async () => {
    await writeEvidence(
      directory,
      createEvidence({
        skill: "minjun/api-contract-check",
        version: "1.0.0",
        member: "seoyeon",
        project: "checkout-api",
        sessionId: "demo-session",
        status: "verified",
        changedFiles: 3,
        verificationCommand: "pnpm test",
        verificationPassed: true,
        acceptedCommit: "0123456789abcdef0123456789abcdef01234567",
        coUsedSkills: ["minjun/docker-debug"],
        createdAt: DEMO_NOW.toISOString(),
      }),
    );
  });

  await repository.transaction("test(evidence): record inventory review use", async () => {
    await writeEvidence(
      directory,
      createEvidence({
        skill: "minjun/spring-review",
        version: "1.0.0",
        member: "jihoon",
        project: "inventory-console",
        sessionId: "demo-inventory-session",
        status: "verified",
        changedFiles: 5,
        verificationCommand: "./gradlew test",
        verificationPassed: true,
        acceptedCommit: "fedcba9876543210fedcba9876543210fedcba98",
        coUsedSkills: ["minjun/docker-debug"],
        createdAt: DEMO_NOW.toISOString(),
      }),
    );
  });

  return { directory, member: "minjun", repository, sourcesConfig };
}
