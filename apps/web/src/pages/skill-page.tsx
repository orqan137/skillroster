import { ArrowLeft, CheckCircle2, GitCommitHorizontal, Star, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { PageState } from "@/components/page-state";
import { ReviewForm } from "@/components/review-form";
import { useApi } from "@/lib/client";
import type { SkillPayload } from "@/lib/contracts";
import { evidenceStatusLabel, visibilityLabel } from "@/lib/labels";

export function SkillPage() {
  const { owner = "", name = "" } = useParams();
  const endpoint = `/api/skills/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const { data, error, requestId, loading, reload } = useApi<SkillPayload>(endpoint);
  if (loading) return <PageState message="스킬 정보 불러오는 중" />;
  if (error || !data) return <PageState message={error ?? "스킬 불러오기 실패"} requestId={requestId} onRetry={() => void reload()} />;

  return (
    <AppShell member={data.member} teamName={data.snapshot.team.spec.displayName}>
      <Link className="back-link" to="/"><ArrowLeft size={16} />랭킹으로 돌아가기</Link>
      <header className="detail-header">
        <div>
          <div className="tag-row"><span className="pill verified">{visibilityLabel(data.skill.document.spec.visibility)}</span>{data.skill.document.spec.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          <h1>{data.skill.document.metadata.name}</h1><p>{data.skill.document.spec.description}</p><span className="muted">@{owner} · v{data.skill.document.spec.version}</span>
        </div>
        <div className="skill-score-stat"><span>평가 점수</span><strong>{data.ranking?.score ?? 0}</strong><small><Star size={14} fill="currentColor" /> {data.ranking?.averageRating?.toFixed(1) ?? "평가 없음"} · 동료 {data.ranking?.peerReviewCount ?? 0} · 작성자 {data.ranking?.selfReviewCount ?? 0} · 프로젝트 {data.ranking?.adoptedProjects ?? 0}</small></div>
      </header>
      <nav className="detail-tabs" aria-label="스킬 상세 메뉴"><a href="#instructions">사용법</a><a href="#signals">평가하기</a><a href="#reviews">스킬 후기</a></nav>
      <div className="detail-grid">
        <article className="data-section markdown-body" id="instructions"><ReactMarkdown>{data.markdown}</ReactMarkdown></article>
        <aside className="detail-aside" id="signals">
          <section className="panel compact"><span className="eyebrow">스킬 평가</span><h2>이 버전 평가하기</h2><ReviewForm skill={`${owner}/${name}`} version={data.skill.document.spec.version} projects={data.snapshot.projects.map((item) => ({ name: item.metadata.name, displayName: item.spec.displayName }))} onSaved={() => void reload()} /></section>
          <section className="panel compact"><span className="eyebrow">프로젝트 사용 기록</span><h2>최근 적용 내역</h2><div className="evidence-list">{data.evidence.length === 0 && <p className="muted">프로젝트 사용 기록 없음</p>}{data.evidence.slice(0, 6).map((item) => <article key={item.metadata.name}>{item.spec.status === "verified" ? <CheckCircle2 className="good" size={18} /> : <XCircle className="bad" size={18} />}<div><strong>{item.spec.project}</strong><span>@{item.spec.member} · {evidenceStatusLabel(item.spec.status)}</span></div>{item.spec.acceptedCommit && <GitCommitHorizontal size={16} />}</article>)}</div></section>
        </aside>
      </div>
      <section className="data-section reviews" id="reviews"><div className="panel-heading"><div><span className="eyebrow">스킬 후기</span><h2>v{data.skill.document.spec.version} 평가</h2></div></div>{data.reviews.length === 0 && <div className="empty-state">작성된 후기 없음</div>}{data.reviews.map((review) => <blockquote key={review.metadata.name}><div className="stars read-only">{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} fill={value <= review.spec.score ? "currentColor" : "none"} />)}</div><p>{review.spec.comment}</p><footer>@{review.spec.reviewer}{review.spec.reviewer === owner ? " · 작성자 평가" : ""}{review.spec.project ? ` · ${review.spec.project}` : ""}</footer></blockquote>)}</section>
    </AppShell>
  );
}
