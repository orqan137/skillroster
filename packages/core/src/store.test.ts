import { access, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addMember,
  addProjectSkill,
  createEvidence,
  createProject,
  deleteProject,
  initializeTeamStore,
  installProjectSkills,
  loadTeamSnapshot,
  publishSkill,
  removeProjectSkill,
  updateProject,
  updateMember,
  writeEvidence,
  writeReview,
} from "./store.js";
import { rankSkills, recommendSkills } from "./ranking.js";

async function fixture(): Promise<{ root: string; skill: string }> {
  const root = await mkdtemp(join(tmpdir(), "skillspace-core-"));
  const skill = join(root, "source-skill");
  await mkdir(skill, { recursive: true });
  await writeFile(
    join(skill, "SKILL.md"),
    "---\nname: spring-review\ndescription: Review Spring code\ncompatibility: opencode\n---\n\n# Review\n",
    "utf8",
  );
  return { root, skill };
}

describe("team store", () => {
  it("creates, publishes, reviews, recommends, and persists evidence", async () => {
    const { root, skill } = await fixture();
    const now = new Date("2026-08-25T00:00:00.000Z");
    await initializeTeamStore(root, {
      name: "backend",
      displayName: "Backend Team",
      owner: "hong",
      ownerDisplayName: "Hong",
      ownerEmail: "hong@example.com",
      now,
    });
    await addMember(root, {
      name: "kim",
      displayName: "Kim",
      email: "kim@example.com",
      now,
    });
    await updateMember(root, "kim", { displayName: "Kim Updated", email: "kim.new@example.com" });
    const guide = join(skill, "review-guide.txt");
    await writeFile(guide, "팀에 공유 가능한 검토 기준", "utf8");
    await publishSkill(root, {
      sourceDirectory: skill,
      owner: "hong",
      version: "1.0.0",
      tags: ["java", "spring-boot"],
      references: [
        { label: "운영 가이드", location: "https://docs.example.com/release" },
        { label: "검토 기준", location: guide, includeFile: true },
      ],
      now,
    });
    await writeReview(root, {
      skill: "hong/spring-review",
      version: "1.0.0",
      reviewer: "kim",
      score: 5,
      comment: "Works in our API",
      project: "shopping-api",
      now,
    });
    await writeReview(root, {
      skill: "hong/spring-review",
      version: "1.0.0",
      reviewer: "hong",
      score: 4,
      comment: "작성자 자체 점검",
      now,
    });
    const project = await createProject(root, {
      name: "shopping-api",
      displayName: "Shopping API",
      tags: ["java", "spring-boot"],
      verificationCommands: ["mvn test"],
      createdBy: "hong",
      now,
    });
    await addProjectSkill(root, "shopping-api", "hong/spring-review", "1.0.0", now);
    await writeEvidence(
      root,
      createEvidence({
        skill: "hong/spring-review",
        version: "1.0.0",
        member: "kim",
        project: "shopping-api",
        sessionId: "session-1",
        status: "verified",
        changedFiles: 2,
        verificationCommand: "mvn test",
        verificationPassed: true,
        acceptedCommit: "1234567",
        coUsedSkills: [],
        createdAt: now.toISOString(),
      }),
    );

    const snapshot = await loadTeamSnapshot(root);
    expect(snapshot.members).toHaveLength(2);
    expect(snapshot.members.find((item) => item.metadata.name === "kim")).toMatchObject({
      spec: { displayName: "Kim Updated", email: "kim.new@example.com", role: "member" },
    });
    expect(snapshot.skills.map((item) => item.id)).toEqual(["hong/spring-review"]);
    expect(snapshot.skills[0]?.document.spec.references).toEqual([
      { label: "운영 가이드", location: "https://docs.example.com/release" },
      { label: "검토 기준", location: "attachments/review-guide.txt", included: true },
    ]);
    expect(snapshot.reviews).toHaveLength(2);
    expect(snapshot.evidence).toHaveLength(1);

    const ranked = rankSkills(snapshot.skills, snapshot.reviews, snapshot.evidence, snapshot.skillsets, now);
    expect(ranked[0]).toMatchObject({
      skill: "hong/spring-review",
      reviewCount: 2,
      peerReviewCount: 1,
      selfReviewCount: 1,
      verifiedRuns: 1,
      adoptedProjects: 1,
    });
    expect(ranked[0]?.averageRating).toBeCloseTo((5 + 4 * 0.35) / 1.35, 5);
    const recommendations = recommendSkills(project, ranked);
    expect(recommendations[0]?.matchingTags).toEqual(["java", "spring-boot"]);
    const rankedFallback = recommendSkills({ ...project, spec: { ...project.spec, tags: ["react"] } }, ranked);
    expect(rankedFallback[0]?.matchingTags).toEqual([]);

    const localProject = join(root, "local-project");
    await mkdir(localProject);
    await expect(installProjectSkills(root, "shopping-api", localProject)).resolves.toEqual([{ name: "spring-review", skill: "hong/spring-review", version: "1.0.0" }]);
    await expect(readFile(join(localProject, ".opencode", "skills", "spring-review", "SKILL.md"), "utf8")).resolves.toContain("# Review");
    await expect(readFile(join(localProject, ".opencode", "skills", "spring-review", "attachments", "review-guide.txt"), "utf8")).resolves.toContain("검토 기준");

    await removeProjectSkill(root, "shopping-api", "hong/spring-review", now);
    expect((await loadTeamSnapshot(root)).skillsets[0]?.spec.skills).toHaveLength(0);

    const installedSkill = await readFile(
      join(root, "skills", "hong", "spring-review", "SKILL.md"),
      "utf8",
    );
    expect(installedSkill).toContain("# Review");
  });

  it("ignores supplemental YAML inside a skill package but validates the canonical skill document", async () => {
    const { root, skill } = await fixture();
    await mkdir(join(skill, "agents"), { recursive: true });
    await writeFile(join(skill, "agents", "openai.yaml"), "interface:\n  display_name: Review Agent\n", "utf8");
    await initializeTeamStore(root, {
      name: "backend",
      displayName: "Backend Team",
      owner: "hong",
      ownerDisplayName: "Hong",
      ownerEmail: "hong@example.com",
    });
    await publishSkill(root, { sourceDirectory: skill, owner: "hong", version: "1.0.0" });

    await expect(loadTeamSnapshot(root)).resolves.toMatchObject({ skills: [{ id: "hong/spring-review" }] });

    const canonical = join(root, "skills", "hong", "spring-review", "skill.yaml");
    await writeFile(canonical, "description: missing-kind\n", "utf8");
    await expect(loadTeamSnapshot(root)).rejects.toMatchObject({
      name: "RegistryDataError",
      code: "REGISTRY_DATA_INVALID",
      documentPath: canonical,
    });
  });

  it("publishes only SKILL.md and leaves neighboring private files local", async () => {
    const { root, skill } = await fixture();
    await writeFile(join(skill, ".env"), "TOKEN=must-not-copy", "utf8");
    await initializeTeamStore(root, {
      name: "backend",
      displayName: "Backend Team",
      owner: "hong",
      ownerDisplayName: "Hong",
      ownerEmail: "hong@example.com",
    });
    await expect(publishSkill(root, { sourceDirectory: skill, owner: "hong", version: "1.0.0" })).resolves.toMatchObject({ kind: "Skill" });
    await expect(access(join(root, "skills", "hong", "spring-review", "SKILL.md"))).resolves.toBeUndefined();
    await expect(access(join(root, "skills", "hong", "spring-review", ".env"))).rejects.toThrow();
  });

  it("rejects an explicitly included credential-like attachment before writing the release", async () => {
    const { root, skill } = await fixture();
    const secret = join(skill, ".env");
    await writeFile(secret, "TOKEN=must-not-copy", "utf8");
    await initializeTeamStore(root, {
      name: "backend",
      displayName: "Backend Team",
      owner: "hong",
      ownerDisplayName: "Hong",
      ownerEmail: "hong@example.com",
    });
    await expect(publishSkill(root, {
      sourceDirectory: skill,
      owner: "hong",
      version: "1.0.0",
      references: [{ location: secret, includeFile: true }],
    })).rejects.toThrow("인증정보로 오인될 수 있는 파일");
    await expect(access(join(root, "releases", "hong", "spring-review", "1.0.0"))).rejects.toThrow();
  });

  it("reports a missing included attachment without exposing a filesystem error", async () => {
    const { root, skill } = await fixture();
    await initializeTeamStore(root, {
      name: "backend",
      displayName: "Backend Team",
      owner: "hong",
      ownerDisplayName: "Hong",
      ownerEmail: "hong@example.com",
    });
    await expect(publishSkill(root, {
      sourceDirectory: skill,
      owner: "hong",
      version: "1.0.0",
      references: [{ location: join(skill, "missing-guide.pdf"), includeFile: true }],
    })).rejects.toThrow("공유할 파일을 찾을 수 없습니다");
    await expect(access(join(root, "releases", "hong", "spring-review", "1.0.0"))).rejects.toThrow();
  });

  it("updates and deletes a project while keeping the registry valid", async () => {
    const { root } = await fixture();
    await initializeTeamStore(root, { name: "backend", displayName: "Backend Team", owner: "hong", ownerDisplayName: "Hong", ownerEmail: "hong@example.com" });
    await createProject(root, { name: "web-app", displayName: "Web App", tags: ["react"], verificationCommands: [], repository: "https://github.com/example/web-app", createdBy: "hong" });
    await updateProject(root, "web-app", { displayName: "Web Console", tags: ["react", "spring"], repository: "https://github.com/example/web-console" });
    expect((await loadTeamSnapshot(root)).projects[0]).toMatchObject({ spec: { displayName: "Web Console", tags: ["react", "spring"], repository: "https://github.com/example/web-console" } });
    await deleteProject(root, "web-app");
    await expect(loadTeamSnapshot(root)).resolves.toMatchObject({ projects: [], skillsets: [] });
  });
});
