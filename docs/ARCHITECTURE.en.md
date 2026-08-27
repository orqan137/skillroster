# Architecture

[한국어](ARCHITECTURE.md) · **English**

SkillRoster separates personal execution state from the data a team deliberately shares.

1. **Local execution plane:** agents, source code, prompts, credentials, and pending execution records stay on each developer's machine.
2. **Team Git plane:** published `SKILL.md` files, selected attachments and reference locations, reviews, projects, and minimal execution records live in a team repository.
3. **Local client plane:** the CLI and dashboard read a teammate's clone and write through pull, validation, commit, and push transactions.

```text
Developer machine
├─ local agent skills
├─ SkillRoster CLI and dashboard
└─ team-repository clone
          │ pull · validate · commit · push
          ▼
Team Git remote
├─ skills/ and releases/       published skills and versions
├─ reviews/                    author and peer reviews
├─ evidence/                   minimal execution records
└─ projects/*/skillset.yaml    project skill sets
          │ selected IDs and versions
          ▼
Project
├─ .opencode/skills/           OpenCode target
├─ .agents/skills/             Codex and Agent Skills target
├─ .claude/skills/             Claude Code target
├─ .opencode/plugins/          OpenCode execution-record plugin
├─ .skillspace/project.yaml    local tags and verification commands
└─ .skillroster/project.yaml   skill selection shared in project Git
```

## Components

| Component | Responsibility |
|---|---|
| `apps/cli` | Team setup, publishing, reviews, projects, installation, and execution-record flushes |
| `apps/web` | React and Vite dashboard with a local Git write API |
| `packages/core` | File repository, local discovery, recommendation, and ranking |
| `packages/git` | Clone, pull, rebase, commit, push, and rollback |
| `packages/opencode-plugin` | OpenCode events and a `post-commit` installer that preserves an existing hook |
| `packages/schemas` | Public TypeScript types and JSON Schemas |

## Writes and synchronization

Read-only screens load the local clone immediately. Remote changes arrive through the explicit pull action in Settings or the `pull --rebase` step of the next write.

Every mutation follows this sequence:

1. require a clean managed worktree;
2. pull remote changes with rebase;
3. write the requested documents;
4. validate the complete registry snapshot;
5. commit and push.

Writes against one clone are serialized within the process. Push races retry up to three times after rebasing. If a mutation fails, the client restores the starting revision and removes only files created by that attempt. Success is reported only after the push finishes.

## Reviews and recommendations

- **Peer review:** a teammate's opinion on the usefulness, correctness, or reproducibility of an exact release.
- **Author review:** a self-review shown separately and weighted below peer feedback.
- **Execution record:** whether the release was loaded in a project and whether declared verification commands passed.
- **Project adoption:** a deliberate choice to include the exact release in a project skill set.

Ranking combines a Bayesian peer rating, execution history, recency, and project adoption. Project recommendations add deterministic technology-tag overlap. No LLM is required, so a team can reproduce the result from the stored documents.

## Agent integration

The same release is copied into each selected project target.

| Agent | Install path | Automatic execution records |
|---|---|:---:|
| OpenCode | `.opencode/skills` | Supported |
| Codex | `.agents/skills` | Planned |
| Claude Code | `.claude/skills` | Planned |

The OpenCode plugin queues only the installed skill ID and version, session ID, timestamp, and fixed privacy flags. It does not read or persist prompts, tool output, source code, environment variables, or credentials. Verification output is displayed locally but is not copied into the execution record.

## The two project configuration files

- `.skillspace/project.yaml` configures technology tags and verification commands for local OpenCode execution records. The path is retained for compatibility with the project's original name.
- `.skillroster/project.yaml` records the team's selected skill IDs and exact versions in the project's own Git repository. It contains no attachment payloads.

Commands in `.skillspace/project.yaml` execute with the current user's privileges. Any collaborator who can change the tracked file can change those commands. Review the diff before pulling or committing; SkillRoster does not sandbox them.

## Authorization and security boundary

- The remote Git repository controls who can read and write team data.
- Roster roles such as `owner` and `member` are operational metadata, not an authorization layer.
- The dashboard is an unauthenticated local client. A remote deployment needs an organizational authentication proxy and network restrictions.
- Published skills, included attachments, and project verification commands are trusted content that the team must review.
- Privacy flags constrain conforming record formats; they do not protect against a locally modified plugin.

## Extension points

- Codex and Claude Code adapters that emit the same local queue format
- alternative dashboards and analysis tools that consume the JSON Schemas
- internal Git hosting with standard clone, pull, and push behavior
- an authenticated organization gateway that leaves the registry format unchanged
- personal, team, and project memory with evaluation, permissions, linking, archival, and retrieval

See [Registry format](REGISTRY_FORMAT.en.md) for canonical paths and schemas.
