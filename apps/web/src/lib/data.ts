import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { rankSkills, recommendSkills, type RankedSkill } from "@skillspace/core";
import { GitTeamRepository } from "@skillspace/git";
import type { ProjectDocument } from "@skillspace/schemas";
import { runtimeConnection } from "./local-config.js";
import { stripSkillFrontmatter } from "./skill-markdown.js";

export async function registryPath(): Promise<string> {
  const connection = await runtimeConnection();
  if (!connection) throw new Error("팀 설정이 필요합니다.");
  return connection.directory;
}

export async function activeMember(): Promise<string> {
  const connection = await runtimeConnection();
  if (!connection) throw new Error("팀 설정이 필요합니다.");
  return connection.member;
}

export async function repository(): Promise<GitTeamRepository> {
  return GitTeamRepository.open(await registryPath());
}

export async function dashboardData(): Promise<{
  revision: string;
  snapshot: Awaited<ReturnType<GitTeamRepository["snapshot"]>>;
  ranked: RankedSkill[];
}> {
  const repo = await repository();
  // Read the local clone immediately. Remote synchronization is explicit in
  // Settings; write transactions still pull before committing.
  const { snapshot, revision } = await repo.state(false);
  return {
    revision,
    ranked: rankSkills(
      snapshot.skills,
      snapshot.reviews,
      snapshot.evidence,
      snapshot.skillsets,
    ),
    snapshot,
  };
}

export async function skillData(owner: string, name: string) {
  const data = await dashboardData();
  const id = `${owner}/${name}`;
  const skill = data.snapshot.skills.find((item) => item.id === id);
  if (!skill) return null;
  return {
    ...data,
    skill,
    markdown: stripSkillFrontmatter(await readFile(join(skill.path, "SKILL.md"), "utf8")),
    reviews: data.snapshot.reviews
      .filter(
        (review) =>
          review.spec.skill === id && review.spec.version === skill.document.spec.version,
      )
      .sort((a, b) => b.spec.createdAt.localeCompare(a.spec.createdAt)),
    evidence: data.snapshot.evidence
      .filter(
        (item) => item.spec.skill === id && item.spec.version === skill.document.spec.version,
      )
      .sort((a, b) => b.spec.createdAt.localeCompare(a.spec.createdAt)),
    ranking: data.ranked.find((item) => item.skill === id),
  };
}

export async function projectData(name: string): Promise<{
  project: ProjectDocument;
  recommendations: ReturnType<typeof recommendSkills>;
  selected: Array<{ skill: string; version: string }>;
  dashboard: Awaited<ReturnType<typeof dashboardData>>;
} | null> {
  const data = await dashboardData();
  const project = data.snapshot.projects.find((item) => item.metadata.name === name);
  if (!project) return null;
  const skillset = data.snapshot.skillsets.find((item) => item.spec.project === name);
  return {
    project,
    recommendations: recommendSkills(project, data.ranked),
    selected: skillset?.spec.skills ?? [],
    dashboard: data,
  };
}
