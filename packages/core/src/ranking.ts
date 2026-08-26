import type {
  EvidenceDocument,
  ProjectDocument,
  ReviewDocument,
  SkillDocument,
  SkillSetDocument,
} from "@skillspace/schemas";

export interface RankedSkill {
  skill: string;
  version: string;
  owner: string;
  description: string;
  tags: string[];
  reviewCount: number;
  peerReviewCount: number;
  selfReviewCount: number;
  averageRating: number | null;
  bayesianRating: number;
  verifiedRuns: number;
  failedRuns: number;
  adoptedProjects: number;
  lastActivityAt: string | null;
  score: number;
}

export interface SkillEntry {
  id: string;
  document: SkillDocument;
}

export function rankSkills(
  skills: SkillEntry[],
  reviews: ReviewDocument[],
  evidence: EvidenceDocument[],
  skillsets: SkillSetDocument[],
  now = new Date(),
): RankedSkill[] {
  const selfReviewWeight = 0.35;
  const owners = new Map(skills.map((skill) => [skill.id, skill.document.spec.owner]));
  const globalRatings = reviews
    .filter((review) => review.spec.reviewer !== owners.get(review.spec.skill))
    .map((review) => ({ score: review.spec.score, weight: 1 }));
  const globalWeight = globalRatings.reduce((sum, rating) => sum + rating.weight, 0);
  const priorMean = globalWeight
    ? globalRatings.reduce((sum, rating) => sum + rating.score * rating.weight, 0) / globalWeight
    : 3.5;
  const priorWeight = 3;

  return skills
    .filter(({ document }) => document.spec.visibility !== "private")
    .map(({ id, document }) => {
      const version = document.spec.version;
      const matchingReviews = reviews.filter(
        (review) => review.spec.skill === id && review.spec.version === version,
      );
      const selfReviewCount = matchingReviews.filter((review) => review.spec.reviewer === document.spec.owner).length;
      const peerReviewCount = matchingReviews.length - selfReviewCount;
      const weightedRatings = matchingReviews.map((review) => ({ score: review.spec.score, weight: review.spec.reviewer === document.spec.owner ? selfReviewWeight : 1 }));
      const ratingWeight = weightedRatings.reduce((sum, rating) => sum + rating.weight, 0);
      const ratingSum = weightedRatings.reduce((sum, rating) => sum + rating.score * rating.weight, 0);
      const averageRating = ratingWeight ? ratingSum / ratingWeight : null;
      const bayesianRating =
        (priorMean * priorWeight + ratingSum) / (priorWeight + ratingWeight);

      const matchingEvidence = evidence.filter(
        (item) => item.spec.skill === id && item.spec.version === version,
      );
      const verifiedRuns = matchingEvidence.filter((item) => item.spec.status === "verified").length;
      const failedRuns = matchingEvidence.filter((item) => item.spec.status === "failed").length;
      const recordedRuns = verifiedRuns + failedRuns;
      const evidenceScore = recordedRuns ? 5 * (verifiedRuns / recordedRuns) : 0;

      const adoptedProjects = new Set(
        skillsets
          .filter((set) => set.spec.skills.some((item) => item.skill === id && item.version === version))
          .map((set) => set.spec.project),
      ).size;

      const activityDates = [
        ...matchingReviews.map((review) => review.spec.createdAt),
        ...matchingEvidence.map((item) => item.spec.createdAt),
        document.spec.publishedAt,
      ].sort();
      const lastActivityAt = activityDates.at(-1) ?? null;
      const ageDays = lastActivityAt
        ? Math.max(0, (now.getTime() - new Date(lastActivityAt).getTime()) / 86_400_000)
        : 365;
      const freshnessScore = Math.max(0, 5 * (1 - ageDays / 365));
      const adoptionBoost = Math.min(5, adoptedProjects);
      const score =
        (bayesianRating / 5) * 65 +
        (evidenceScore / 5) * 20 +
        (freshnessScore / 5) * 10 +
        adoptionBoost;

      return {
        skill: id,
        version,
        owner: document.spec.owner,
        description: document.spec.description,
        tags: document.spec.tags,
        reviewCount: matchingReviews.length,
        peerReviewCount,
        selfReviewCount,
        averageRating,
        bayesianRating,
        verifiedRuns,
        failedRuns,
        adoptedProjects,
        lastActivityAt,
        score: Math.round(score * 10) / 10,
      };
    })
    .sort((a, b) => b.score - a.score || a.skill.localeCompare(b.skill));
}

export interface RecommendedSkill extends RankedSkill {
  matchingTags: string[];
  recommendationScore: number;
}

export function recommendSkills(
  project: ProjectDocument,
  rankedSkills: RankedSkill[],
): RecommendedSkill[] {
  const projectTags = new Set(project.spec.tags);
  return rankedSkills
    .map((skill) => {
      const matchingTags = skill.tags.filter((tag) => projectTags.has(tag));
      return {
        ...skill,
        matchingTags,
        recommendationScore: Math.round((skill.score + matchingTags.length * 8) * 10) / 10,
      };
    })
    .sort(
      (a, b) =>
        b.recommendationScore - a.recommendationScore || a.skill.localeCompare(b.skill),
    );
}
