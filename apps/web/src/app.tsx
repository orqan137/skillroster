import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/dashboard-page";
import { ProjectPage } from "./pages/project-page";
import { ProjectsPage } from "./pages/projects-page";
import { MembersPage } from "./pages/members-page";
import { SkillPage } from "./pages/skill-page";
import { SkillsPage } from "./pages/skills-page";
import { SettingsPage } from "./pages/settings-page";
import { SetupPage } from "./pages/setup-page";
import { AgentConnectPage } from "./pages/agent-connect-page";
import { PageState } from "./components/page-state";
import { useApi } from "./lib/client";
import type { SetupStatusPayload } from "./lib/contracts";

export function App() {
  const { data, error, requestId, loading, reload } = useApi<SetupStatusPayload>("/api/setup/status");
  if (loading) return <PageState message="로컬 환경 확인 중" />;
  if (error || !data) return <PageState message={error ?? "로컬 설정 확인 실패"} requestId={requestId} onRetry={() => void reload()} />;
  if (!data.configured) return <SetupPage status={data} onComplete={() => void reload()} />;
  if (!data.localSources.completed) return <AgentConnectPage onComplete={() => void reload()} />;

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:name" element={<ProjectPage />} />
      <Route path="/members" element={<MembersPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/teams/add" element={<SetupPage status={data} onComplete={() => window.location.assign("/")} />} />
      <Route path="/skills" element={<SkillsPage />} />
      <Route path="/skills/:owner/:name" element={<SkillPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
