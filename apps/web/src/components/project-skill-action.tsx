"use client";

import { useState } from "react";
import { Plus, Unlink } from "lucide-react";
import { fetchJson } from "@/lib/client";

export function ProjectSkillAction({
  project,
  skill,
  version,
  selected,
  onChanged,
}: {
  project: string;
  skill: string;
  version: string;
  selected: boolean;
  onChanged: (selected: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  async function change() {
    setSaving(true);
    setFailure("");
    try {
      await fetchJson(`/api/projects/${encodeURIComponent(project)}/skills`, {
        method: selected ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skill, version }),
      });
      onChanged(!selected);
    } catch (caught) {
      setFailure(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }
  return <div className="project-skill-action"><button type="button" className={selected ? "button selected" : "button primary"} disabled={saving} onClick={change} title={failure || undefined}>
      {selected ? <Unlink size={16} /> : <Plus size={16} />}
      {saving ? "반영 중…" : failure ? "오류 · 다시 시도" : selected ? "연결 해제" : "이 스킬 연결"}
    </button>{failure && <small role="alert">{failure}</small>}</div>;
}
