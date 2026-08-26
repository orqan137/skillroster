import { ArrowLeft, Settings2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { PageState } from "@/components/page-state";
import { ProjectManageDialog } from "@/components/project-manage-dialog";
import { ProjectTabs } from "@/components/project-tabs";
import { useApi } from "@/lib/client";
import type { ProjectPayload } from "@/lib/contracts";

export function ProjectPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const [managing, setManaging] = useState(false);
  const endpoint = `/api/projects/${encodeURIComponent(name)}`;
  const { data, error, requestId, loading, reload } = useApi<ProjectPayload>(endpoint);
  if (loading) return <PageState message="프로젝트 구성 불러오는 중" />;
  if (error || !data) return <PageState message={error ?? "프로젝트 불러오기 실패"} requestId={requestId} onRetry={() => void reload()} />;

  return (
    <AppShell member={data.dashboard.member} teamName={data.dashboard.snapshot.team.spec.displayName}>
      <Link className="back-link" to="/projects"><ArrowLeft size={16} />프로젝트 목록으로 돌아가기</Link>
      <header className="detail-header project-detail">
        <div><div className="tag-row">{data.project.spec.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div><h1>{data.project.spec.displayName}</h1><p>팀 스킬 연결 및 로컬 OpenCode 프로젝트 설치</p></div>
        <div className="project-header-actions"><div className="loadout-count"><span>연결된 스킬</span><strong>{data.selected.length}<small>개</small></strong></div><button className="button" type="button" onClick={() => setManaging(true)}><Settings2 size={16} />프로젝트 설정</button></div>
      </header>
      <ProjectTabs project={name} recommendations={data.recommendations} selected={data.selected} onChanged={() => void reload()} />
      {managing && <ProjectManageDialog project={name} displayName={data.project.spec.displayName} initialTags={data.project.spec.tags} onClose={() => setManaging(false)} onUpdated={() => { setManaging(false); void reload(); }} onDeleted={() => navigate("/projects", { replace: true })} />}
    </AppShell>
  );
}
