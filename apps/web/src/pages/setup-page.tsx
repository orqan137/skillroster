import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  GitBranch,
  LogIn,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { fetchJson } from "@/lib/client";
import { ApiError } from "@/lib/client";
import type { SetupStatusPayload } from "@/lib/contracts";
import { GitCredentialHelp } from "@/components/git-credential-help";

type SetupMode = "create" | "join";

function slug(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function generatedTeamId(): string {
  return `team-${Date.now().toString(36).slice(-6)}`;
}

export function SetupPage({ status, onComplete }: { status: SetupStatusPayload; onComplete: () => void }) {
  const suggestedUser = slug(status.gitIdentity.name) || "team-member";
  const [mode, setMode] = useState<SetupMode | null>(null);
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [team, setTeam] = useState(generatedTeamId);
  const [member, setMember] = useState(suggestedUser);
  const [memberName, setMemberName] = useState(status.gitIdentity.name || "");
  const [email, setEmail] = useState(status.gitIdentity.email);
  const [directory, setDirectory] = useState(status.defaultTeamDirectory);
  const [directoryEdited, setDirectoryEdited] = useState(false);
  const [remote, setRemote] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkingRemote, setCheckingRemote] = useState(false);
  const [credentialHelp, setCredentialHelp] = useState(false);
  const [error, setError] = useState("");

  const remoteName = slug(remote.replace(/[\\/]$/, "").split(/[\\/]/).at(-1)?.replace(/\.git$/, "") ?? "") || "team-roster";
  const directoryPreview = useMemo(() => {
    if (directoryEdited) return directory;
    return status.defaultTeamDirectory.replace(/my-team$/, mode === "join" ? remoteName : team || "my-team");
  }, [directory, directoryEdited, mode, remoteName, status.defaultTeamDirectory, team]);

  const steps = mode === "join"
    ? [[1, "팀 저장소 연결", "팀장이 공유한 Git 주소"], [2, "내 정보 입력", "팀에 표시할 이름과 이메일"], [3, "확인 후 참여", "등록과 push 자동 실행"]]
    : [[1, "팀 정보 입력", "팀 이름과 최초 관리자"], [2, "팀 저장소 연결", "비어 있는 원격 Git 주소"], [3, "확인 후 생성", "초기화와 push 자동 실행"]];

  function selectMode(nextMode: SetupMode) {
    setMode(nextMode);
    setStep(1);
    setError("");
  }

  function validateCurrentStep(): boolean {
    setError("");
    if (!mode) return false;
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (mode === "create" && step === 1) {
      if (!displayName || !team || !member || !memberName || !email) {
        setError("팀과 관리자 정보 입력 필요"); return false;
      }
      if (!slugPattern.test(team) || !slugPattern.test(member)) {
        setError("팀 ID와 사용자 ID는 영문 소문자, 숫자, 하이픈만 사용 가능"); return false;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) { setError("올바른 이메일 주소 필요"); return false; }
    }
    if (mode === "create" && step === 2 && (!remote.trim() || !directoryPreview.trim())) {
      setError(!remote.trim() ? "빈 원격 Git 저장소 주소 필요" : "로컬 clone 경로 필요"); return false;
    }
    if (mode === "join" && step === 1 && (!remote.trim() || !directoryPreview.trim())) {
      setError(!remote.trim() ? "팀장이 공유한 원격 Git 주소 필요" : "로컬 clone 경로 필요"); return false;
    }
    if (mode === "join" && step === 2) {
      if (!member || !memberName || !email) { setError("팀원 정보 입력 필요"); return false; }
      if (!slugPattern.test(member)) { setError("사용자 ID는 영문 소문자, 숫자, 하이픈만 사용 가능"); return false; }
      if (!/^\S+@\S+\.\S+$/.test(email)) { setError("올바른 이메일 주소 필요"); return false; }
    }
    return true;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mode || !validateCurrentStep()) return;
    if (step < 3) {
      const remoteStep = (mode === "create" && step === 2) || (mode === "join" && step === 1);
      if (remoteStep) { await checkRemote(); return; }
      setStep((current) => current + 1); return;
    }
    setSaving(true);
    try {
      const common = { remote, directory: directoryPreview };
      await fetchJson(mode === "create" ? "/api/setup/initialize" : "/api/setup/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "create"
          ? { ...common, team, displayName, owner: member, ownerName: memberName, email }
          : { ...common, member, displayName: memberName, email }),
      });
      onComplete();
    } catch (caught) {
      const authRequired = caught instanceof ApiError && caught.code === "GIT_AUTH_REQUIRED";
      setError(authRequired ? "원격 Git push 권한 확인 실패" : caught instanceof Error ? caught.message : String(caught));
      if (authRequired) setCredentialHelp(true);
      setSaving(false);
    }
  }

  async function checkRemote() {
    setCheckingRemote(true);
    setError("");
    try {
      await fetchJson("/api/git/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ remote }),
      });
      setCredentialHelp(false);
      setStep((current) => Math.min(3, current + 1));
    } catch (caught) {
      const authRequired = caught instanceof ApiError && caught.code === "GIT_AUTH_REQUIRED";
      setError(authRequired ? "원격 Git push 권한 확인 실패" : caught instanceof Error ? caught.message : String(caught));
      if (authRequired) setCredentialHelp(true);
    } finally {
      setCheckingRemote(false);
    }
  }

  if (!mode) {
    return (
      <main className="setup-page">
        <header className="setup-topbar"><div className="setup-brand"><span><GitBranch size={18} /></span><strong>SkillRoster</strong></div></header>
        <section className="setup-welcome">
          <div className="welcome-copy"><span className="eyebrow">팀 에이전트 스킬 로스터</span><h1>시작 방식 선택</h1><p>팀장은 새 로스터 생성 · 팀원은 기존 로스터 참여</p></div>
          <div className="setup-choices">
            <button type="button" onClick={() => selectMode("create")}><span className="choice-icon"><Plus size={25} /></span><div><b>팀장으로 시작</b><h2>새 로스터 만들기</h2><p>빈 원격 Git 저장소를 팀 스킬 레지스트리로 초기화</p></div><strong>만들기 <ArrowRight size={18} /></strong></button>
            <button type="button" onClick={() => selectMode("join")}><span className="choice-icon blue"><LogIn size={25} /></span><div><b>팀원으로 시작</b><h2>기존 로스터 들어가기</h2><p>팀장이 준비한 원격 Git 저장소 연결 및 팀원 등록</p></div><strong>들어가기 <ArrowRight size={18} /></strong></button>
          </div>
        </section>
      </main>
    );
  }

  const isCreate = mode === "create";
  return (
    <main className="setup-page">
      <header className="setup-topbar"><div className="setup-brand"><span><GitBranch size={18} /></span><strong>SkillRoster</strong></div><button className="mode-reset" type="button" onClick={() => setMode(null)}><ArrowLeft size={15} />시작 방식 다시 선택</button></header>
      <div className="setup-layout">
        <aside className="setup-rail">
          <span className="eyebrow">{isCreate ? "새 로스터 만들기" : "기존 로스터 들어가기"}</span>
          <h1>{isCreate ? <>팀 스킬 로스터<br />처음 만들기</> : <>팀 로스터<br />이 컴퓨터에 연결</>}</h1>
          <p>{isCreate ? "빈 원격 Git 저장소에 팀 구조와 관리자 기록" : "원격 저장소 clone 및 팀원 정보 커밋"}</p>
          <ol>{steps.map(([number, title, description]) => <li className={step === number ? "active" : step > Number(number) ? "done" : ""} key={String(number)}><span>{step > Number(number) ? <Check size={15} /> : number}</span><div><strong>{title}</strong><small>{description}</small></div></li>)}</ol>
          <div className="privacy-note"><ShieldCheck size={18} /><div><strong>선택한 정보만 공유</strong><span>프롬프트와 소스 코드는 수집하지 않음</span></div></div>
        </aside>

        <form className="setup-workspace" onSubmit={submit}>
          <div className="setup-heading">
            <div className="setup-progress" aria-label={`전체 3단계 중 ${step}단계`}><strong>{step}단계</strong><span><i style={{ width: `${(step / 3) * 100}%` }} /></span><small>총 3단계</small></div>
            {isCreate && step === 1 && <><h2>새 팀 정보</h2><p>팀 이름과 첫 관리자 정보 입력</p></>}
            {isCreate && step === 2 && <><h2>팀 저장소 연결</h2><p>빈 원격 Git 주소 입력 후 자동 설정</p></>}
            {isCreate && step === 3 && <><h2>입력 내용 확인</h2><p>확인 후 로스터 생성 및 원격 저장소 기록</p></>}
            {!isCreate && step === 1 && <><h2>팀 저장소 연결</h2><p>팀장이 전달한 SkillRoster 원격 Git 주소 입력</p></>}
            {!isCreate && step === 2 && <><h2>내 정보</h2><p>동료 평가와 실행 기록에 표시할 이름 입력</p></>}
            {!isCreate && step === 3 && <><h2>입력 내용 확인</h2><p>확인 후 저장소 clone 및 팀원 등록</p></>}
          </div>

          {isCreate && step === 1 && <div className="setup-fields"><label className="field wide"><span>팀 이름</span><input autoFocus value={displayName} onChange={(event) => { setDisplayName(event.target.value); const next = slug(event.target.value); if (next) setTeam(next); }} placeholder="예: 백엔드 플랫폼 팀" /><small>대시보드에 표시할 이름</small></label><div className="field-section-heading"><Users size={19} /><div><h3>내 정보</h3><p>로스터 생성자는 첫 번째 관리자로 등록</p></div></div><label className="field"><span>이름</span><input autoComplete="name" value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="홍길동" /></label><label className="field"><span>이메일</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="hong@company.com" /></label><details className="advanced-fields"><summary>고급 설정</summary><p>CLI와 Git 문서용 영문 식별자 · 대부분 수정 불필요</p><div><label className="field"><span>팀 ID</span><input value={team} onChange={(event) => setTeam(slug(event.target.value))} placeholder="backend-team" /></label><label className="field"><span>관리자 ID</span><input value={member} onChange={(event) => setMember(slug(event.target.value))} placeholder="hong" /></label></div></details></div>}

          {((isCreate && step === 2) || (!isCreate && step === 1)) && <div className="setup-fields"><div className="remote-required"><GitBranch size={19} /><div><strong>{isCreate ? "빈 원격 저장소 필요" : "팀장이 공유한 원격 저장소 필요"}</strong><span>{isCreate ? "README, 라이선스, .gitignore 없이 생성" : "clone과 push 권한 필요"}</span></div><b>필수</b></div><label className="field wide"><span>원격 Git 주소</span><div className="input-icon"><GitBranch size={16} /><input autoFocus required value={remote} onChange={(event) => setRemote(event.target.value)} placeholder="git@github.com:your-org/team-skills.git" /></div><small>GitHub, GitLab, Gitea와 사내 Git의 SSH·HTTPS 주소 사용 가능</small></label><details className="advanced-fields"><summary>이 컴퓨터의 저장 위치 변경</summary><p>운영체제 기본 위치 자동 선택 · 필요한 경우에만 변경</p><div><label className="field wide"><span>저장 위치</span><div className="input-icon"><Database size={16} /><input required value={directoryPreview} onChange={(event) => { setDirectory(event.target.value); setDirectoryEdited(true); }} /></div></label></div></details></div>}

          {!isCreate && step === 2 && <div className="setup-fields"><label className="field"><span>이름</span><input autoFocus autoComplete="name" value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="김개발" /><small>평가와 실행 기록에 표시</small></label><label className="field"><span>이메일</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="kim@company.com" /></label><details className="advanced-fields"><summary>고급 설정</summary><p>CLI와 Git 문서용 영문 사용자 ID</p><div><label className="field"><span>사용자 ID</span><input value={member} onChange={(event) => setMember(slug(event.target.value))} placeholder="kim" /></label></div></details></div>}

          {step === 3 && <div className="setup-summary"><dl>{isCreate && <div><dt>팀</dt><dd><strong>{displayName}</strong><span>{team}</span></dd></div>}<div><dt>{isCreate ? "최초 관리자" : "참여할 팀원"}</dt><dd><strong>{memberName}</strong><span>@{member} · {email}</span></dd></div><div><dt>원격 Git</dt><dd><code>{remote}</code></dd></div><div><dt>로컬 clone</dt><dd><code>{directoryPreview}</code></dd></div></dl><div className="created-files"><span className="eyebrow">자동으로 실행되는 작업</span><ul>{isCreate ? <><li><Check size={15} />빈 원격 저장소 clone</li><li><Check size={15} />팀·관리자 문서 생성</li><li><Check size={15} />공개 JSON Schema 설치</li><li><Check size={15} />첫 커밋과 main push</li></> : <><li><Check size={15} />기존 팀 저장소 clone</li><li><Check size={15} />SkillRoster 형식 확인</li><li><Check size={15} />팀원 정보 커밋</li><li><Check size={15} />원격 저장소에 push</li></>}</ul></div></div>}

          {error && <div className="setup-error" role="alert">{error}</div>}
          <footer className="setup-actions"><button className="button back" type="button" disabled={saving || checkingRemote} onClick={() => { setError(""); if (step === 1) setMode(null); else setStep((current) => current - 1); }}><ArrowLeft size={16} />이전</button><button className="button primary next" type="submit" disabled={saving || checkingRemote}>{checkingRemote ? "Git 연결 확인 중…" : saving ? (isCreate ? "clone·push 진행 중…" : "참여 정보 등록 중…") : step === 3 ? (isCreate ? "새 로스터 생성" : "기존 로스터 참여") : "계속"}{!saving && !checkingRemote && (step === 3 ? <Check size={16} /> : <ArrowRight size={16} />)}</button></footer>
        </form>
      </div>
      {credentialHelp && <GitCredentialHelp remote={remote} checking={checkingRemote} onClose={() => setCredentialHelp(false)} onRetry={() => void checkRemote()} />}
    </main>
  );
}
