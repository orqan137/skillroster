import { Link } from "react-router-dom";
import { ArrowUpRight, Boxes, FolderKanban, GitCommitHorizontal, HardDrive, MessageSquareText, Star, Users, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageMotif } from "@/components/page-motif";
import { PageState } from "@/components/page-state";
import { ReviewForm } from "@/components/review-form";
import { useApi } from "@/lib/client";
import type { DashboardPayload } from "@/lib/contracts";
import { useState } from "react";
import { useModalBehavior } from "@/lib/use-modal-behavior";

function formatDate(value: string | null): string {
  if (!value) return "활동 없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

export function DashboardPage() {
  const { data, error, requestId, loading, reload } = useApi<DashboardPayload>("/api/dashboard", 10_000);
  const [reviewing, setReviewing] = useState<DashboardPayload["ranked"][number] | null>(null);
  useModalBehavior(() => setReviewing(null), Boolean(reviewing));
  if (loading) return <PageState message="로스터 불러오는 중" />;
  if (error || !data) return <PageState message={error ?? "개요 불러오기 실패"} requestId={requestId} onRetry={() => void reload()} />;

  const { snapshot, ranked, revision, member } = data;
  const localSkills = data.localSkills;
  const recentReviews = [...snapshot.reviews]
    .sort((a, b) => b.spec.createdAt.localeCompare(a.spec.createdAt))
    .slice(0, 6);
  const projectsForSkill = (skill: string) => snapshot.skillsets.filter((set) => set.spec.skills.some((item) => item.skill === skill)).map((set) => set.spec.project);

  return (
    <AppShell member={member} teamName={snapshot.team.spec.displayName}>
      <header className="page-header roster-home-header">
        <div className="roster-home-identity"><span className="roster-home-mark" aria-hidden="true">{snapshot.team.spec.displayName.slice(0, 1).toUpperCase()}</span><div><span className="eyebrow">Roster</span><h1>{snapshot.team.spec.displayName}</h1></div></div>
        <div className="header-tools"><PageMotif /><div className="revision"><GitCommitHorizontal size={17} />{revision.slice(0, 8)}</div></div>
      </header>

      <section className="stat-strip" aria-label="팀 통계">
        <article><span><Boxes size={18} />등록된 스킬</span><strong>{snapshot.skills.length}</strong></article>
        <article><span><Users size={18} />팀원</span><strong>{snapshot.members.length}</strong></article>
        <article><span><FolderKanban size={18} />프로젝트</span><strong>{snapshot.projects.length}</strong></article>
        <article><span><MessageSquareText size={18} />스킬 평가</span><strong>{snapshot.reviews.length}</strong></article>
      </section>

      <div className="dashboard-grid">
        <section className="data-section ranking-panel" id="skills">
          <div className="panel-heading"><div><span className="eyebrow">팀 랭킹</span><h2>스킬 평가 순위</h2></div></div>
          <div className="ranking-list">
            {ranked.length === 0 && <div className="empty-state">공유 스킬 등록 후 팀 순위 확인 가능</div>}
            {ranked.map((skill, index) => {
              const [owner, name] = skill.skill.split("/");
              const linkedProjects = projectsForSkill(skill.skill);
              return (
                <article className="ranking-row" key={skill.skill}>
                  <Link className="ranking-link" to={`/skills/${owner}/${name}`}><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><div className="rank-main"><strong>{name}</strong><span>@{owner} · {skill.tags.join(" · ") || "태그 없음"}</span><small><FolderKanban size={12} />{linkedProjects.length ? linkedProjects.join(" · ") : "연결된 프로젝트 없음"}</small></div><div className="rank-evidence"><span><Star size={14} fill="currentColor" />{skill.averageRating?.toFixed(1) ?? "—"}</span><small>동료 {skill.peerReviewCount} · 작성자 {skill.selfReviewCount}</small></div><strong className="score">{skill.score}</strong><ArrowUpRight className="row-arrow" size={17} /></Link>
                  <button className="quick-review-button" type="button" onClick={() => setReviewing(skill)}>평가</button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="data-section activity-panel">
          <div className="panel-heading"><div><span className="eyebrow">스킬 후기</span><h2>최근 팀 평가</h2></div><Link className="text-link" to="/skills">전체 스킬</Link></div>
          <div className="activity-list review-activity-list">
            {recentReviews.length === 0 && <div className="empty-state">첫 번째 스킬 후기를 작성해보세요.</div>}
            {recentReviews.map((review) => (
              <article key={`${review.metadata.name}-${review.spec.skill}`}><span className="review-score-shape">{review.spec.score}</span><div><strong>{review.spec.skill}</strong><p>{review.spec.comment}</p><span>@{review.spec.reviewer}{review.spec.project ? ` · ${review.spec.project}` : ""}</span></div><div className="activity-meta"><span className="review-stars"><Star size={12} fill="currentColor" />{review.spec.score}</span><small>{formatDate(review.spec.createdAt)}</small></div></article>
            ))}
          </div>
        </section>
      </div>

      <section className="data-section" id="projects">
        <div className="panel-heading"><div><span className="eyebrow">프로젝트 연결</span><h2>프로젝트별 스킬 구성</h2></div><Link className="text-link" to="/projects">전체 프로젝트 <ArrowUpRight size={14} /></Link></div>
        <div className="project-list">
          {snapshot.projects.length === 0 && <div className="empty-state">등록된 프로젝트 없음</div>}
          {snapshot.projects.map((project) => {
            const selected = snapshot.skillsets.find((item) => item.spec.project === project.metadata.name)?.spec.skills.length ?? 0;
            return (
              <Link className="project-row" to={`/projects/${project.metadata.name}`} key={project.metadata.name}><div className="project-icon"><FolderKanban size={21} /></div><div className="project-main"><strong>{project.spec.displayName}</strong><p>{project.spec.tags.join(" · ") || "감지된 태그 없음"}</p></div><span className="project-count"><strong>{selected}</strong>개 스킬</span><ArrowUpRight size={16} /></Link>
            );
          })}
        </div>
      </section>

      <section className="data-section local-skills-panel" id="local-skills">
        <div className="panel-heading"><div><span className="eyebrow">로컬</span><h2><HardDrive size={18} />연결된 로컬 스킬</h2></div><span className="muted">{localSkills?.sources.length ?? 0}개 저장소 · {localSkills?.skills.length ?? 0}개 스킬</span></div>
        <div className="local-skill-table">
          {!localSkills?.skills.length && <div className="empty-state">연결한 저장소에 스킬 없음 · `SKILL.md` 추가 시 자동 탐색</div>}
          {localSkills?.skills.slice(0, 8).map((skill) => <article key={skill.path}><div><strong>{skill.name}</strong><p>{skill.description}</p></div><code>{skill.path}</code><span>개인 보관</span></article>)}
          {(localSkills?.skills.length ?? 0) > 8 && <div className="skill-more">그 외 {(localSkills?.skills.length ?? 0) - 8}개 스킬</div>}
        </div>
        <p className="local-share-note">로컬 스킬은 비공개가 기본 · 팀 레지스트리에 직접 공유한 스킬만 프로젝트에서 선택 가능</p>
      </section>

      <Link className="member-strip" id="members" to="/members"><span className="eyebrow">팀원</span><div>{snapshot.members.map((item) => <span className="avatar" title={item.spec.displayName} key={item.metadata.name}>{item.spec.displayName.slice(0, 2).toUpperCase()}</span>)}</div><p>팀원 {snapshot.members.length}명의 활동 보기</p><ArrowUpRight size={16} /></Link>

      {reviewing && <div className="modal-backdrop"><button className="modal-backdrop-dismiss" type="button" tabIndex={-1} onClick={() => setReviewing(null)} aria-label="스킬 평가 창 닫기" /><section className="review-modal" role="dialog" aria-modal="true" aria-label={`${reviewing.skill} 평가`}><button className="modal-close" type="button" onClick={() => setReviewing(null)} aria-label="닫기"><X size={20} /></button><span className="eyebrow">스킬 평가</span><h2>{reviewing.skill}</h2><p>작성자 평가 가능 · 사용 프로젝트와 구체적인 후기 기록</p><ReviewForm skill={reviewing.skill} version={reviewing.version} projects={snapshot.projects.map((item) => ({ name: item.metadata.name, displayName: item.spec.displayName }))} onSaved={() => { setReviewing(null); void reload(); }} /></section></div>}
    </AppShell>
  );
}
