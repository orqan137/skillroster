import { Check, Download, FolderOpen } from "lucide-react";
import { useState } from "react";
import { fetchJson } from "@/lib/client";

type InstallTarget = "opencode" | "codex" | "claude";

const INSTALL_TARGETS: Array<{ id: InstallTarget; label: string; path: string }> = [
  { id: "opencode", label: "OpenCode", path: ".opencode/skills" },
  { id: "codex", label: "Codex · Agent Skills", path: ".agents/skills" },
  { id: "claude", label: "Claude Code", path: ".claude/skills" },
];

interface SyncResult {
  projectRoot: string;
  installations: Array<{
    target: InstallTarget;
    label: string;
    relativePath: string;
    directory: string;
    skills: Array<{ name: string; skill: string; version: string }>;
  }>;
}

export function ProjectSyncPanel({ project, selectedCount }: { project: string; selectedCount: number }) {
  const [projectRoot, setProjectRoot] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [targets, setTargets] = useState<InstallTarget[]>(["opencode"]);

  async function sync() {
    if (!projectRoot.trim()) { setError("로컬 프로젝트 폴더 입력 필요"); return; }
    if (targets.length === 0) { setError("설치 대상 하나 이상 선택 필요"); return; }
    setSaving(true); setError(""); setResult(null);
    try {
      const next = await fetchJson<SyncResult>(`/api/projects/${encodeURIComponent(project)}/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectRoot, targets }),
      });
      setResult(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  return <section className="project-sync-panel" aria-labelledby="project-sync-title">
    <div className="project-sync-heading"><FolderOpen size={19} /><div><strong id="project-sync-title">로컬 프로젝트에 설치</strong><p>선택한 {selectedCount}개 스킬을 사용할 에이전트 폴더에 복사</p></div></div>
    <fieldset className="project-sync-targets">
      <legend>설치 대상</legend>
      {INSTALL_TARGETS.map((target) => <label key={target.id} className={targets.includes(target.id) ? "selected" : ""}>
        <input
          type="checkbox"
          checked={targets.includes(target.id)}
          onChange={(event) => setTargets((current) => event.target.checked ? [...current, target.id] : current.filter((item) => item !== target.id))}
        />
        <span><strong>{target.label}</strong><code>{target.path}</code></span>
      </label>)}
    </fieldset>
    <div className="project-sync-form"><input aria-label="로컬 프로젝트 폴더" value={projectRoot} onChange={(event) => setProjectRoot(event.target.value)} placeholder="C:\work\my-project 또는 /Users/me/work/my-project" /><button className="button primary" type="button" disabled={saving || selectedCount === 0} onClick={() => void sync()}><Download size={16} />{saving ? "설치 중…" : "선택한 스킬 설치"}</button></div>
    {selectedCount === 0 && <p className="project-sync-note">‘스킬 찾기’에서 사용할 스킬 먼저 연결</p>}
    {error && <p className="project-sync-error" role="alert">{error}</p>}
    {result && <div className="project-sync-success" role="status"><Check size={15} /><div><strong>{result.installations.length}개 대상 설치 완료</strong>{result.installations.map((installation) => <span key={installation.target}>{installation.label} · {installation.skills.length}개 · <code>{installation.relativePath}</code></span>)}</div></div>}
  </section>;
}
