import { Check, FileText, FolderOpen, Link2, MessageSquareText, Sparkles, Star, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchJson } from "@/lib/client";
import type { DashboardPayload } from "@/lib/contracts";
import { mergeTags } from "@/lib/tags";
import { useModalBehavior } from "@/lib/use-modal-behavior";

function slug(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}

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
    if (mode === "create" && (!name || !description.trim() || !instructions.trim() || !sourcePath)) { setError("스킬 이름, 설명, 사용 방법과 개인 저장소 입력 필요"); return; }
    if (mode === "existing" && !skillPath) { setError("공유할 로컬 스킬 선택 필요"); return; }
    if (includeSelfReview && !selfComment.trim()) { setError("작성자 평가 의견 입력 또는 평가 포함 해제 필요"); return; }
    setSaving(true);
    try {
      const result = await fetchJson<{ id: string }>("/api/skills", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, sourcePath, skillPath, name, description, instructions, version, tags, selfReview: includeSelfReview ? { score: selfScore, comment: selfComment } : undefined }) });
      onCreated(result.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="creation-modal skill-creation-modal" role="dialog" aria-modal="true" aria-label="스킬 추가">
    <button className="modal-close" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
    <header><span className="creation-symbol"><Sparkles size={24} /></span><div><span className="eyebrow">스킬 추가</span><h2>개인 스킬 저장 및 팀 공유</h2><p>작성자와 버전은 팀 Git 변경 이력에 기록</p></div></header>
    <div className="creation-tabs" role="tablist"><button aria-selected={mode === "create"} type="button" onClick={() => setMode("create")}><FileText size={16} />새 SKILL.md 작성</button><button aria-selected={mode === "existing"} type="button" onClick={() => setMode("existing")}><FolderOpen size={16} />기존 로컬 스킬 공유</button></div>
    <form className="skill-creation-form" onSubmit={submit}>
      {mode === "create" ? <div className="skill-form-grid">
        <label><span>스킬 이름</span><input autoFocus value={name} onChange={(event) => setName(slug(event.target.value))} placeholder="release-check" /><small>폴더 이름과 팀 스킬 ID로 사용</small></label>
        <label><span>첫 버전</span><input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.0" /></label>
        <label className="wide"><span>한 줄 설명</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="배포 전 변경 사항과 위험 요소 점검" /></label>
        <label className="wide"><span>에이전트가 따를 사용 방법</span><textarea rows={7} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder={"사용 시점과 작업 순서 작성\n\n업무 문서는 복사하지 않고 내부 위키나 Google Drive 링크로 연결"} /></label>
        <label className="wide"><span>내 로컬 저장소</span><select value={sourcePath} onChange={(event) => setSourcePath(event.target.value)}>{sources.map((source) => <option value={source.path} key={source.path}>{source.label} · {source.path}</option>)}</select>{sources.length === 0 && <small className="bad">연결된 개인 스킬 저장소 없음</small>}</label>
      </div> : <div className="existing-skill-picker">
        <div className="file-share-warning"><FolderOpen size={19} /><div><strong>선택한 스킬 폴더 전체를 팀 Git에 공유</strong><p>`SKILL.md` 외 보조 스크립트 포함 · 소스 코드, 인증정보와 업무 문서 유무 확인 필요</p></div></div>
        {localSkills.length === 0 && <div className="empty-state">연결된 개인 저장소에서 발견한 스킬 없음</div>}
        <div className="existing-skill-list">{localSkills.map((skill) => {
          const directory = skill.path.replace(/[\\/]SKILL\.md$/i, "");
          const id = `${data.member}/${skill.name}`;
          return <button className={skillPath === directory ? "selected" : ""} disabled={sharedIds.has(id)} type="button" onClick={() => { setSkillPath(directory); setName(skill.name); }} key={skill.path}><span><FileText size={17} /></span><div><strong>{skill.name}</strong><p>{skill.description}</p><small>{skill.sourcePath}</small></div>{sharedIds.has(id) ? <em>이미 공유됨</em> : skillPath === directory ? <Check size={18} /> : null}</button>;
        })}</div>
        <label className="version-inline"><span>공유 버전</span><input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.0" /></label>
      </div>}
      <div className="skill-tag-field"><span>태그</span><div className="tag-entry"><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(tagInput); } }} placeholder="backend, react, review" /><button type="button" onClick={() => addTag(tagInput)}>각각 추가</button></div><small>쉼표 또는 공백으로 구분</small><div className="selected-tags">{tags.map((tag) => <button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} key={tag}>#{tag}<X size={11} /></button>)}</div></div>
      <section className="self-review-field"><button className="self-review-toggle" type="button" aria-pressed={includeSelfReview} onClick={() => setIncludeSelfReview((value) => !value)}><span>{includeSelfReview && <Check size={14} />}</span><div><strong>작성자 평가 함께 남기기</strong><small>공유와 동시에 사용 경험 기록</small></div></button>{includeSelfReview && <div className="self-review-input"><div className="stars" aria-label="작성자 평점">{[1,2,3,4,5].map((value) => <button aria-label={`작성자 평가 ${value}점`} className={value <= selfScore ? "star active" : "star"} type="button" onClick={() => setSelfScore(value)} key={value}><Star size={18} fill={value <= selfScore ? "currentColor" : "none"} /></button>)}</div><textarea rows={3} value={selfComment} onChange={(event) => setSelfComment(event.target.value)} placeholder="직접 사용한 범위, 장점과 주의점 기록" /><p><MessageSquareText size={13} />작성자 평가로 구분 · 동료 평가보다 낮은 비중으로 순위 반영</p></div>}</section>
      <div className="skill-file-policy"><FileText size={19} /><div><strong>새 스킬은 `SKILL.md` 하나만 생성</strong><p><Link2 size={13} />내부 지식 원본은 업무망·사내 위키·Google Drive에 보관 후 링크</p></div></div>
      {error && <p className="creation-error">{error}</p>}
      <footer><button className="button" type="button" onClick={onClose}>취소</button><button className="button primary" disabled={saving || (mode === "create" && sources.length === 0)} type="submit">{saving ? "로컬 저장·Git 공유 중…" : mode === "create" ? "스킬 만들고 공유" : "선택한 스킬 공유"}</button></footer>
    </form>
  </section></div>;
}
