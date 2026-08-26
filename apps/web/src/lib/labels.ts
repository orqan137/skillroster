import type { EvidenceStatus, Visibility } from "@skillspace/schemas";

const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  used: "사용됨",
  verified: "평가 완료",
  failed: "확인 필요",
  "co-used": "함께 사용",
};

const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: "비공개",
  team: "팀 공유",
  verified: "평가 완료",
  deprecated: "지원 종료",
};

export function evidenceStatusLabel(status: EvidenceStatus): string {
  return EVIDENCE_LABELS[status];
}

export function visibilityLabel(visibility: Visibility): string {
  return VISIBILITY_LABELS[visibility];
}
