import { Check, FolderKanban, Hash, Sparkles, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { fetchJson } from "@/lib/client";
import type { DashboardPayload } from "@/lib/contracts";
import { mergeTags } from "@/lib/tags";
import { useModalBehavior } from "@/lib/use-modal-behavior";

function slug(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}

export function ProjectCreateDialog({ data, onClose, onCreated }: { data: DashboardPayload; onClose: () => void; onCreated: (project: string) => void }) {
  useModalBehavior(onClose);
  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const tagCatalog = useMemo(() => {
    const counts = new Map<string, number>();
    data.ranked.forEach((skill) => skill.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
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
    if (!displayName.trim() || !name) { setError("프로젝트 이름과 ID 입력 필요"); return; }
    setSaving(true); setError("");
    try {
      const skills = data.ranked.filter((item) => selected.has(item.skill)).map((item) => ({ skill: item.skill, version: item.version }));
      const result = await fetchJson<{ project: string }>("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, displayName, tags, skills }) });
      onCreated(result.project);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="creation-modal project-creation-modal" role="dialog" aria-modal="true" aria-label="새 프로젝트 만들기">
    <button className="modal-close" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
    <header><span className="creation-symbol blue"><FolderKanban size={24} /></span><div><span className="eyebrow">새 프로젝트</span><h2>프로젝트와 스킬 구성 만들기</h2><p>모든 팀원 생성 가능 · 작성자는 Git 변경 이력에 기록</p></div></header>
    <form className="creation-layout" onSubmit={submit}>
      <div className="creation-fields">
        <label><span>프로젝트 이름</span><input autoFocus value={displayName} onChange={(event) => { setDisplayName(event.target.value); setName(slug(event.target.value)); }} placeholder="예: 결제 API 개편" /></label>
        <label><span>프로젝트 ID</span><div className="field-with-icon"><Hash size={15} /><input value={name} onChange={(event) => setName(slug(event.target.value))} placeholder="payment-api" /></div><small>Git에 저장되는 영문 식별자</small></label>
        <div className="tag-picker"><span>기술 태그</span><div className="tag-entry"><input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(tagInput); } }} placeholder="react, spring, docker" /><button type="button" onClick={() => addTag(tagInput)}>각각 추가</button></div><small>쉼표 또는 공백으로 여러 태그 구분 가능</small>
          <div className="selected-tags">{tags.map((tag) => <button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} key={tag}>#{tag}<X size={11} /></button>)}</div>
          <div className="suggested-tags"><small>팀 스킬에서 많이 쓰는 태그</small><div>{tagCatalog.map(([tag, count]) => <button className={tags.includes(tag) ? "active" : ""} type="button" onClick={() => tags.includes(tag) ? setTags((current) => current.filter((item) => item !== tag)) : setTags((current) => [...current, tag])} key={tag}>#{tag}<span>{count}</span></button>)}</div></div>
        </div>
      </div>
      <aside className="skill-recommend-picker">
        <div className="recommend-picker-heading"><span><Sparkles size={17} />추천 스킬</span><small>{tags.length ? "태그 일치와 팀 순위 반영" : "팀 평가 순위 기준"}</small></div>
        {recommendations.length === 0 && <div className="empty-state">공유 스킬 등록 후 추천 표시</div>}
        {recommendations.map((skill) => <button className={selected.has(skill.skill) ? "selected" : ""} type="button" onClick={() => toggleSkill(skill.skill)} key={skill.skill}>
          <span className="recommend-rank">{skill.rank}</span><div><strong>{skill.skill.split("/").at(-1)}</strong><p>{skill.description}</p><span>{skill.matchingTags.length ? skill.matchingTags.map((tag) => `#${tag}`).join(" ") : `팀 순위 ${skill.rank}위`}</span></div><em><Star size={12} fill="currentColor" />{skill.averageRating?.toFixed(1) ?? "—"}</em><i>{selected.has(skill.skill) && <Check size={15} />}</i>
        </button>)}
        <p className="recommend-note">프로젝트 생성 후에도 스킬 연결 가능</p>
      </aside>
      {error && <p className="creation-error">{error}</p>}
      <footer><button className="button" type="button" onClick={onClose}>취소</button><button className="button primary" disabled={saving} type="submit">{saving ? "Git에 기록 중…" : `프로젝트 만들기${selected.size ? ` · 스킬 ${selected.size}개` : ""}`}</button></footer>
    </form>
  </section></div>;
}
