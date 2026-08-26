import { Link, NavLink, useLocation } from "react-router-dom";
import { Boxes, Check, ChevronsUpDown, FolderKanban, House, Plus, Settings, Users } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fetchJson, useApi } from "@/lib/client";
import type { TeamsPayload } from "@/lib/contracts";
import { GitCredentialHelp } from "./git-credential-help";

export function AppShell({
  children,
  teamName,
  member,
}: {
  children: ReactNode;
  teamName: string;
  member: string;
}) {
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [switching, setSwitching] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [credentialHelp, setCredentialHelp] = useState(false);
  const teamSwitcherRef = useRef<HTMLDivElement>(null);
  const workspaceTriggerRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const { data: teams } = useApi<TeamsPayload>("/api/teams");
  useEffect(() => {
    const show = () => setCredentialHelp(true);
    window.addEventListener("skillroster:git-auth-required", show);
    return () => window.removeEventListener("skillroster:git-auth-required", show);
  }, []);
  useEffect(() => { setTeamsOpen(false); }, [pathname]);
  useEffect(() => {
    if (!teamsOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!teamSwitcherRef.current?.contains(event.target as Node)) setTeamsOpen(false);
    };
    const dismissWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTeamsOpen(false);
        workspaceTriggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithKeyboard);
    };
  }, [teamsOpen]);

  async function switchTeam(team: string) {
    if (teams?.activeTeam === team) { setTeamsOpen(false); return; }
    setSwitching(team);
    setSwitchError("");
    try {
      await fetchJson("/api/teams/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ team }),
      });
      window.location.assign("/");
    } catch (caught) {
      setSwitchError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSwitching("");
    }
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="SkillRoster 개요로 이동">
          <span className="brand-mark"><img src="/skillroster-mark.svg" alt="" /></span>
          <span>SkillRoster</span>
        </Link>
        <div className="team-switcher" ref={teamSwitcherRef}>
          <button ref={workspaceTriggerRef} className="workspace-trigger" type="button" onClick={() => setTeamsOpen((value) => !value)} aria-controls="team-switcher-panel" aria-expanded={teamsOpen} aria-haspopup="dialog" aria-label={`${teamName} 로스터 전환`}>
            <span className="team-symbol">{teamName.slice(0, 1)}</span>
            <span><small>현재 팀</small><strong>{teamName}</strong><em>@{member}</em></span>
            <ChevronsUpDown size={16} />
          </button>
          {teamsOpen && <div className="team-switcher-panel" id="team-switcher-panel" role="dialog" aria-label="내 로스터">
            <div className="team-switcher-heading"><strong>내 로스터</strong><span>{teams?.teams.length ?? 1}개 팀</span></div>
            <div className="team-options">
              {teams?.teams.map((team) => <button type="button" key={team.team} disabled={Boolean(switching)} onClick={() => void switchTeam(team.team)}><span className="team-option-symbol">{team.displayName.slice(0, 1)}</span><span><strong>{team.displayName}</strong><small>@{team.member}</small></span>{team.active && <Check size={16} />}</button>)}
            </div>
            {switchError && <p className="team-switch-error" role="alert">{switchError}</p>}
            {teams?.switchable !== false && <Link className="add-team-link" to="/teams/add" onClick={() => setTeamsOpen(false)}><Plus size={16} />로스터 연결하기</Link>}
          </div>}
        </div>
        <nav aria-label="주요 메뉴">
          <NavLink title="개요" className={({ isActive }) => isActive ? "active" : ""} to="/" end><House size={19} strokeWidth={2.1} />개요</NavLink>
          <NavLink title="스킬" className={({ isActive }) => isActive ? "active" : ""} to="/skills"><Boxes size={18} />스킬</NavLink>
          <NavLink title="프로젝트" className={({ isActive }) => isActive ? "active" : ""} to="/projects"><FolderKanban size={18} />프로젝트</NavLink>
          <NavLink title="팀원" className={({ isActive }) => isActive ? "active" : ""} to="/members"><Users size={18} />팀원</NavLink>
          <NavLink title="설정" className={({ isActive }) => `settings-nav${isActive ? " active" : ""}`} to="/settings"><Settings size={18} />설정</NavLink>
        </nav>
      </aside>
      <main className="main-content">{children}</main>
      {credentialHelp && <GitCredentialHelp remote={teams?.teams.find((team) => team.active)?.remote ?? ""} checking={false} onClose={() => setCredentialHelp(false)} onRetry={() => setCredentialHelp(false)} />}
    </div>
  );
}
