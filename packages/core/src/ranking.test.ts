import { describe, expect, it } from "vitest";
import type { ReviewDocument, SkillDocument } from "@skillspace/schemas";
import { rankSkills } from "./ranking.js";

const publishedAt = "2026-08-26T00:00:00.000Z";

function skill(): SkillDocument {
  return {
    apiVersion: "skillspace.dev/v1alpha1",
    kind: "Skill",
    metadata: { name: "review-agent" },
    spec: {
      owner: "hong",
      version: "1.0.0",
      description: "Review changes",
      visibility: "team",
      tags: ["review"],
      compatibility: ["opencode"],
      publishedAt,
    },
  };
}

describe("rankSkills", () => {
  it("does not let a single self review establish the team-wide prior", () => {
    const review: ReviewDocument = {
      apiVersion: "skillspace.dev/v1alpha1",
      kind: "Review",
      metadata: { name: "hong-1.0.0" },
      spec: {
        skill: "hong/review-agent",
        version: "1.0.0",
        reviewer: "hong",
        score: 5,
        comment: "작성자 평가",
        createdAt: publishedAt,
      },
    };

    const [ranked] = rankSkills(
      [{ id: "hong/review-agent", document: skill() }],
      [review],
      [],
      [],
      new Date(publishedAt),
    );

    expect(ranked).toMatchObject({ peerReviewCount: 0, selfReviewCount: 1 });
    expect(ranked?.score).toBeLessThan(65);
  });
});
