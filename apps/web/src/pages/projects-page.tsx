import { ArrowUpRight, Boxes, FolderKanban, Link2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { DirectoryActionHeader } from "@/components/directory-action-header";
import { PageState } from "@/components/page-state";
import { ProjectCreateDialog } from "@/components/project-create-dialog";
import { useApi } from "@/lib/client";
import type { DashboardPayload } from "@/lib/contracts";

export function ProjectsPage() {
  const { data, error, requestId, loading, reload } = useApi<DashboardPayload>("/api/dashboard", 10_000);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  if (loading) return <PageState message="프로젝트 불러오는 중" />;
  if (error || !data) return <PageState message={error ?? "프로젝트 불러오기 실패"} requestId={requestId} onRetry={() => void reload()} />;

  const { snapshot, member } = data;
  const connectedSkills = new Set(snapshot.skillsets.flatMap((set) => set.spec.skills.map((item) => item.skill)));
  return <AppShell member={member} teamName={snapshot.team.spec.displayName}>
    <DirectoryActionHeader eyebrow="Roster" title="프로젝트" actionLabel="프로젝트 추가" onAction={() => setCreating(true)} />
    <section className="directory-stats" aria-label="프로젝트 통계">
      <article><FolderKanban size={20} /><span>등록된 프로젝트</span><strong>{snapshot.projects.length}</strong></article>
      <article><Link2 size={20} /><span>프로젝트 연결 스킬</span><strong>{connectedSkills.size}</strong></article>
      <article><Boxes size={20} /><span>전체 팀 스킬</span><strong>{snapshot.skills.length}</strong></article>
    </section>
    <section className="data-section project-directory">
      <div className="panel-heading"><div><span className="eyebrow">전체 목록</span><h2>프로젝트</h2></div></div>
      {snapshot.projects.length === 0 && <div className="empty-state empty-state-action"><span>등록된 프로젝트 없음</span><button type="button" onClick={() => setCreating(true)}>첫 프로젝트 만들기</button></div>}
      {snapshot.projects.map((project, index) => {
        const selected = snapshot.skillsets.find((item) => item.spec.project === project.metadata.name)?.spec.skills ?? [];
        return <Link className="directory-row" to={`/projects/${project.metadata.name}`} key={project.metadata.name}>
          <span className={`directory-symbol shape-${index % 3}`}><FolderKanban size={22} /></span>
          <div className="directory-main"><strong>{project.spec.displayName}</strong><p>{project.spec.tags.join(" · ") || "등록된 기술 태그 없음"}{project.spec.repository && <span className="project-git-badge">Git 연결</span>}</p></div>
          <div className="connected-skill-preview">{selected.length === 0 ? <span>연결된 스킬 없음</span> : selected.slice(0, 3).map((item) => <span key={item.skill}>{item.skill.split("/").at(-1)}</span>)}{selected.length > 3 && <small>+{selected.length - 3}</small>}</div>
          <div className="directory-count"><strong>{selected.length}</strong><span>개 연결</span></div><ArrowUpRight size={18} />
        </Link>;
      })}
    </section>
    {creating && <ProjectCreateDialog data={data} onClose={() => setCreating(false)} onCreated={(project, warning) => { setCreating(false); void reload(); navigate(`/projects/${project}`, { state: warning ? { warning } : undefined }); }} />}
  </AppShell>;
}
