import type { EvidenceStatus, Visibility } from "@skillspace/schemas";

const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  used: "사용 기록",
  verified: "실행 성공",
  failed: "실행 실패",
  "co-used": "함께 사용됨",
};

const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: "비공개",
  team: "팀 공유",
  verified: "팀 승인",
  deprecated: "지원 종료",
};

export function evidenceStatusLabel(status: EvidenceStatus): string {
  return EVIDENCE_LABELS[status];
}

export function visibilityLabel(visibility: Visibility): string {
  return VISIBILITY_LABELS[visibility];
}
