import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Check, FileSearch, Folder, Link2, Plus, ShieldCheck } from "lucide-react";
import { fetchJson, useApi } from "@/lib/client";
import type { LocalSkillScanPayload } from "@/lib/contracts";

const agentNames: Record<string, string> = {
  codex: "Codex",
  opencode: "OpenCode",
  claude: "Claude Code",
  agents: "Agent Skills",
  custom: "사용자 지정",
};

export function AgentConnectPage({ onComplete }: { onComplete: () => void }) {
  const [customPaths, setCustomPaths] = useState<string[]>([]);
  const query = useMemo(() => customPaths.map((path) => `path=${encodeURIComponent(path)}`).join("&"), [customPaths]);
  const { data, error: scanError, loading } = useApi<LocalSkillScanPayload>(`/api/local-skills/scan${query ? `?${query}` : ""}`);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customPath, setCustomPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data) return;
    setSelected((current) => {
      const next = new Set(current);
      for (const source of data.sources) {
        if (source.exists && (source.connected || current.size === 0)) next.add(source.path);
      }
      return next;
    });
  }, [data]);

  function addCustomPath(event: FormEvent) {
    event.preventDefault();
    const path = customPath.trim();
    if (!path) return;
    setCustomPaths((current) => current.includes(path) ? current : [...current, path]);
    setCustomPath("");
  }

  async function connect(sources: string[]) {
    setSaving(true);
    setError("");
    try {
      await fetchJson("/api/local-skills/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSaving(false);
    }
  }

  const selectedSkills = data?.skills.filter((skill) => selected.has(skill.sourcePath)) ?? [];

  return (
    <main className="setup-page local-connect-page">
      <header className="setup-topbar"><div className="setup-brand"><span><img src="/skillroster-mark.svg" alt="" /></span><strong>SkillRoster</strong></div></header>
      <div className="local-connect-layout">
        <section className="local-connect-intro">
          <span className="eyebrow">로컬 스킬</span>
          <h1>로컬 스킬<br />연결</h1>
          <p><code>SKILL.md</code>가 있는 폴더 선택</p>
          <div className="path-guide">
            <strong>기본 탐색 경로</strong>
            <dl>
              <div><dt>Codex</dt><dd><code>~/.codex/skills</code></dd></div>
              <div><dt>OpenCode</dt><dd><code>~/.config/opencode/skills</code></dd></div>
              <div><dt>Claude Code</dt><dd><code>~/.claude/skills</code></dd></div>
              <div><dt>공통 규격</dt><dd><code>~/.agents/skills</code></dd></div>
            </dl>
          </div>
          <div className="project-path-note"><FileSearch size={18} /><div><strong>프로젝트 스킬 폴더 연결</strong><span><code>.opencode/skills</code>, <code>.claude/skills</code>, <code>.agents/skills</code></span></div></div>
        </section>

        <section className="local-connect-workspace">
          <div className="setup-heading"><span className="step-label">선택 사항</span><h2>스킬 폴더 선택</h2><p>연결한 스킬은 로컬 목록에 표시 · 팀 공유는 직접 선택</p></div>

          {loading && <div className="scan-state">스킬 폴더 찾는 중</div>}
          {(scanError || error) && <div className="setup-error" role="alert">{error || scanError}</div>}
          {data && <>
            <section className="source-table" aria-label="로컬 스킬 저장소">
              {data.sources.map((source) => (
                <label className={`source-row ${!source.exists ? "missing" : ""}`} key={source.path}>
                  <input
                    type="checkbox"
                    disabled={!source.exists}
                    checked={source.exists && selected.has(source.path)}
                    onChange={(event) => setSelected((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(source.path); else next.delete(source.path);
                      return next;
                    })}
                  />
                  <span className="source-icon"><Folder size={17} /></span>
                  <span className="source-main"><strong>{source.label}</strong><code>{source.path}</code></span>
                  <span className={`source-status ${source.exists ? "found" : ""}`}>{source.exists ? `${source.skillCount}개 발견` : "폴더 없음"}</span>
                </label>
              ))}
            </section>

            <form className="custom-path-form" onSubmit={addCustomPath}>
              <label><span>다른 폴더 직접 추가</span><input value={customPath} onChange={(event) => setCustomPath(event.target.value)} placeholder="예: ~/project/.opencode/skills" /></label>
              <button className="button" type="submit"><Plus size={15} />탐색</button>
            </form>

            <section className="discovered-skills">
              <div className="discovered-heading"><div><span className="eyebrow">탐색 결과</span><h3>선택한 저장소에서 {selectedSkills.length}개 발견</h3></div><ShieldCheck size={19} /></div>
              <div className="skill-preview-list">
                {selectedSkills.length === 0 && <div className="empty-state">선택한 폴더에 읽을 수 있는 스킬 없음 · 추가 시 자동 재탐색</div>}
                {selectedSkills.slice(0, 12).map((skill) => <article key={skill.path}><span><Check size={13} /></span><div><strong>{skill.name}</strong><p>{skill.description}</p></div><small>{agentNames[skill.agent] ?? skill.agent}</small></article>)}
                {selectedSkills.length > 12 && <div className="skill-more">그 외 {selectedSkills.length - 12}개 스킬</div>}
              </div>
            </section>
          </>}

          <footer className="connect-actions">
            <button className="button" type="button" disabled={saving} onClick={() => void connect([])}>건너뛰기</button>
            <span><Link2 size={14} />선택 경로는 로컬에만 저장</span>
            <button className="button primary" type="button" disabled={saving || !data} onClick={() => void connect([...selected])}>{saving ? "연결 중…" : `${selected.size}개 폴더 연결`} {!saving && <ArrowRight size={16} />}</button>
          </footer>
        </section>
      </div>
    </main>
  );
}
