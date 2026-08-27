# Presentation outline

[한국어](PRESENTATION_OUTLINE.md) · **English**

## Ten-minute structure

1. **Problem:** useful agent skills remain on individual machines, making team review and reuse difficult.
2. **Audience:** development teams using multiple projects and AI coding agents.
3. **Gap:** community popularity does not show whether a skill works in this team's environment.
4. **Approach:** publish only selected skills and combine peer reviews, project adoption, and execution records.
5. **Difference:** store ordinary files in Git and pin exact skill releases per project.
6. **Architecture:** local skills → SkillRoster client → team Git repository → project install targets.
7. **Demo:** show the main flow through `pnpm demo` or real remotes.
8. **Open source:** React, Vite, Ajv, simple-git, the OpenCode hook, and automated license checks.
9. **Quality and governance:** three-OS CI, automated verification, rollback, Issue-linked Pull Requests, and public schemas.
10. **Boundary and next steps:** separate current features from packaged installation, more execution adapters, and team memory.

## What the demo must show

1. member, skill, and project status in the overview;
2. author reviews separated from peer reviews;
3. project version selection informed by technology tags and team feedback;
4. OpenCode, Codex, and Claude Code install targets;
5. the corresponding YAML documents and Git history.

## One-sentence introduction

> SkillRoster is a self-hosted open-source tool that keeps a team's AI-agent skills in Git and uses peer feedback and usage history to assemble project-specific skill sets.

## Fallbacks

- No internet or GitHub credentials: run the isolated `pnpm demo`.
- Port 3210 is occupied: use the demo's default port 3211.
- The browser does not open: visit the printed `http://127.0.0.1:3211` URL.
- Questions about data origin: show the matching YAML and Git commit.
- Questions about unimplemented work: distinguish unreleased and planned work in the [roadmap](ROADMAP.en.md).
