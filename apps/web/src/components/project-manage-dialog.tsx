import { Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { fetchJson } from "@/lib/client";
import { mergeTags } from "@/lib/tags";
import { useModalBehavior } from "@/lib/use-modal-behavior";

export function ProjectManageDialog({ project, displayName: initialDisplayName, initialTags, onClose, onDeleted, onUpdated }: { project: string; displayName: string; initialTags: string[]; onClose: () => void; onDeleted: () => void; onUpdated: () => void }) {
  useModalBehavior(onClose);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addTags() { setTags((current) => mergeTags(current, tagInput)); setTagInput(""); }
  async function save() {
    setSaving(true); setError("");
    try {
      await fetchJson(`/api/projects/${encodeURIComponent(project)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName, tags }) });
      onUpdated();
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!window.confirm(`‘${initialDisplayName}’ 프로젝트 삭제? Git 이력에서 복구 가능`)) return;
    setSaving(true); setError("");
    try {
      await fetchJson(`/api/projects/${encodeURIComponent(project)}`, { method: "DELETE" });
      onDeleted();
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); setSaving(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="project-manage-modal" role="dialog" aria-modal="true" aria-label="프로젝트 설정">
    <button className="modal-close" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
    <span className="eyebrow">프로젝트 설정</span><h2>기본 정보 관리</h2><p>수정 내용은 팀 Git 저장소에 커밋</p>
    <div className="project-manage-fields"><label><span>프로젝트 이름</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label><span>프로젝트 ID</span><input value={project} disabled /></label><div className="tag-picker"><span>기술 태그</span><div className="tag-entry"><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTags(); } }} placeholder="react, spring" /><button type="button" onClick={addTags}>각각 추가</button></div><div className="selected-tags">{tags.map((tag) => <button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} key={tag}>#{tag}<X size={11} /></button>)}</div></div></div>
    {error && <p className="creation-error" role="alert">{error}</p>}
    <footer><button className="button danger" type="button" disabled={saving} onClick={() => void remove()}><Trash2 size={15} />프로젝트 삭제</button><span /><button className="button" type="button" onClick={onClose}>취소</button><button className="button primary" type="button" disabled={saving} onClick={() => void save()}><Save size={15} />{saving ? "저장 중…" : "변경사항 저장"}</button></footer>
  </section></div>;
}
