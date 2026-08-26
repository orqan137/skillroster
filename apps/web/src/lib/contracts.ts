import type { RankedSkill, RecommendedSkill, TeamSnapshot } from "@skillspace/core";
import type { EvidenceDocument, ProjectDocument, ReviewDocument } from "@skillspace/schemas";

export interface DashboardPayload {
  revision: string;
  snapshot: TeamSnapshot;
  ranked: RankedSkill[];
  member: string;
  localSkills?: LocalSkillScanPayload;
}

export interface SkillPayload extends DashboardPayload {
  skill: TeamSnapshot["skills"][number];
  markdown: string;
  reviews: ReviewDocument[];
  evidence: EvidenceDocument[];
  ranking: RankedSkill | undefined;
}

export interface ProjectPayload {
  project: ProjectDocument;
  recommendations: RecommendedSkill[];
  selected: Array<{ skill: string; version: string }>;
  dashboard: DashboardPayload;
}

export interface SetupStatusPayload {
  configured: boolean;
  connection: {
    team: string;
    directory: string;
    member: string;
    remote?: string;
    source: "environment" | "local-config";
  } | null;
  configPath: string;
  defaultTeamDirectory: string;
  gitIdentity: { name: string; email: string };
  memberProfile: {
    id: string;
    displayName: string;
    email: string;
    role: "owner" | "maintainer" | "member";
  } | null;
  localSources: { completed: boolean; sources: string[] };
}

export interface LocalSkillSourceSummary {
  agent: "codex" | "opencode" | "claude" | "agents" | "custom";
  label: string;
  path: string;
  exists: boolean;
  connected: boolean;
  skillCount: number;
}

export interface LocalSkillSummary {
  name: string;
  description: string;
  path: string;
  sourcePath: string;
  agent: LocalSkillSourceSummary["agent"];
}

export interface LocalSkillScanPayload {
  sources: LocalSkillSourceSummary[];
  skills: LocalSkillSummary[];
  scannedAt: string;
}

export interface TeamsPayload {
  activeTeam: string | null;
  switchable: boolean;
  teams: Array<{
    team: string;
    displayName: string;
    member: string;
    directory: string;
    remote?: string;
    active: boolean;
  }>;
}
