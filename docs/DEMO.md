# Hackathon demo script

## Before the demo

1. Prepare an empty bare or hosted Git repository.
2. Open two terminals with separate `SKILLSPACE_CONFIG` paths to represent two teammates.
3. Keep the example skills in `examples/skills` and the sample project in `examples/projects/shopping-api`.

## 2-minute flow

### 0:00–0:25 — A team registry, not a public marketplace

Initialize as Hong, then join as Kim. Show the remote Git tree: there is no database and no source repository mirror.

### 0:25–0:50 — Publish and review

Publish `spring-review` as Hong and `api-contract-check` as Kim. Review the other person's exact version. Point out that self-review is rejected and every review is attributable in Git history.

### 0:50–1:20 — Start a project

Run `project init` in the shopping API. Show detected JavaScript, TypeScript, Spring, and Docker tags, then open the project page. Add the top recommendations and run `sync`; the skills appear under `.opencode/skills`.

### 1:20–1:45 — Evidence, not surveillance

Load a team skill in OpenCode and commit an accepted result. The hook runs the declared verification command and creates `verified` evidence. Open the YAML to show that it contains no prompt or source, only the commit and status.

### 1:45–2:00 — Visual payoff

Run `skillroster dashboard`. Show that a peer-reviewed, verified, adopted skill rises above an untested skill, and that a new project receives tag-based recommendations.

## Judge questions

**Is this another skill marketplace?** No. Public marketplaces rank global popularity. SkillRoster ranks exact versions against a private team's reviews, accepted commits, and project context.

**Why Git instead of a database?** The team already has access control, audit history, review workflows, backups, and rollback in Git. The format remains usable even if this application disappears.

**Does it send source code to a central service?** No. Source and prompts remain local; the evidence schema forbids storing them.

**What happens when verification fails?** The developer commit is not blocked. A failed evidence record lowers trust and remains auditable.
