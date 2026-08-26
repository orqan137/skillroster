import { Check, FileText, FolderOpen, Link2, MessageSquareText, Plus, Sparkles, Star, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/client";
import type { DashboardPayload } from "@/lib/contracts";
import { toSlug, toSlugDraft } from "@/lib/slug";
import { mergeTags } from "@/lib/tags";
import { useModalBehavior } from "@/lib/use-modal-behavior";

export function SkillCreateDialog({ data, initialMode = "create", initialSkillPath = "", onClose, onCreated }: { data: DashboardPayload; initialMode?: "create" | "existing"; initialSkillPath?: string; onClose: () => void; onCreated: (id: string) => void }) {
  useModalBehavior(onClose);
  const [mode, setMode] = useState<"create" | "existing">(initialMode);
  const sources = data.localSkills?.sources.filter((source) => source.exists) ?? [];
  const localSkills = data.localSkills?.skills ?? [];
  const [sourcePath, setSourcePath] = useState(sources[0]?.path ?? "");
  const initialSkill = localSkills.find((skill) => skill.path.replace(/[\\/]SKILL\.md$/i, "").toLowerCase() === initialSkillPath.toLowerCase());
  const [skillPath, setSkillPath] = useState(initialSkillPath);
  const [name, setName] = useState(initialSkill?.name ?? "");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [references, setReferences] = useState<Array<{ id: string; label: string; location: string; includeFile: boolean }>>([{ id: "reference-1", label: "", location: "", includeFile: false }]);
  const [includeSelfReview, setIncludeSelfReview] = useState(false);
  const [selfScore, setSelfScore] = useState(4);
  const [selfComment, setSelfComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const sharedIds = useMemo(() => new Set(data.snapshot.skills.map((skill) => skill.id)), [data.snapshot.skills]);
  useEffect(() => { if (!sourcePath && sources[0]) setSourcePath(sources[0].path); }, [sourcePath, sources]);

  function addTag(raw: string) {
    setTags((current) => mergeTags(current, raw));
    setTagInput("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    const skillName = toSlug(name);
    if (mode === "create" && (!skillName || !description.trim() || !instructions.trim() || !sourcePath)) { setError("스킬 이름, 설명, 사용 방법과 개인 저장소 입력 필요"); return; }
    if (mode === "existing" && !skillPath) { setError("공유할 로컬 스킬 선택 필요"); return; }
    if (includeSelfReview && !selfComment.trim()) { setError("작성자 평가 의견 입력 또는 평가 포함 해제 필요"); return; }
    setSaving(true);
    try {
      const sharedReferences = references.filter((reference) => reference.location.trim()).map(({ label, location, includeFile }) => ({ label, location, includeFile }));
      const result = await fetchJson<{ id: string }>("/api/skills", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, sourcePath, skillPath, name: skillName, description, instructions, version, tags, references: sharedReferences, selfReview: includeSelfReview ? { score: selfScore, comment: selfComment } : undefined }) });
      onCreated(result.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop"><button className="modal-backdrop-dismiss" type="button" tabIndex={-1} onClick={onClose} aria-label="스킬 추가 창 닫기" /><section className="creation-modal skill-creation-modal" role="dialog" aria-modal="true" aria-label="스킬 추가">
    <button className="modal-close" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
    <header><span className="creation-symbol"><Sparkles size={24} /></span><div><span className="eyebrow">스킬 추가</span><h2>스킬 만들기 및 공유</h2></div></header>
    <div className="creation-tabs" role="tablist"><button id="skill-create-tab" role="tab" aria-controls="skill-create-panel" aria-selected={mode === "create"} type="button" onClick={() => setMode("create")}><FileText size={16} />새 SKILL.md 작성</button><button id="skill-existing-tab" role="tab" aria-controls="skill-create-panel" aria-selected={mode === "existing"} type="button" onClick={() => setMode("existing")}><FolderOpen size={16} />기존 로컬 스킬 공유</button></div>
    <form className="skill-creation-form" id="skill-create-panel" role="tabpanel" aria-labelledby={mode === "create" ? "skill-create-tab" : "skill-existing-tab"} onSubmit={submit}>
      {mode === "create" ? <div className="skill-form-grid">
        <label><span>스킬 이름</span><input value={name} onChange={(event) => setName(toSlugDraft(event.target.value))} onBlur={() => setName(toSlug(name))} placeholder="release-check" /><small>폴더 이름과 팀 스킬 ID로 사용</small></label>
        <label><span>첫 버전</span><input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.0" /></label>
        <label className="wide"><span>한 줄 설명</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="배포 전 변경 사항과 위험 요소 점검" /></label>
        <label className="wide"><span>에이전트가 따를 사용 방법</span><textarea rows={7} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder={"사용 시점과 작업 순서 작성\n\n업무 문서는 복사하지 않고 내부 위키나 Google Drive 링크로 연결"} /></label>
        <label className="wide"><span>내 로컬 저장소</span><select value={sourcePath} onChange={(event) => setSourcePath(event.target.value)}>{sources.map((source) => <option value={source.path} key={source.path}>{source.label} · {source.path}</option>)}</select>{sources.length === 0 && <small className="bad">연결된 개인 스킬 저장소 없음</small>}</label>
      </div> : <div className="existing-skill-picker">
        <div className="file-share-warning"><FolderOpen size={19} /><div><strong>선택한 스킬의 `SKILL.md`만 팀 Git에 공유</strong><p>같은 폴더의 소스 코드, 인증정보와 업무 문서는 업로드하지 않음</p></div></div>
        {localSkills.length === 0 && <div className="empty-state">연결된 개인 저장소에서 발견한 스킬 없음</div>}
        <div className="existing-skill-list">{localSkills.map((skill) => {
          const directory = skill.path.replace(/[\\/]SKILL\.md$/i, "");
          const id = `${data.member}/${skill.name}`;
          return <button className={skillPath === directory ? "selected" : ""} disabled={sharedIds.has(id)} type="button" onClick={() => { setSkillPath(directory); setName(skill.name); }} key={skill.path}><span><FileText size={17} /></span><div><strong>{skill.name}</strong><p>{skill.description}</p><small>{skill.sourcePath}</small></div>{sharedIds.has(id) ? <em>이미 공유됨</em> : skillPath === directory ? <Check size={18} /> : null}</button>;
        })}</div>
        <label className="version-inline"><span>공유 버전</span><input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.0" /></label>
      </div>}
      <div className="skill-tag-field"><span>태그</span><div className="tag-entry"><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(tagInput); } }} placeholder="backend, react, review" /><button type="button" onClick={() => addTag(tagInput)}>각각 추가</button></div><small>쉼표 또는 공백으로 구분</small><div className="selected-tags">{tags.map((tag) => <button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} key={tag}>#{tag}<X size={11} /></button>)}</div></div>
      <section className="skill-reference-field"><div className="skill-reference-heading"><div><span>참고 자료</span><small>선택 사항 · 링크·경로만 기록하거나 공유 가능한 파일을 직접 포함</small></div><button type="button" onClick={() => setReferences((current) => [...current, { id: crypto.randomUUID(), label: "", location: "", includeFile: false }])}><Plus size={14} />추가</button></div>
        <div className="skill-reference-list">{references.map((reference, index) => <div className="skill-reference-row" key={reference.id}><input aria-label={`참고 자료 ${index + 1} 이름`} value={reference.label} onChange={(event) => setReferences((current) => current.map((item) => item.id === reference.id ? { ...item, label: event.target.value } : item))} placeholder="자료 이름 (선택)" /><div className="field-with-icon">{reference.includeFile ? <FileText size={14} /> : <Link2 size={14} />}<input aria-label={`참고 자료 ${index + 1} 위치`} value={reference.location} onChange={(event) => setReferences((current) => current.map((item) => item.id === reference.id ? { ...item, location: event.target.value } : item))} placeholder={reference.includeFile ? "C:\\docs\\guide.pdf" : "https://… 또는 팀 공용 경로"} /></div><button className={reference.includeFile ? "reference-mode included" : "reference-mode"} type="button" aria-pressed={reference.includeFile} onClick={() => setReferences((current) => current.map((item) => item.id === reference.id ? { ...item, includeFile: !item.includeFile } : item))}>{reference.includeFile ? "파일 포함" : "위치만"}</button>{references.length > 1 && <button className="reference-remove" type="button" aria-label={`참고 자료 ${index + 1} 삭제`} onClick={() => setReferences((current) => current.filter((item) => item.id !== reference.id))}><Trash2 size={15} /></button>}</div>)}</div>
        <p><FileText size={13} />‘파일 포함’은 선택한 파일만 attachments에 복사 · 위치만 선택하면 파일 내용은 업로드하지 않음</p>
      </section>
      <section className="self-review-field"><button className="self-review-toggle" type="button" aria-pressed={includeSelfReview} onClick={() => setIncludeSelfReview((value) => !value)}><span>{includeSelfReview && <Check size={14} />}</span><div><strong>작성자 평가 함께 남기기</strong><small>공유와 동시에 사용 경험 기록</small></div></button>{includeSelfReview && <div className="self-review-input"><fieldset className="stars" aria-label="작성자 평점">{[1,2,3,4,5].map((value) => <button aria-label={`작성자 평가 ${value}점`} className={value <= selfScore ? "star active" : "star"} type="button" onClick={() => setSelfScore(value)} key={value}><Star size={18} fill={value <= selfScore ? "currentColor" : "none"} /></button>)}</fieldset><textarea rows={3} value={selfComment} onChange={(event) => setSelfComment(event.target.value)} placeholder="직접 사용한 범위, 장점과 주의점 기록" /><p><MessageSquareText size={13} />작성자 평가로 구분 · 동료 평가보다 낮은 비중으로 순위 반영</p></div>}</section>
      <div className="skill-file-policy"><FileText size={19} /><div><strong>기본 공유 범위는 `SKILL.md`</strong><p><Link2 size={13} />필요한 자료만 위치 기록 또는 파일 포함 선택</p></div></div>
      {error && <p className="creation-error">{error}</p>}
      <footer><button className="button" type="button" onClick={onClose}>취소</button><button className="button primary" disabled={saving || (mode === "create" && sources.length === 0)} type="submit">{saving ? "로컬 저장·Git 공유 중…" : mode === "create" ? "스킬 만들고 공유" : "선택한 스킬 공유"}</button></footer>
    </form>
  </section></div>;
}
