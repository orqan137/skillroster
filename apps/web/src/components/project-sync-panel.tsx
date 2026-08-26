import { Check, Download, FolderOpen } from "lucide-react";
import { useState } from "react";
import { fetchJson } from "@/lib/client";

interface SyncResult {
  projectRoot: string;
  installed: Array<{ name: string; skill: string; version: string }>;
}

export function ProjectSyncPanel({ project, selectedCount }: { project: string; selectedCount: number }) {
  const [projectRoot, setProjectRoot] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SyncResult | null>(null);

  async function sync() {
    if (!projectRoot.trim()) { setError("로컬 프로젝트 폴더 입력 필요"); return; }
    setSaving(true); setError(""); setResult(null);
    try {
      const next = await fetchJson<SyncResult>(`/api/projects/${encodeURIComponent(project)}/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectRoot }),
      });
      setResult(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  return <section className="project-sync-panel" aria-labelledby="project-sync-title">
    <div className="project-sync-heading"><FolderOpen size={19} /><div><strong id="project-sync-title">로컬 프로젝트에 설치</strong><p>선택한 {selectedCount}개 스킬을 <code>.opencode/skills</code>에 복사</p></div></div>
    <div className="project-sync-form"><input aria-label="로컬 프로젝트 폴더" value={projectRoot} onChange={(event) => setProjectRoot(event.target.value)} placeholder="C:\work\my-project 또는 /Users/me/work/my-project" /><button className="button primary" type="button" disabled={saving || selectedCount === 0} onClick={() => void sync()}><Download size={16} />{saving ? "설치 중…" : "선택한 스킬 설치"}</button></div>
    {selectedCount === 0 && <p className="project-sync-note">‘스킬 찾기’에서 사용할 스킬 먼저 연결</p>}
    {error && <p className="project-sync-error" role="alert">{error}</p>}
    {result && <p className="project-sync-success" role="status"><Check size={15} />{result.installed.length}개 스킬 설치 완료 · {result.projectRoot}</p>}
  </section>;
}
