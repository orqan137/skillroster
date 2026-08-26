import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, FolderOpen, GitBranch, KeyRound, Pencil, RefreshCw, Save, ShieldCheck, UserRound, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageState } from "@/components/page-state";
import { fetchJson, useApi } from "@/lib/client";
import type { SetupStatusPayload, TeamsPayload } from "@/lib/contracts";

type Feedback = { type: "success" | "error"; text: string } | null;

export function SettingsPage() {
  const status = useApi<SetupStatusPayload>("/api/setup/status");
  const teams = useApi<TeamsPayload>("/api/teams");
  if (status.loading || teams.loading) return <PageState message="설정 불러오는 중" />;
  if (status.error || !status.data || teams.error || !teams.data) return <PageState message={status.error ?? teams.error ?? "설정 불러오기 실패"} requestId={status.requestId ?? teams.requestId} onRetry={() => { void status.reload(); void teams.reload(); }} />;
  const connection = status.data.connection;
  const active = teams.data.teams.find((team) => team.active);
  if (!connection || !active || !status.data.memberProfile) return <PageState message="활성 로스터의 사용자 정보 없음" />;

  return <SettingsContent
    key={`${connection.team}:${connection.directory}:${connection.member}`}
    status={status.data}
    connection={connection}
    profile={status.data.memberProfile}
    active={active}
    reload={() => { void status.reload(); void teams.reload(); }}
  />;
}

function SettingsContent({ status, connection, profile, active, reload }: {
  status: SetupStatusPayload;
  connection: NonNullable<SetupStatusPayload["connection"]>;
  profile: NonNullable<SetupStatusPayload["memberProfile"]>;
  active: TeamsPayload["teams"][number];
  reload: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [gitName, setGitName] = useState(status.gitIdentity.name);
  const [gitEmail, setGitEmail] = useState(status.gitIdentity.email);
  const [directory, setDirectory] = useState(connection.directory);
  const [sources, setSources] = useState(status.localSources.sources.join("\n"));
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
  const [directoryFeedback, setDirectoryFeedback] = useState<Feedback>(null);
  const [sourceFeedback, setSourceFeedback] = useState<Feedback>(null);
  const [accessFeedback, setAccessFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [localEditing, setLocalEditing] = useState(false);

  const roleLabel = profile.role === "owner" ? "관리자" : profile.role === "maintainer" ? "유지관리자" : "팀원";

  function cancelProfileEdit() {
    setDisplayName(profile.displayName);
    setEmail(profile.email);
    setGitName(status.gitIdentity.name);
    setGitEmail(status.gitIdentity.email);
    setProfileFeedback(null);
    setProfileEditing(false);
  }

  function cancelLocalEdit() {
    setDirectory(connection.directory);
    setSources(status.localSources.sources.join("\n"));
    setDirectoryFeedback(null);
    setSourceFeedback(null);
    setLocalEditing(false);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy("profile");
    setProfileFeedback(null);
    try {
      await fetchJson("/api/settings/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, gitName, gitEmail }),
      });
      setProfileFeedback({ type: "success", text: "사용자 정보 저장 완료" });
      setProfileEditing(false);
      reload();
    } catch (error) {
      setProfileFeedback({ type: "error", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  }

  async function checkAccess() {
    if (!active.remote) return;
    setBusy("access");
    setAccessFeedback(null);
    try {
      await fetchJson("/api/git/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ remote: active.remote }),
      });
      setAccessFeedback({ type: "success", text: "읽기·쓰기 권한 확인 완료" });
    } catch (error) {
      setAccessFeedback({ type: "error", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  }

  async function moveDirectory(event: FormEvent) {
    event.preventDefault();
    const target = directory.trim();
    if (target === connection.directory) {
      setDirectoryFeedback({ type: "success", text: "현재 경로와 동일함" });
      return;
    }
    if (!window.confirm("로스터의 로컬 clone을 새 경로로 이동합니다. 계속할까요?")) return;
    setBusy("directory");
    setDirectoryFeedback(null);
    try {
      await fetchJson("/api/settings/directory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ directory: target }),
      });
      setDirectoryFeedback({ type: "success", text: "로컬 clone 이동 완료. 설정 다시 불러오는 중" });
      window.location.reload();
    } catch (error) {
      setDirectoryFeedback({ type: "error", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  }

  async function saveSources(event: FormEvent) {
    event.preventDefault();
    setBusy("sources");
    setSourceFeedback(null);
    const paths = sources.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    try {
      await fetchJson("/api/local-skills/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sources: paths }),
      });
      setSourceFeedback({ type: "success", text: `${paths.length}개 개인 스킬 저장소 연결 완료` });
      setLocalEditing(false);
      reload();
    } catch (error) {
      setSourceFeedback({ type: "error", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  }

  return <AppShell member={connection.member} teamName={active.displayName}>
    <header className="page-header settings-header">
      <div><span className="eyebrow">Roster settings</span><h1>{active.displayName} 로스터 설정</h1><p>이 로스터와 현재 컴퓨터에 적용되는 연결·사용자·저장 경로 관리</p></div>
      <span className="roster-scope"><GitBranch size={15} /><b>{active.displayName}</b><small>@{connection.member}</small></span>
    </header>

    <section className="settings-section">
      <div className="settings-section-heading"><GitBranch size={20} /><div><h2>로스터 Git 연결</h2><p>현재 로스터의 데이터 원본과 접근 권한</p></div><span className="connection-badge"><CheckCircle2 size={14} />연결됨</span></div>
      <dl className="settings-list">
        <div><dt>로스터</dt><dd>{active.displayName}<small>{active.team}</small></dd></div>
        <div><dt>원격 저장소</dt><dd><code>{active.remote ?? "원격 저장소 없음"}</code></dd></div>
        <div><dt>연결 방식</dt><dd>{connection.source === "local-config" ? "이 컴퓨터의 SkillRoster 설정" : "환경 변수"}</dd></div>
      </dl>
      <div className="git-access-row">
        <ShieldCheck size={21} />
        <div><strong>접근 권한 기준: 원격 Git</strong><p>비공개 저장소는 GitHub·GitLab에서 권한을 받은 계정만 clone·push 가능. SkillRoster에 토큰 저장 없음.</p></div>
        {active.remote ? <button className="button" type="button" disabled={busy === "access"} onClick={() => void checkAccess()}><RefreshCw size={14} />{busy === "access" ? "확인 중" : "권한 다시 확인"}</button> : <span className="settings-muted">로컬 전용</span>}
      </div>
      {accessFeedback && <p className={`settings-feedback ${accessFeedback.type}`} aria-live="polite">{accessFeedback.text}</p>}
    </section>

    <section className="settings-section">
      <div className="settings-section-heading"><UserRound size={20} /><div><h2>사용자 정보</h2><p>현재 로스터의 프로필과 커밋 작성자</p></div>{profileEditing ? <button className="settings-edit-button cancel" type="button" onClick={cancelProfileEdit}><X size={14} />취소</button> : <button className="settings-edit-button" type="button" onClick={() => setProfileEditing(true)}><Pencil size={14} />수정</button>}</div>
      {!profileEditing && <dl className="settings-list settings-read-list">
        <div><dt>사용자</dt><dd>{profile.displayName}<small>@{profile.id}</small></dd></div>
        <div><dt>이메일</dt><dd>{profile.email}</dd></div>
        <div><dt>로스터 역할</dt><dd>{roleLabel}</dd></div>
        <div><dt>커밋 작성자</dt><dd>{status.gitIdentity.name}<small>{status.gitIdentity.email}</small></dd></div>
        <div><dt>Git 인증</dt><dd><span className="settings-note"><KeyRound size={14} />Git Credential Manager 또는 SSH Agent</span></dd></div>
      </dl>}
      {!profileEditing && <FeedbackView value={profileFeedback} />}
      {profileEditing && <form className="settings-form" onSubmit={(event) => void saveProfile(event)}>
        <label><span>사용자 ID</span><input value={profile.id} disabled /><small>평가·스킬 경로 참조에 사용되어 변경 불가</small></label>
        <label><span>표시 이름</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
        <label><span>사용자 이메일</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label><span>로스터 역할</span><input value={roleLabel} disabled /></label>
        <label><span>커밋 작성자 이름</span><input value={gitName} onChange={(event) => setGitName(event.target.value)} required /><small>현재 로스터 clone의 Git 설정에만 적용</small></label>
        <label><span>커밋 작성자 이메일</span><input type="email" value={gitEmail} onChange={(event) => setGitEmail(event.target.value)} required /></label>
        <div className="settings-form-footer"><span className="settings-note"><KeyRound size={14} />인증은 운영체제 Git Credential Manager 또는 SSH Agent 사용</span><FeedbackView value={profileFeedback} /><button className="button primary" type="submit" disabled={busy === "profile"}><Save size={14} />{busy === "profile" ? "저장 중" : "사용자 정보 저장"}</button></div>
      </form>}
    </section>

    <section className="settings-section">
      <div className="settings-section-heading"><FolderOpen size={20} /><div><h2>로컬 저장 경로</h2><p>현재 컴퓨터의 로스터 clone과 개인 스킬 위치</p></div>{localEditing ? <button className="settings-edit-button cancel" type="button" onClick={cancelLocalEdit}><X size={14} />취소</button> : <button className="settings-edit-button" type="button" onClick={() => setLocalEditing(true)}><Pencil size={14} />수정</button>}</div>
      {!localEditing && <dl className="settings-list settings-read-list">
        <div><dt>로스터 clone</dt><dd><code>{connection.directory}</code></dd></div>
        <div><dt>설정 파일</dt><dd><code>{status.configPath}</code></dd></div>
        {status.localSources.sources.map((source, index) => <div key={source}><dt>개인 스킬 {index + 1}</dt><dd><code>{source}</code></dd></div>)}
        {!status.localSources.sources.length && <div><dt>개인 스킬</dt><dd>연결된 저장소 없음</dd></div>}
      </dl>}
      {!localEditing && <FeedbackView value={sourceFeedback ?? directoryFeedback} />}
      {localEditing && <div className="settings-edit-surface"><form className="path-settings-form" onSubmit={(event) => void moveDirectory(event)}>
        <label><span>로스터 clone</span><input value={directory} onChange={(event) => setDirectory(event.target.value)} disabled={connection.source !== "local-config"} /></label>
        <button className="button" type="submit" disabled={busy === "directory" || connection.source !== "local-config"}>{busy === "directory" ? "이동 중" : "경로 변경"}</button>
      </form>
      <div className="settings-warning"><AlertTriangle size={18} /><div><strong>경로 변경 주의</strong><p>커밋되지 않은 변경이 없어야 함. 대상은 존재하지 않는 폴더여야 함. 실패 시 기존 위치 유지.</p></div></div>
      <FeedbackView value={directoryFeedback} />
      <dl className="settings-list compact"><div><dt>설정 파일</dt><dd><code>{status.configPath}</code></dd></div></dl>

      <form className="source-settings-form" onSubmit={(event) => void saveSources(event)}>
        <label><span>개인 스킬 저장소</span><textarea rows={Math.max(3, status.localSources.sources.length + 1)} value={sources} onChange={(event) => setSources(event.target.value)} placeholder={"C:\\Users\\name\\.codex\\skills\n/Users/name/.config/opencode/skills"} /><small>한 줄에 경로 하나. 존재하는 폴더만 연결 가능.</small></label>
        <div><FeedbackView value={sourceFeedback} /><button className="button" type="submit" disabled={busy === "sources"}><Save size={14} />{busy === "sources" ? "저장 중" : "스킬 경로 저장"}</button></div>
      </form></div>}
    </section>
  </AppShell>;
}

function FeedbackView({ value }: { value: Feedback }) {
  if (!value) return <span />;
  return <span className={`settings-feedback ${value.type}`} role="status">{value.text}</span>;
}
