import { ArrowLeft, Check, ExternalLink, GitBranch, RefreshCw, Settings2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { PageState } from "@/components/page-state";
import { ProjectManageDialog } from "@/components/project-manage-dialog";
import { ProjectTabs } from "@/components/project-tabs";
import { fetchJson, useApi } from "@/lib/client";
import type { ProjectPayload } from "@/lib/contracts";

export function ProjectPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [managing, setManaging] = useState(false);
  const [syncingRepository, setSyncingRepository] = useState(false);
  const [repositoryStatus, setRepositoryStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const endpoint = `/api/projects/${encodeURIComponent(name)}`;
  const { data, error, requestId, loading, reload } = useApi<ProjectPayload>(endpoint);
  if (loading) return <PageState message="프로젝트 구성 불러오는 중" />;
  if (error || !data) return <PageState message={error ?? "프로젝트 불러오기 실패"} requestId={requestId} onRetry={() => void reload()} />;

  return (
    <AppShell member={data.dashboard.member} teamName={data.dashboard.snapshot.team.spec.displayName}>
      <Link className="back-link" to="/projects"><ArrowLeft size={16} />프로젝트 목록으로 돌아가기</Link>
      <header className="detail-header project-detail">
        <div><div className="tag-row">{data.project.spec.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div><h1>{data.project.spec.displayName}</h1>{data.project.spec.repository && <div className="project-repository-link"><GitBranch size={15} /><a href={data.project.spec.repository} target="_blank" rel="noreferrer">프로젝트 Git 열기<ExternalLink size={12} /></a><button type="button" disabled={syncingRepository} onClick={async () => { setSyncingRepository(true); setRepositoryStatus(null); try { await fetchJson(`/api/projects/${encodeURIComponent(name)}/repository/sync`, { method: "POST" }); setRepositoryStatus({ kind: "success", message: "구성 반영 완료" }); } catch (caught) { setRepositoryStatus({ kind: "error", message: caught instanceof Error ? caught.message : String(caught) }); } finally { setSyncingRepository(false); } }}><RefreshCw size={13} />{syncingRepository ? "반영 중" : "Git 구성 갱신"}</button>{repositoryStatus && <span className={repositoryStatus.kind}>{repositoryStatus.kind === "success" && <Check size={13} />}{repositoryStatus.message}</span>}</div>}</div>
        <div className="project-header-actions"><div className="loadout-count"><span>연결된 스킬</span><strong>{data.selected.length}<small>개</small></strong></div><button className="button" type="button" onClick={() => setManaging(true)}><Settings2 size={16} />프로젝트 설정</button></div>
      </header>
      {(location.state as { warning?: string } | null)?.warning && <p className="project-sync-warning" role="status">{(location.state as { warning: string }).warning} · ‘Git 구성 갱신’으로 다시 시도 가능</p>}
      <ProjectTabs project={name} recommendations={data.recommendations} selected={data.selected} onChanged={() => void reload()} />
      {managing && <ProjectManageDialog project={name} displayName={data.project.spec.displayName} initialTags={data.project.spec.tags} onClose={() => setManaging(false)} onUpdated={() => { setManaging(false); void reload(); }} onDeleted={() => navigate("/projects", { replace: true })} />}
    </AppShell>
  );
}
