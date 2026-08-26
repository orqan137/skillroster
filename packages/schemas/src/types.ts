export const API_VERSION = "skillspace.dev/v1alpha1" as const;

export type Visibility = "private" | "team" | "verified" | "deprecated";
export type MemberRole = "owner" | "maintainer" | "member";
export type EvidenceStatus = "used" | "verified" | "failed" | "co-used";

export interface Metadata {
  name: string;
}

export interface TeamDocument {
  apiVersion: typeof API_VERSION;
  kind: "Team";
  metadata: Metadata;
  spec: {
    displayName: string;
    defaultBranch: string;
    owners: string[];
    createdAt: string;
  };
}

export interface MemberDocument {
  apiVersion: typeof API_VERSION;
  kind: "Member";
  metadata: Metadata;
  spec: {
    displayName: string;
    email: string;
    role: MemberRole;
    joinedAt: string;
  };
}

export interface SkillDocument {
  apiVersion: typeof API_VERSION;
  kind: "Skill";
  metadata: Metadata;
  spec: {
    owner: string;
    version: string;
    description: string;
    visibility: Visibility;
    tags: string[];
    compatibility: string[];
    references?: Array<{
      label?: string;
      location: string;
      included?: boolean;
    }>;
    publishedAt: string;
  };
}

export interface ReviewDocument {
  apiVersion: typeof API_VERSION;
  kind: "Review";
  metadata: Metadata;
  spec: {
    skill: string;
    version: string;
    reviewer: string;
    project?: string;
    score: number;
    comment: string;
    createdAt: string;
  };
}

export interface ProjectDocument {
  apiVersion: typeof API_VERSION;
  kind: "Project";
  metadata: Metadata;
  spec: {
    displayName: string;
    tags: string[];
    verificationCommands: string[];
    repository?: string;
    createdBy: string;
    createdAt: string;
  };
}

export interface SkillReference {
  skill: string;
  version: string;
}

export interface SkillSetDocument {
  apiVersion: typeof API_VERSION;
  kind: "SkillSet";
  metadata: Metadata;
  spec: {
    project: string;
    skills: SkillReference[];
    updatedAt: string;
  };
}

export interface EvidenceDocument {
  apiVersion: typeof API_VERSION;
  kind: "Evidence";
  metadata: Metadata;
  spec: {
    skill: string;
    version: string;
    member: string;
    project: string;
    sessionId: string;
    status: EvidenceStatus;
    changedFiles: number;
    verificationCommand?: string;
    verificationPassed?: boolean;
    acceptedCommit?: string;
    coUsedSkills: string[];
    createdAt: string;
    privacy: {
      promptStored: false;
      sourceStored: false;
    };
  };
}

export type SkillSpaceDocument =
  | TeamDocument
  | MemberDocument
  | SkillDocument
  | ReviewDocument
  | ProjectDocument
  | SkillSetDocument
  | EvidenceDocument;
