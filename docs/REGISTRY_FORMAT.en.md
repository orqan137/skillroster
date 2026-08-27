# Team Git format

[한국어](REGISTRY_FORMAT.md) · **English**

A roster is an ordinary Git worktree. Canonical documents are validated against the JSON Schemas committed under `schemas/`.

The public `apiVersion` remains `skillspace.dev/v1alpha1` for compatibility with the project's original name. The product is now called SkillRoster; any future stable namespace will ship with a documented migration path.

```text
skillspace.yaml
members/<member>.yaml
skills/<owner>/<skill>/SKILL.md
skills/<owner>/<skill>/skill.yaml
releases/<owner>/<skill>/<version>/SKILL.md
releases/<owner>/<skill>/<version>/attachments/*
reviews/<owner>/<skill>/<version>/<reviewer>.yaml
evidence/<yyyy>/<mm>/<event>.yaml
projects/<project>/project.yaml
projects/<project>/skillset.yaml
schemas/*.schema.json
```

## Document roles

- `skills/`: the latest publication used for browsing and current-version display
- `releases/`: immutable snapshots that allow an exact version to be reinstalled
- `reviews/`: one review per reviewer and skill version
- `evidence/`: minimal skill-use and project-verification records
- `projects/`: project metadata and pinned skill IDs and versions
- `schemas/`: public JSON Schemas for independent consumers

## Identity and releases

- An existing `owner/name/version` combination cannot be published again.
- A review is identified by skill version and reviewer. Updating a review replaces that document instead of appending a duplicate.
- Authors may review their own skill. The UI labels it as an author review, and ranking assigns it 35% of a peer review's weight.
- An execution-record ID is generated once and reused on retry, preventing duplicate logical runs.
- Slugs allow lowercase letters, digits, and single hyphen separators.

## References and attachments

`Skill.spec.references` stores a user-provided label and location.

- `included: false`: keep the location only; do not read or copy the target
- `included: true`: copy the one explicitly selected file into the release's `attachments/` directory

Publishing includes `SKILL.md` by default. Unselected scripts, source code, credentials, and business documents remain in their original location.

Published files are subject to these limits:

- no symbolic links;
- no file larger than 2 MB;
- at most 10 attachments and 10 MB in total;
- no credential-like file names.

The project repository's `.skillroster/project.yaml` contains only selected skill IDs and versions, never attachment payloads.

## Execution-record fields

| Field | Meaning |
|---|---|
| `skill`, `version` | Exact release used |
| `member`, `project` | Actor and declared project context |
| `sessionId` | OpenCode correlation ID, not a prompt |
| `status` | `used`, `verified`, `failed`, or `co-used` |
| `changedFiles` | Unique paths in the commit, without file contents |
| `verificationCommand` | Declared command names, without output |
| `verificationPassed` | Result when verification commands exist |
| `acceptedCommit` | Git commit associated with the result |
| `coUsedSkills` | Other installed skills loaded in the same session |
| `privacy` | Fixed to `promptStored: false` and `sourceStored: false` |

Verification commands are read from `.skillspace/project.yaml` and execute with the current user's privileges. Review changes to that tracked file as you would review code.

## Full-snapshot validation

Loading a snapshot checks:

- JSON Schema validity;
- path-to-document-ID consistency;
- duplicate IDs;
- member and skill ownership;
- review, project, and execution-record references;
- existence of every release pinned by a project;
- unknown `apiVersion`, `kind`, or extra fields.

If any canonical document is invalid, loading stops with its path rather than returning a silent partial snapshot.

## Git writes and recovery

The dashboard serializes writes against a local clone:

1. require a clean managed worktree and pull remote changes;
2. write the requested files and validate the full snapshot;
3. commit and push;
4. on failure, restore the previous revision and remove only files created by that attempt.

Avoid editing the managed clone while the dashboard is running. If `GIT_WORKTREE_DIRTY` appears, inspect and commit or discard the manual change before retrying. SkillRoster relies on the operating system's Git credential helper and never stores access tokens.

See [Architecture](ARCHITECTURE.en.md) for the execution and trust boundaries.
