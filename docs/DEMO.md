# Hackathon demo script

## 인증 없는 심사용 데모

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm demo
```

외부 remote나 credential 없이 임시 Git worktree에 샘플을 생성함. 기본 주소는 `http://127.0.0.1:3211`이며 terminal에 registry 절대 경로가 출력됨. 아래 상태가 보이면 준비 완료임.

- 팀원 3명
- 공유 스킬 3개
- 프로젝트 2개와 각 프로젝트의 연결 스킬 2개
- 평가 4개(동료 3개, 작성자 1개)
- 개인정보를 담지 않은 verified 실행 기록 2개

데모는 별도 `sources.yaml`을 사용하고 `examples/skills`만 연결함. 심사자의 실제 `~/.codex/skills`, `~/.config/opencode/skills` 등은 탐색하지 않음.

## Before the demo

1. Prepare an empty bare or hosted Git repository.
2. Open two terminals with separate `SKILLSPACE_CONFIG` paths to represent two teammates.
3. Keep the example skills in `examples/skills` and the sample project in `examples/projects/shopping-api`.

## 2-minute flow

### 0:00–0:25 — A team registry, not a public marketplace

Initialize as Hong, then join as Kim. Show the remote Git tree: there is no database and no source repository mirror.

### 0:25–0:50 — Publish and review

Publish `spring-review` as Hong and `api-contract-check` as Kim. Review the other person's exact version. 작성자도 자기평가를 남길 수 있지만 화면과 랭킹에서 동료 평가와 분리됨을 보여줌. 모든 평가는 Git 작성자와 파일 이력으로 추적 가능함.

### 0:50–1:20 — 프로젝트 생성과 추천

프로젝트 화면의 `프로젝트 추가`에서 표시 이름과 영문 ID를 입력함. `api`, `typescript` 태그를 선택하면 태그 일치와 팀 평가 순위가 함께 반영되는 추천을 확인함. `api-contract-check`, `docker-debug`를 선택해 프로젝트를 실제 생성하고 Git에 프로젝트 문서와 skillset이 함께 커밋됐는지 확인함.

### 1:20–1:45 — Evidence, not surveillance

Load a team skill in OpenCode and commit an accepted result. The hook runs the declared verification command and creates `verified` evidence. Open the YAML to show that it contains no prompt or source, only the commit and status.

### 1:45–2:00 — Visual payoff

Run `skillroster dashboard`. Show that a peer-reviewed, verified, adopted skill rises above an untested skill, and that a new project receives tag-based recommendations.

## Judge questions

**Is this another skill marketplace?** No. Public marketplaces rank global popularity. SkillRoster ranks exact versions against a private team's reviews, accepted commits, and project context.

**Why Git instead of a database?** The team already has access control, audit history, review workflows, backups, and rollback in Git. The format remains usable even if this application disappears.

**Does it send source code to a central service?** No. Source and prompts remain local; the evidence schema forbids storing them.

**What happens when verification fails?** The developer commit is not blocked. A failed evidence record lowers trust and remains auditable.

## 발표 직전 점검

```bash
git status --short
pnpm verify
git log --oneline -5
```

화면 순서는 개요 → 스킬 상세 → 프로젝트 → 설정의 Git 상태로 고정함. 실시간 데이터를 새로 입력하는 구간은 스킬 평가 하나로 제한하고, 나머지는 샘플 데이터로 재현성을 확보함.
