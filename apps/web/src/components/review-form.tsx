"use client";

import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { fetchJson } from "@/lib/client";

export function ReviewForm({
  skill,
  version,
  projects,
  onSaved,
}: {
  skill: string;
  version: string;
  projects: Array<{ name: string; displayName: string }>;
  onSaved: () => void;
}) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [failure, setFailure] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setFailure("");
    try {
      await fetchJson("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skill, version, score, comment, project: project || undefined }),
      });
    } catch (caught) {
      setFailure(caught instanceof Error ? caught.message : String(caught));
      setStatus("error");
      return;
    }
    setComment("");
    setStatus("saved");
    onSaved();
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <fieldset className="stars" aria-label="평점">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            aria-label={`${value}점`}
            className={value <= score ? "star active" : "star"}
            key={value}
            onClick={() => setScore(value)}
            type="button"
          >
            <Star size={20} fill={value <= score ? "currentColor" : "none"} />
          </button>
        ))}
      </fieldset>
      <select aria-label="프로젝트 기준" onChange={(event) => setProject(event.target.value)} value={project}>
        <option value="">프로젝트 지정 안 함</option>
        {projects.map((item) => <option key={item.name} value={item.name}>{item.displayName}</option>)}
      </select>
      <textarea
        aria-label="평가 의견"
        onChange={(event) => setComment(event.target.value)}
        placeholder="좋았던 점과 사용 시 주의점"
        required
        rows={4}
        value={comment}
      />
      <button className="button primary" disabled={status === "saving"} type="submit">
        {status === "saving" ? "Git에 기록 중…" : "평가를 Git에 기록"}
      </button>
      {status === "saved" && <span className="form-note success">평가 저장 완료</span>}
      {status === "error" && <span className="form-note error" role="alert">{failure || "평가 저장 실패"}</span>}
    </form>
  );
}
