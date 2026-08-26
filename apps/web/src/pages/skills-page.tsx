import { ArrowUpRight, Boxes, FileText, HardDrive, MessageSquareText, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { DirectoryActionHeader } from "@/components/directory-action-header";
import { PageState } from "@/components/page-state";
import { SkillCreateDialog } from "@/components/skill-create-dialog";
import { useApi } from "@/lib/client";
import type { DashboardPayload } from "@/lib/contracts";

export function SkillsPage() {
  const { data, error, requestId, loading, reload } = useApi<DashboardPayload>("/api/dashboard", 10_000);
  const [tab, setTab] = useState<"shared" | "local">("shared");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState<{ mode: "create" | "existing"; skillPath?: string } | null>(null);
  const navigate = useNavigate();
  const filteredShared = useMemo(() => data?.ranked.filter((skill) => `${skill.skill} ${skill.description} ${skill.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())) ?? [], [data, query]);
  const filteredLocal = useMemo(() => data?.localSkills?.skills.filter((skill) => `${skill.name} ${skill.description} ${skill.agent}`.toLowerCase().includes(query.toLowerCase())) ?? [], [data, query]);
  if (loading) return <PageState message="스킬 불러오는 중" />;
  if (error || !data) return <PageState message={error ?? "스킬 불러오기 실패"} requestId={requestId} onRetry={() => void reload()} />;
  const { snapshot, member } = data;
  const sharedIds = new Set(snapshot.skills.map((skill) => skill.id));

  return <AppShell member={member} teamName={snapshot.team.spec.displayName}>
    <DirectoryActionHeader title="스킬" actionLabel="스킬 추가" onAction={() => setCreating({ mode: "create" })} />
    <section className="directory-stats" aria-label="스킬 통계">
      <article><Boxes size={20} /><span>공유 스킬</span><strong>{snapshot.skills.length}</strong></article>
      <article><HardDrive size={20} /><span>내 로컬 스킬</span><strong>{data.localSkills?.skills.length ?? 0}</strong></article>
      <article><MessageSquareText size={20} /><span>팀 평가</span><strong>{snapshot.reviews.length}</strong></article>
    </section>
    <section className="data-section skill-directory">
      <div className="directory-toolbar"><div className="directory-tabs" role="tablist" aria-label="스킬 저장 위치"><button id="shared-skills-tab" role="tab" aria-controls="shared-skills-panel" aria-selected={tab === "shared"} type="button" onClick={() => setTab("shared")}>팀 공유 스킬 <span>{snapshot.skills.length}</span></button><button id="local-skills-tab" role="tab" aria-controls="local-skills-panel" aria-selected={tab === "local"} type="button" onClick={() => setTab("local")}>내 로컬 스킬 <span>{data.localSkills?.skills.length ?? 0}</span></button></div><div className="directory-search"><Search size={16} /><input aria-label="스킬 검색" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름·설명·태그 검색" /></div></div>
      {tab === "shared" ? <div className="shared-skill-directory" id="shared-skills-panel" role="tabpanel" aria-labelledby="shared-skills-tab">
        {filteredShared.length === 0 && <div className="empty-state">조건에 맞는 공유 스킬 없음</div>}
        {filteredShared.map((skill, index) => { const [owner, name] = skill.skill.split("/"); return <Link className="shared-skill-row" to={`/skills/${owner}/${name}`} key={skill.skill}><span className="skill-rank-index">{String(index + 1).padStart(2, "0")}</span><span className="skill-directory-icon"><FileText size={20} /></span><div><strong>{name}</strong><p>{skill.description}</p><span>@{owner} · {skill.tags.map((tag) => `#${tag}`).join(" ") || "태그 없음"}</span></div><div className="skill-directory-rating"><strong><Star size={14} fill="currentColor" />{skill.averageRating?.toFixed(1) ?? "—"}</strong><span>동료 {skill.peerReviewCount} · 작성자 {skill.selfReviewCount}</span></div><div className="skill-project-count"><strong>{skill.adoptedProjects}</strong><span>프로젝트</span></div><ArrowUpRight size={17} /></Link>; })}
      </div> : <div className="personal-skill-directory" id="local-skills-panel" role="tabpanel" aria-labelledby="local-skills-tab">
        {filteredLocal.length === 0 && <div className="empty-state">조건에 맞는 로컬 스킬 없음</div>}
        {filteredLocal.map((skill) => { const id = `${member}/${skill.name}`; const shared = sharedIds.has(id); const directory = skill.path.replace(/[\\/]SKILL\.md$/i, ""); return <article key={skill.path}><span className="skill-directory-icon local"><HardDrive size={19} /></span><div><strong>{skill.name}</strong><p>{skill.description}</p><code>{skill.path}</code></div><span className={shared ? "local-skill-status shared" : "local-skill-status"}>{shared ? "팀 공유됨" : "개인 보관"}</span>{shared ? <Link to={`/skills/${member}/${skill.name}`}>평가·보기 <ArrowUpRight size={14} /></Link> : <button type="button" onClick={() => setCreating({ mode: "existing", skillPath: directory })}>팀에 올리기</button>}</article>; })}
      </div>}
    </section>
    {creating && <SkillCreateDialog data={data} initialMode={creating.mode} initialSkillPath={creating.skillPath ?? ""} onClose={() => setCreating(null)} onCreated={(id) => { setCreating(null); void reload(); navigate(`/skills/${id}`); }} />}
  </AppShell>;
}
