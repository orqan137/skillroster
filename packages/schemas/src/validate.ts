import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import evidenceSchema from "../schemas/evidence.schema.json" with { type: "json" };
import memberSchema from "../schemas/member.schema.json" with { type: "json" };
import projectSchema from "../schemas/project.schema.json" with { type: "json" };
import reviewSchema from "../schemas/review.schema.json" with { type: "json" };
import skillSchema from "../schemas/skill.schema.json" with { type: "json" };
import skillsetSchema from "../schemas/skillset.schema.json" with { type: "json" };
import teamSchema from "../schemas/team.schema.json" with { type: "json" };
import type { SkillSpaceDocument } from "./types.js";

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat("date-time", {
  type: "string",
  validate: (value: string) => !Number.isNaN(Date.parse(value)),
});
ajv.addFormat("email", {
  type: "string",
  validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
});

const validators = new Map<string, ValidateFunction>([
  ["Team", ajv.compile(teamSchema)],
  ["Member", ajv.compile(memberSchema)],
  ["Skill", ajv.compile(skillSchema)],
  ["Review", ajv.compile(reviewSchema)],
  ["Project", ajv.compile(projectSchema)],
  ["SkillSet", ajv.compile(skillsetSchema)],
  ["Evidence", ajv.compile(evidenceSchema)],
]);

export const DOCUMENT_SCHEMAS: Readonly<Record<string, object>> = {
  team: teamSchema,
  member: memberSchema,
  skill: skillSchema,
  review: reviewSchema,
  project: projectSchema,
  skillset: skillsetSchema,
  evidence: evidenceSchema,
};

export class DocumentValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ErrorObject[] = [],
  ) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

export function validateDocument(value: unknown): asserts value is SkillSpaceDocument {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    throw new DocumentValidationError("Document must be an object with a kind field");
  }

  const kind = String((value as { kind: unknown }).kind);
  const validator = validators.get(kind);
  if (!validator) {
    throw new DocumentValidationError(`Unsupported document kind: ${kind}`);
  }

  if (!validator(value)) {
    throw new DocumentValidationError(
      `Invalid ${kind} document`,
      validator.errors ? [...validator.errors] : [],
    );
  }
}
