import { MessageSquareText, Shapes, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageMotif } from "@/components/page-motif";
import { PageState } from "@/components/page-state";
import { useApi } from "@/lib/client";
import type { DashboardPayload } from "@/lib/contracts";

const roleLabel = { owner: "관리자", maintainer: "운영자", member: "팀원" } as const;

export function MembersPage() {
  const { data, error, requestId, loading, reload } = useApi<DashboardPayload>("/api/dashboard", 10_000);
  if (loading) return <PageState message="팀원 불러오는 중" />;
  if (error || !data) return <PageState message={error ?? "팀원 불러오기 실패"} requestId={requestId} onRetry={() => void reload()} />;
  const { snapshot, member } = data;

  return <AppShell member={member} teamName={snapshot.team.spec.displayName}>
    <header className="page-header directory-header"><div><span className="eyebrow">Members</span><h1>팀원</h1><p>팀원별 공유 스킬, 후기와 프로젝트 참여 내역 확인</p></div><PageMotif /></header>
    <section className="directory-stats" aria-label="팀원 통계">
      <article><Users size={20} /><span>팀원</span><strong>{snapshot.members.length}</strong></article>
      <article><Sparkles size={20} /><span>발행된 스킬</span><strong>{snapshot.skills.length}</strong></article>
      <article><MessageSquareText size={20} /><span>작성된 후기</span><strong>{snapshot.reviews.length}</strong></article>
    </section>
    <section className="data-section member-directory">
      <div className="panel-heading"><div><span className="eyebrow">구성원</span><h2>팀원별 활동</h2></div></div>
      {snapshot.members.map((item, index) => {
        const id = item.metadata.name;
        const owned = snapshot.skills.filter((skill) => skill.document.spec.owner === id).length;
        const reviews = snapshot.reviews.filter((review) => review.spec.reviewer === id).length;
        const projects = snapshot.projects.filter((project) => project.spec.createdBy === id).length;
        return <article className="member-directory-row" key={id}>
          <span className={`member-shape shape-${index % 3}`}>{item.spec.displayName.slice(0, 1)}</span>
          <div className="member-identity"><strong>{item.spec.displayName}{id === member && <small>나</small>}</strong><span>@{id} · {roleLabel[item.spec.role]}</span></div>
          <div className="member-metrics"><span><b>{owned}</b>발행 스킬</span><span><b>{reviews}</b>작성 후기</span><span><b>{projects}</b>등록 프로젝트</span></div>
          <Shapes size={18} />
        </article>;
      })}
    </section>
  </AppShell>;
}
