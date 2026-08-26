"use client";

import { Link } from "react-router-dom";
import { useState } from "react";
import { Braces, Sparkles, Star } from "lucide-react";
import type { RecommendedSkill } from "@skillspace/core";
import { ProjectSkillAction } from "./project-skill-action";
import { ProjectSyncPanel } from "./project-sync-panel";

export function ProjectTabs({
  project,
  recommendations,
  selected,
  onChanged,
}: {
  project: string;
  recommendations: RecommendedSkill[];
  selected: Array<{ skill: string; version: string }>;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"recommendations" | "loadout">("recommendations");
  const selectedKeys = new Set(selected.map((item) => `${item.skill}@${item.version}`));

  return (
    <section className="data-section project-tabs-shell">
      <div className="tab-list" role="tablist" aria-label="프로젝트 스킬 보기">
        <button
          aria-controls="recommendations-panel"
          aria-selected={tab === "recommendations"}
          onClick={() => setTab("recommendations")}
          role="tab"
        >
          <Sparkles size={16} /> 스킬 찾기 <span>{recommendations.length}</span>
        </button>
        <button
          aria-controls="loadout-panel"
          aria-selected={tab === "loadout"}
          onClick={() => setTab("loadout")}
          role="tab"
        >
          <Braces size={16} /> 연결된 스킬 <span>{selected.length}</span>
        </button>
      </div>

      {tab === "recommendations" ? (
        <div id="recommendations-panel" role="tabpanel">
          <div className="section-intro">
            <span className="eyebrow">스킬 선택</span>
            <h2>프로젝트에 연결할 팀 스킬</h2>
            <p>태그 일치 우선 · 나머지는 팀 평가 순위 기준</p>
          </div>
          <div className="recommendation-list">
            {recommendations.length === 0 && (
              <div className="empty-state">팀 공유 스킬 없음 · 스킬 화면에서 추가 가능</div>
            )}
            {recommendations.map((skill) => {
              const isSelected = selectedKeys.has(`${skill.skill}@${skill.version}`);
              return (
                <article key={skill.skill}>
                  <div className="recommendation-score">{skill.recommendationScore}</div>
                  <div>
                    <Link to={`/skills/${skill.skill}`}><strong>{skill.skill}</strong></Link>
                    <p>{skill.description}</p>
                    <div className="tag-row">
                      {skill.matchingTags.map((tag) => <span className="tag matched" key={tag}>{tag}</span>)}
                      <span className="inline-rating"><Star size={13} fill="currentColor" />{skill.averageRating?.toFixed(1) ?? "—"}</span>
                    </div>
                  </div>
                  <ProjectSkillAction
                    onChanged={(nextSelected) => { onChanged(); if (nextSelected) setTab("loadout"); }}
                    project={project}
                    selected={isSelected}
                    skill={skill.skill}
                    version={skill.version}
                  />
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div id="loadout-panel" role="tabpanel">
          <div className="section-intro">
            <span className="eyebrow">현재 구성</span>
            <h2>이 프로젝트에 연결된 스킬</h2>
            <p>연결과 해제 내역은 팀 Git 저장소에 즉시 기록</p>
          </div>
          <div className="loadout-table" role="table" aria-label="현재 프로젝트 스킬 구성">
            <div className="loadout-table-head" role="row"><span>스킬</span><span>버전</span><span>연결</span></div>
            {selected.length === 0 && <div className="empty-state">연결된 스킬 없음 · ‘스킬 찾기’ 탭에서 선택 가능</div>}
            {selected.map((item) => (
              <div className="loadout-row" role="row" key={item.skill}>
                <Link to={`/skills/${item.skill}`}><strong>{item.skill}</strong></Link><span>v{item.version}</span><ProjectSkillAction project={project} skill={item.skill} version={item.version} selected onChanged={() => onChanged()} />
              </div>
            ))}
          </div>
          <ProjectSyncPanel project={project} selectedCount={selected.length} />
        </div>
      )}
    </section>
  );
}
