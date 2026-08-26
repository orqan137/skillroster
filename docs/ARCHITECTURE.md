# Architecture

## Design principle

SkillRoster separates three planes.

1. **Local execution plane** — OpenCode, source files, prompts, credentials, and pending evidence stay on each developer machine.
2. **Git knowledge plane** — explicitly published `SKILL.md` files, opt-in attachments, reference locations, reviews, projects, loadouts, and minimal evidence are ordinary files in a team Git repository.
3. **Local client plane** — CLI and dashboard read a developer's clone and write through pull/rebase/commit/push transactions.

```text
Developer project
├─ OpenCode
├─ .opencode/skills/*       installed team skills
├─ .opencode/plugins/*      privacy-preserving event hook
├─ .skillspace/project.yaml explicit tags and verification commands
└─ .skillspace/events/*     ignored local queue
              │ accepted Git commit
              ▼
SkillRoster CLI ── verify ── commit/push
              │
              ▼
Team registry Git remote
├─ skills/ and releases/
├─ reviews/
├─ evidence/
└─ projects/*/skillset.yaml
              ▲
              │ read/write via local clone
       Visual dashboard
              │ selected skill IDs and versions
              ▼
Project Git remote
└─ .skillroster/project.yaml
```

## Trust and ranking

Peer review and execution evidence answer different questions:

- A review says a teammate found a precise version useful, correct, or reproducible.
- Evidence says that version was loaded in a named project and whether the project's declared verification commands passed after an accepted commit.
- Project adoption says a maintainer deliberately included it in a loadout.

The score combines a Bayesian peer rating, evidence success, freshness, and adoption. Recommendations add a deterministic project-tag overlap bonus. No LLM is required for ranking, so a team can inspect and reproduce every result.

## Concurrency

Every mutation follows `clean check → pull --rebase → write files → validate the complete snapshot → commit → push`. Writes targeting the same clone are serialized in-process. Push races retry up to three times after rebasing. A failed mutation restores its starting revision, so an uncommitted partial package cannot leak into a later commit. Reviews use one file per reviewer and skill version, making an update an explicit replacement rather than an accumulating duplicate.

## Privacy boundary

The OpenCode plugin handles only the native `skill` tool. It records the winning installed skill ID and version, session ID, timestamp, and fixed privacy flags. It does not read or persist tool output, prompts, source code, environment variables, or credentials. Verification output is displayed locally but is not copied into evidence. Skill publication copies `SKILL.md` by default; each optional reference stays location-only unless the user explicitly selects that file for inclusion.

## Extension points

- Add another agent adapter that emits the same local queue event shape.
- Add another UI over the registry schemas without using the TypeScript packages.
- Replace Git hosting while retaining standard clone/pull/push behavior.
- Add an authenticated organization gateway without changing the registry format.
