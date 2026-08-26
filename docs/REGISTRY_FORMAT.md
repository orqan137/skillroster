# Registry format (`skillspace.dev/v1alpha1`)

The registry is a normal Git worktree. Canonical registry documents are validated against the JSON Schemas committed under `schemas/`.

```text
skillspace.yaml
members/<member>.yaml
skills/<owner>/<skill>/SKILL.md
skills/<owner>/<skill>/skill.yaml
releases/<owner>/<skill>/<version>/SKILL.md
releases/<owner>/<skill>/<version>/attachments/*  # explicit opt-in only
reviews/<owner>/<skill>/<version>/<reviewer>.yaml
evidence/<yyyy>/<mm>/<event>.yaml
projects/<project>/project.yaml
projects/<project>/skillset.yaml
schemas/*.schema.json
```

## Immutability and identity

- `skills/` contains the current published version for discovery and display.
- `releases/` is append-only by convention; publishing an existing owner/name/version is rejected.
- A review is uniquely identified by skill version and reviewer. Skill owners may leave a clearly labelled self-review; ranking gives it 35% of a peer review's weight.
- Evidence event IDs are generated locally and reused on retry, so a repeated flush overwrites the same logical file instead of inventing a second run.
- All slugs use lowercase letters, digits, and single hyphen separators.
- `Skill.spec.references` stores user-entered labels and locations. `included: true` means the user explicitly copied that one file into `attachments/`; all other references remain location-only.
- `Project.spec.repository` points to the project Git remote. The remote receives `.skillroster/project.yaml`, which lists the selected skill IDs and versions but contains no referenced file payload.

## Evidence fields

| Field | Meaning |
|---|---|
| `skill`, `version` | Exact released skill used by OpenCode |
| `member`, `project` | Actor and declared project context |
| `sessionId` | OpenCode session correlation ID; not a prompt |
| `status` | `used`, `verified`, `failed`, or `co-used` |
| `changedFiles` | Unique paths in the accepted commit; contents are absent |
| `verificationCommand` | Explicit project command names, not their output |
| `verificationPassed` | Boolean result when commands exist |
| `acceptedCommit` | Git commit associated with the run |
| `coUsedSkills` | Other installed skills loaded in the same session |
| `privacy` | Schema-enforced `promptStored: false`, `sourceStored: false` |

The source of truth is `packages/schemas/schemas`. Consumers should reject a document with an unknown `apiVersion`, `kind`, or extra field.

## Canonical documents and published files

Only the exact YAML paths in the tree above are registry documents. A skill publication copies `SKILL.md` plus files explicitly marked for inclusion into its current and immutable release locations. Neighboring scripts, source code, credentials, and business documents stay in their original local or organizational storage.

When loading a snapshot, SkillRoster checks schema validity, path-to-ID consistency, duplicate IDs, member ownership, review/project references, project skill sets, release existence, and evidence references. An invalid canonical document stops the snapshot with its path instead of silently returning partial data.

## Git transaction and recovery

Dashboard writes use one serialized transaction per local clone:

1. Require a clean managed worktree and pull the latest remote state.
2. Apply the requested files and validate the complete registry snapshot.
3. Commit and push the result.
4. If any step fails, restore the pre-transaction revision and remove only files created by that failed transaction.

Do not edit the managed clone while the dashboard is running. If `GIT_WORKTREE_DIRTY` appears, inspect and commit or discard that manual change in Git before retrying. Authentication failures use the operating system's Git credential helper; SkillRoster does not store Git tokens.

Published `SKILL.md` files reject symbolic links and files over 2 MB. Included attachments also reject symbolic links, credential-like names, files over 2 MB, more than 10 files, or more than 10 MB total. Location-only references are not read. Project repositories receive the selected skill IDs and versions, not attachment contents.
