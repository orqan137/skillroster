import { Check, FolderKanban, GitBranch, Hash, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { fetchJson } from "@/lib/client";
import type { DashboardPayload } from "@/lib/contracts";
import { toSlug, toSlugDraft } from "@/lib/slug";
import { mergeTags } from "@/lib/tags";
import { useModalBehavior } from "@/lib/use-modal-behavior";

export function ProjectCreateDialog({ data, onClose, onCreated }: { data: DashboardPayload; onClose: () => void; onCreated: (project: string, warning?: string) => void }) {
  useModalBehavior(onClose);
  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState("");
  const [repository, setRepository] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const tagCatalog = useMemo(() => {
    const counts = new Map<string, number>();
    for (const skill of data.ranked) {
      for (const tag of skill.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
  }, [data.ranked]);
  const recommendations = useMemo(() => data.ranked.map((skill, index) => {
    const matchingTags = skill.tags.filter((tag) => tags.includes(tag));
    return { ...skill, rank: index + 1, matchingTags, recommendationScore: skill.score + matchingTags.length * 12 };
  }).sort((a, b) => b.recommendationScore - a.recommendationScore || a.rank - b.rank).slice(0, 6), [data.ranked, tags]);

  function addTag(raw: string) {
    setTags((current) => mergeTags(current, raw));
    setTagInput("");
  }
  function toggleSkill(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const projectName = toSlug(name);
    if (!displayName.trim() || !projectName || !repository.trim()) { setError("프로젝트 이름, ID와 Git 주소 입력 필요"); return; }
    setSaving(true); setError("");
    try {
      const skills = data.ranked.filter((item) => selected.has(item.skill)).map((item) => ({ skill: item.skill, version: item.version }));
      const result = await fetchJson<{ project: string; warning?: string }>("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: projectName, displayName, repository, tags, skills }) });
      onCreated(result.project, result.warning);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop"><button className="modal-backdrop-dismiss" type="button" tabIndex={-1} onClick={onClose} aria-label="새 프로젝트 창 닫기" /><section className="creation-modal project-creation-modal" role="dialog" aria-modal="true" aria-label="새 프로젝트 만들기">
    <button className="modal-close" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
    <header><span className="creation-symbol blue"><FolderKanban size={24} /></span><div><span className="eyebrow">새 프로젝트</span><h2>프로젝트 만들기</h2></div></header>
    <form className="creation-layout" onSubmit={submit}>
      <div className="creation-fields">
        <label><span>프로젝트 이름</span><input value={displayName} onChange={(event) => { setDisplayName(event.target.value); setName(toSlug(event.target.value)); }} placeholder="예: 결제 API 개편" /></label>
        <label><span>프로젝트 ID</span><div className="field-with-icon"><Hash size={15} /><input value={name} onChange={(event) => setName(toSlugDraft(event.target.value))} onBlur={() => setName(toSlug(name))} placeholder="payment-api" /></div><small>Git에 저장되는 영문 식별자</small></label>
        <label className="wide"><span>프로젝트 Git 주소</span><div className="field-with-icon"><GitBranch size={15} /><input value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="https://github.com/org/payment-api" /></div><small>프로젝트 생성 시 <code>.skillroster/project.yaml</code> 구성 커밋</small></label>
        <div className="repository-privacy-note"><ShieldCheck size={18} /><div><strong>구성 정보만 프로젝트 Git에 기록</strong><p>스킬 참고 파일과 로컬 경로의 파일 내용은 업로드하지 않음</p></div></div>
        <div className="tag-picker"><span>기술 태그</span><div className="tag-entry"><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(tagInput); } }} placeholder="react, spring, docker" /><button type="button" onClick={() => addTag(tagInput)}>각각 추가</button></div><small>쉼표 또는 공백으로 여러 태그 구분 가능</small>
          <div className="selected-tags">{tags.map((tag) => <button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} key={tag}>#{tag}<X size={11} /></button>)}</div>
          <div className="suggested-tags"><small>팀 스킬에서 많이 쓰는 태그</small><div>{tagCatalog.map(([tag, count]) => <button className={tags.includes(tag) ? "active" : ""} type="button" onClick={() => tags.includes(tag) ? setTags((current) => current.filter((item) => item !== tag)) : setTags((current) => [...current, tag])} key={tag}>#{tag}<span>{count}</span></button>)}</div></div>
        </div>
      </div>
      <aside className="skill-recommend-picker">
        <div className="recommend-picker-heading"><span><Sparkles size={17} />추천 스킬</span><small>{tags.length ? "태그 일치와 팀 순위 반영" : "팀 평가 순위 기준"}</small></div>
        {recommendations.length === 0 && <div className="empty-state">추천할 공유 스킬 없음</div>}
        {recommendations.map((skill) => <button className={selected.has(skill.skill) ? "selected" : ""} type="button" onClick={() => toggleSkill(skill.skill)} key={skill.skill}>
          <span className="recommend-rank">{skill.rank}</span><div><strong>{skill.skill.split("/").at(-1)}</strong><p>{skill.description}</p><span>{skill.matchingTags.length ? skill.matchingTags.map((tag) => `#${tag}`).join(" ") : `팀 순위 ${skill.rank}위`}</span></div><em><Star size={12} fill="currentColor" />{skill.averageRating?.toFixed(1) ?? "—"}</em><i>{selected.has(skill.skill) && <Check size={15} />}</i>
        </button>)}
      </aside>
      {error && <p className="creation-error">{error}</p>}
      <footer><button className="button" type="button" onClick={onClose}>취소</button><button className="button primary" disabled={saving} type="submit">{saving ? "Git에 기록 중…" : `프로젝트 만들기${selected.size ? ` · 스킬 ${selected.size}개` : ""}`}</button></footer>
    </form>
  </section></div>;
}
