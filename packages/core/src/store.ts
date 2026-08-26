import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import {
  API_VERSION,
  DocumentValidationError,
  validateDocument,
  type EvidenceDocument,
  type MemberDocument,
  type ProjectDocument,
  type ReviewDocument,
  type SkillDocument,
  type SkillSetDocument,
  type TeamDocument,
  type Visibility,
} from "@skillspace/schemas";
import { parse, stringify } from "yaml";
import { assertSlug, createEventId } from "./ids.js";
import { parseSkillDirectory, validateSkillPackage } from "./skill.js";

const DATA_DIRECTORIES = [
  "members",
  "skills",
  "releases",
  "reviews",
  "evidence",
  "projects",
  "schemas",
];

function within(root: string, ...segments: string[]): string {
  const rootPath = resolve(root);
  const result = resolve(rootPath, ...segments);
  const prefix = rootPath.endsWith(sep) ? rootPath : `${rootPath}${sep}`;
  if (result !== rootPath && !result.startsWith(prefix)) {
    throw new Error(`Path escapes repository root: ${relative(rootPath, result)}`);
  }
  return result;
}

async function writeYaml(path: string, document: unknown): Promise<void> {
  try {
    validateDocument(document);
  } catch (error) {
    throw registryDataError(path, error, "저장할 문서가 SkillRoster 형식과 맞지 않습니다");
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify(document, { lineWidth: 100 }), "utf8");
}

export class RegistryDataError extends Error {
  readonly code = "REGISTRY_DATA_INVALID";
  constructor(message: string, public readonly documentPath: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RegistryDataError";
  }
}

function validationDetails(error: unknown): string {
  if (!(error instanceof DocumentValidationError) || !error.errors.length) return error instanceof Error ? error.message : String(error);
  return error.errors.slice(0, 3).map((item) => `${item.instancePath || "/"} ${item.message ?? "형식 오류"}`).join(", ");
}

function registryDataError(path: string, error: unknown, summary: string): RegistryDataError {
  return new RegistryDataError(`${summary}: ${path} (${validationDetails(error)})`, path, { cause: error });
}

async function readYaml<T>(path: string, expectedKind?: string): Promise<T> {
  let value: unknown;
  try {
    value = parse(await readFile(path, "utf8"));
  } catch (error) {
    throw registryDataError(path, error, "YAML 문서를 읽을 수 없습니다");
  }
  try {
    validateDocument(value);
  } catch (error) {
    throw registryDataError(path, error, "팀 Git 문서 형식이 올바르지 않습니다");
  }
  if (expectedKind && value.kind !== expectedKind) {
    throw new RegistryDataError(`문서 종류가 올바르지 않습니다: ${path} (${value.kind} 대신 ${expectedKind} 필요)`, path);
  }
  return value as T;
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

export interface InitializeTeamInput {
  name: string;
  displayName: string;
  owner: string;
  ownerDisplayName: string;
  ownerEmail: string;
  defaultBranch?: string;
  now?: Date;
}

export async function initializeTeamStore(root: string, input: InitializeTeamInput): Promise<void> {
  const name = assertSlug(input.name, "team name");
  const owner = assertSlug(input.owner, "owner");
  const now = (input.now ?? new Date()).toISOString();
  await mkdir(root, { recursive: true });
  for (const directory of DATA_DIRECTORIES) {
    await mkdir(within(root, directory), { recursive: true });
    await writeFile(within(root, directory, ".gitkeep"), "", { flag: "a" });
  }

  const team: TeamDocument = {
    apiVersion: API_VERSION,
    kind: "Team",
    metadata: { name },
    spec: {
      displayName: input.displayName,
      defaultBranch: input.defaultBranch ?? "main",
      owners: [owner],
      createdAt: now,
    },
  };
  const member: MemberDocument = {
    apiVersion: API_VERSION,
    kind: "Member",
    metadata: { name: owner },
    spec: {
      displayName: input.ownerDisplayName,
      email: input.ownerEmail,
      role: "owner",
      joinedAt: now,
    },
  };
  await writeYaml(within(root, "skillspace.yaml"), team);
  await writeYaml(within(root, "members", `${owner}.yaml`), member);
}

export async function addMember(
  root: string,
  input: { name: string; displayName: string; email: string; now?: Date },
): Promise<MemberDocument> {
  const name = assertSlug(input.name, "member name");
  const member: MemberDocument = {
    apiVersion: API_VERSION,
    kind: "Member",
    metadata: { name },
    spec: {
      displayName: input.displayName,
      email: input.email,
      role: "member",
      joinedAt: (input.now ?? new Date()).toISOString(),
    },
  };
  await writeYaml(within(root, "members", `${name}.yaml`), member);
  return member;
}

export async function updateMember(
  root: string,
  name: string,
  input: { displayName: string; email: string },
): Promise<MemberDocument> {
  const memberName = assertSlug(name, "member name");
  const path = within(root, "members", `${memberName}.yaml`);
  const member = await readYaml<MemberDocument>(path, "Member");
  member.spec.displayName = input.displayName.trim();
  member.spec.email = input.email.trim();
  await writeYaml(path, member);
  return member;
}

export async function publishSkill(
  root: string,
  input: {
    sourceDirectory: string;
    owner: string;
    version: string;
    visibility?: Visibility;
    tags?: string[];
    now?: Date;
  },
): Promise<SkillDocument> {
  const owner = assertSlug(input.owner, "owner");
  await validateSkillPackage(input.sourceDirectory);
  const parsed = await parseSkillDirectory(input.sourceDirectory);
  const target = within(root, "skills", owner, parsed.name);
  const releaseTarget = within(root, "releases", owner, parsed.name, input.version);
  const releaseExists = await readdir(releaseTarget).then(
    () => true,
    () => false,
  );
  if (releaseExists) {
    throw new Error(`Skill release already exists: ${owner}/${parsed.name}@${input.version}`);
  }
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await mkdir(releaseTarget, { recursive: true });
  await cp(input.sourceDirectory, target, {
    recursive: true,
    filter: (source) => !/[\\/](?:\.git|node_modules)(?:[\\/]|$)/.test(source),
  });
  await cp(input.sourceDirectory, releaseTarget, {
    recursive: true,
    filter: (source) => !/[\\/](?:\.git|node_modules)(?:[\\/]|$)/.test(source),
  });

  const document: SkillDocument = {
    apiVersion: API_VERSION,
    kind: "Skill",
    metadata: { name: parsed.name },
    spec: {
      owner,
      version: input.version,
      description: parsed.description,
      visibility: input.visibility ?? "team",
      tags: [...new Set((input.tags ?? []).map((tag) => assertSlug(tag, "tag")))].sort(),
      compatibility: parsed.compatibility,
      publishedAt: (input.now ?? new Date()).toISOString(),
    },
  };
  await writeYaml(join(target, "skill.yaml"), document);
  return document;
}

export async function writeReview(
  root: string,
  input: {
    skill: string;
    version: string;
    reviewer: string;
    score: number;
    comment: string;
    project?: string;
    now?: Date;
  },
): Promise<ReviewDocument> {
  const [owner, skillName, extra] = input.skill.split("/");
  if (!owner || !skillName || extra) throw new Error("skill must use owner/name format");
  assertSlug(owner, "skill owner");
  assertSlug(skillName, "skill name");
  const reviewer = assertSlug(input.reviewer, "reviewer");
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    throw new Error("score must be an integer from 1 to 5");
  }
  const now = input.now ?? new Date();
  const document: ReviewDocument = {
    apiVersion: API_VERSION,
    kind: "Review",
    metadata: { name: `${reviewer}-${input.version}` },
    spec: {
      skill: input.skill,
      version: input.version,
      reviewer,
      ...(input.project ? { project: assertSlug(input.project, "project") } : {}),
      score: input.score,
      comment: input.comment,
      createdAt: now.toISOString(),
    },
  };
  await writeYaml(
    within(root, "reviews", owner, skillName, input.version, `${reviewer}.yaml`),
    document,
  );
  return document;
}

export async function createProject(
  root: string,
  input: {
    name: string;
    displayName: string;
    tags: string[];
    verificationCommands: string[];
    createdBy: string;
    now?: Date;
  },
): Promise<ProjectDocument> {
  const name = assertSlug(input.name, "project name");
  const projectPath = within(root, "projects", name, "project.yaml");
  if (await access(projectPath).then(() => true, () => false)) {
    throw new Error(`이미 등록된 프로젝트입니다: ${name}`);
  }
  const now = (input.now ?? new Date()).toISOString();
  const document: ProjectDocument = {
    apiVersion: API_VERSION,
    kind: "Project",
    metadata: { name },
    spec: {
      displayName: input.displayName,
      tags: [...new Set(input.tags.map((tag) => assertSlug(tag, "tag")))].sort(),
      verificationCommands: input.verificationCommands,
      createdBy: assertSlug(input.createdBy, "created by"),
      createdAt: now,
    },
  };
  const skillset: SkillSetDocument = {
    apiVersion: API_VERSION,
    kind: "SkillSet",
    metadata: { name: `${name}-skills` },
    spec: { project: name, skills: [], updatedAt: now },
  };
  await writeYaml(projectPath, document);
  await writeYaml(within(root, "projects", name, "skillset.yaml"), skillset);
  return document;
}

export async function updateProject(
  root: string,
  name: string,
  input: { displayName: string; tags: string[] },
): Promise<ProjectDocument> {
  const project = assertSlug(name, "project");
  const path = within(root, "projects", project, "project.yaml");
  const document = await readYaml<ProjectDocument>(path, "Project");
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("프로젝트 이름이 필요합니다.");
  document.spec.displayName = displayName;
  document.spec.tags = [...new Set(input.tags.map((tag) => assertSlug(tag, "tag")))].sort();
  await writeYaml(path, document);
  return document;
}

export async function deleteProject(root: string, name: string): Promise<void> {
  const project = assertSlug(name, "project");
  const snapshot = await loadTeamSnapshot(root);
  if (!snapshot.projects.some((item) => item.metadata.name === project)) {
    throw new Error(`프로젝트를 찾을 수 없습니다: ${project}`);
  }
  if (snapshot.reviews.some((review) => review.spec.project === project) || snapshot.evidence.some((item) => item.spec.project === project)) {
    throw new Error("평가 또는 사용 기록이 있는 프로젝트는 삭제할 수 없습니다. Git 이력을 보존하려면 연결만 해제해주세요.");
  }
  await rm(within(root, "projects", project), { recursive: true, force: true });
}

export async function addProjectSkill(
  root: string,
  project: string,
  skill: string,
  version: string,
  now = new Date(),
): Promise<SkillSetDocument> {
  assertSlug(project, "project");
  const path = within(root, "projects", project, "skillset.yaml");
  const document = await readYaml<SkillSetDocument>(path);
  const existing = document.spec.skills.find((item) => item.skill === skill);
  if (existing) existing.version = version;
  else document.spec.skills.push({ skill, version });
  document.spec.skills.sort((a, b) => a.skill.localeCompare(b.skill));
  document.spec.updatedAt = now.toISOString();
  await writeYaml(path, document);
  return document;
}

export async function removeProjectSkill(
  root: string,
  project: string,
  skill: string,
  now = new Date(),
): Promise<SkillSetDocument> {
  assertSlug(project, "project");
  const path = within(root, "projects", project, "skillset.yaml");
  const document = await readYaml<SkillSetDocument>(path);
  document.spec.skills = document.spec.skills.filter((item) => item.skill !== skill);
  document.spec.updatedAt = now.toISOString();
  await writeYaml(path, document);
  return document;
}

export async function writeEvidence(root: string, document: EvidenceDocument): Promise<void> {
  const date = new Date(document.spec.createdAt);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  await writeYaml(within(root, "evidence", year, month, `${document.metadata.name}.yaml`), document);
}

export function createEvidence(input: Omit<EvidenceDocument["spec"], "privacy">): EvidenceDocument {
  return {
    apiVersion: API_VERSION,
    kind: "Evidence",
    metadata: { name: createEventId("evidence") },
    spec: {
      ...input,
      privacy: { promptStored: false, sourceStored: false },
    },
  };
}

export interface TeamSnapshot {
  team: TeamDocument;
  members: MemberDocument[];
  skills: Array<{ id: string; document: SkillDocument; path: string }>;
  reviews: ReviewDocument[];
  projects: ProjectDocument[];
  skillsets: SkillSetDocument[];
  evidence: EvidenceDocument[];
}

interface DocumentEntry<T> {
  document: T;
  file: string;
  segments: string[];
}

async function readDocumentEntries<T>(
  directory: string,
  kind: string,
  accepts: (segments: string[]) => boolean,
): Promise<Array<DocumentEntry<T>>> {
  const files = (await walk(directory)).filter((path) => /\.ya?ml$/i.test(path));
  const entries: Array<DocumentEntry<T>> = [];
  for (const file of files) {
    const segments = relative(directory, file).split(sep);
    if (!accepts(segments)) continue;
    entries.push({ document: await readYaml<T>(file, kind), file, segments });
  }
  return entries;
}

function assertDocumentLocation(condition: boolean, file: string, message: string): void {
  if (!condition) throw new RegistryDataError(`문서 위치와 내용이 일치하지 않습니다: ${file} (${message})`, file);
}

function assertUniqueIds(values: string[], root: string, label: string): void {
  const duplicate = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicate) throw new RegistryDataError(`중복된 ${label} ID가 있습니다: ${duplicate}`, root);
}

export async function loadTeamSnapshot(root: string): Promise<TeamSnapshot> {
  const team = await readYaml<TeamDocument>(within(root, "skillspace.yaml"), "Team");
  const memberEntries = await readDocumentEntries<MemberDocument>(within(root, "members"), "Member", (segments) => segments.length === 1);
  for (const entry of memberEntries) assertDocumentLocation(basename(entry.file, ".yaml") === entry.document.metadata.name, entry.file, "파일명은 member ID와 같아야 합니다");
  const skillEntries = await readDocumentEntries<SkillDocument>(within(root, "skills"), "Skill", (segments) => segments.length === 3 && segments[2]?.toLowerCase() === "skill.yaml");
  for (const entry of skillEntries) assertDocumentLocation(entry.segments[0] === entry.document.spec.owner && entry.segments[1] === entry.document.metadata.name, entry.file, "skills/<owner>/<name>/skill.yaml 규칙을 확인하세요");
  const reviewEntries = await readDocumentEntries<ReviewDocument>(within(root, "reviews"), "Review", (segments) => segments.length === 4);
  for (const entry of reviewEntries) assertDocumentLocation(entry.segments[0] === entry.document.spec.skill.split("/")[0] && entry.segments[1] === entry.document.spec.skill.split("/")[1] && entry.segments[2] === entry.document.spec.version && basename(entry.file, ".yaml") === entry.document.spec.reviewer, entry.file, "리뷰의 스킬·버전·작성자 경로를 확인하세요");
  const projectEntries = await readDocumentEntries<ProjectDocument>(within(root, "projects"), "Project", (segments) => segments.length === 2 && segments[1]?.toLowerCase() === "project.yaml");
  for (const entry of projectEntries) assertDocumentLocation(entry.segments[0] === entry.document.metadata.name, entry.file, "프로젝트 폴더명은 project ID와 같아야 합니다");
  const skillsetEntries = await readDocumentEntries<SkillSetDocument>(within(root, "projects"), "SkillSet", (segments) => segments.length === 2 && segments[1]?.toLowerCase() === "skillset.yaml");
  for (const entry of skillsetEntries) assertDocumentLocation(entry.segments[0] === entry.document.spec.project, entry.file, "프로젝트 폴더명과 skillset project가 같아야 합니다");
  const evidenceEntries = await readDocumentEntries<EvidenceDocument>(within(root, "evidence"), "Evidence", (segments) => segments.length === 3);
  const members = memberEntries.map((entry) => entry.document);
  const skills = skillEntries.map(({ document }) => ({
    id: `${document.spec.owner}/${document.metadata.name}`,
    document,
    path: within(root, "skills", document.spec.owner, document.metadata.name),
  }));
  const reviews = reviewEntries.map((entry) => entry.document);
  const projects = projectEntries.map((entry) => entry.document);
  const skillsets = skillsetEntries.map((entry) => entry.document);
  const evidence = evidenceEntries.map((entry) => entry.document);
  const memberIds = new Set(members.map((document) => document.metadata.name));
  const skillIds = new Set(skills.map((skill) => skill.id));
  const projectIds = new Set(projects.map((document) => document.metadata.name));
  assertUniqueIds([...members.map((document) => document.metadata.name)], root, "팀원");
  assertUniqueIds([...skills.map((skill) => skill.id)], root, "스킬");
  assertUniqueIds([...projects.map((document) => document.metadata.name)], root, "프로젝트");
  for (const owner of team.spec.owners) assertDocumentLocation(memberIds.has(owner), within(root, "skillspace.yaml"), `관리자 ${owner}가 팀원 목록에 없습니다`);
  for (const skill of skills) assertDocumentLocation(memberIds.has(skill.document.spec.owner), skill.path, `작성자 ${skill.document.spec.owner}가 팀원 목록에 없습니다`);
  for (const review of reviews) {
    assertDocumentLocation(skillIds.has(review.spec.skill), within(root, "reviews"), `평가 대상 ${review.spec.skill}이 없습니다`);
    assertDocumentLocation(memberIds.has(review.spec.reviewer), within(root, "reviews"), `평가자 ${review.spec.reviewer}가 팀원 목록에 없습니다`);
    if (review.spec.project) assertDocumentLocation(projectIds.has(review.spec.project), within(root, "reviews"), `평가 프로젝트 ${review.spec.project}가 없습니다`);
  }
  for (const project of projects) assertDocumentLocation(memberIds.has(project.spec.createdBy), within(root, "projects", project.metadata.name, "project.yaml"), `생성자 ${project.spec.createdBy}가 팀원 목록에 없습니다`);
  for (const project of projects) assertDocumentLocation(skillsets.filter((set) => set.spec.project === project.metadata.name).length === 1, within(root, "projects", project.metadata.name), "프로젝트마다 skillset.yaml이 하나 필요합니다");
  for (const skillset of skillsets) {
    assertDocumentLocation(projectIds.has(skillset.spec.project), within(root, "projects", skillset.spec.project, "skillset.yaml"), `프로젝트 ${skillset.spec.project}가 없습니다`);
    for (const reference of skillset.spec.skills) {
      assertDocumentLocation(skillIds.has(reference.skill), within(root, "projects", skillset.spec.project, "skillset.yaml"), `연결된 스킬 ${reference.skill}이 없습니다`);
      const [owner, name] = reference.skill.split("/");
      const release = within(root, "releases", owner!, name!, reference.version);
      assertDocumentLocation(await access(release).then(() => true, () => false), within(root, "projects", skillset.spec.project, "skillset.yaml"), `스킬 릴리스 ${reference.skill}@${reference.version}가 없습니다`);
    }
  }
  for (const item of evidence) {
    assertDocumentLocation(skillIds.has(item.spec.skill), within(root, "evidence"), `사용 기록의 스킬 ${item.spec.skill}이 없습니다`);
    assertDocumentLocation(memberIds.has(item.spec.member), within(root, "evidence"), `사용 기록의 팀원 ${item.spec.member}가 없습니다`);
    assertDocumentLocation(projectIds.has(item.spec.project), within(root, "evidence"), `사용 기록의 프로젝트 ${item.spec.project}가 없습니다`);
  }
  return {
    team,
    members: members.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name)),
    skills: skills.sort((a, b) => a.id.localeCompare(b.id)),
    reviews,
    projects,
    skillsets,
    evidence,
  };
}

export interface InstalledProjectSkill {
  name: string;
  skill: string;
  version: string;
}

export async function installProjectSkills(
  registryRoot: string,
  project: string,
  projectRoot: string,
): Promise<InstalledProjectSkill[]> {
  assertSlug(project, "project");
  const skillset = await readYaml<SkillSetDocument>(
    within(registryRoot, "projects", project, "skillset.yaml"),
  );
  const installed: InstalledProjectSkill[] = [];
  for (const reference of skillset.spec.skills) {
    const [owner, name, extra] = reference.skill.split("/");
    if (!owner || !name || extra) throw new Error(`Invalid skill reference: ${reference.skill}`);
    assertSlug(owner, "skill owner");
    assertSlug(name, "skill name");
    const source = within(registryRoot, "releases", owner, name, reference.version);
    const target = within(projectRoot, ".opencode", "skills", name);
    await rm(target, { recursive: true, force: true });
    await mkdir(target, { recursive: true });
    await cp(source, target, { recursive: true });
    installed.push({ name, skill: reference.skill, version: reference.version });
  }
  return installed;
}
