# Contributing to SkillRoster

[한국어](CONTRIBUTING.md) · **English**

Bug reports, documentation fixes, agent adapters, and code contributions are welcome. SkillRoster uses a team Git repository as its database, so schema compatibility, path safety, privacy, and recoverable Git operations are core product requirements.

## Development setup

Requirements: Node.js 22+, pnpm 11+, and Git.

```bash
git clone https://github.com/orqan137/skillroster.git
cd skillroster
corepack enable
pnpm install
pnpm verify
pnpm dev
```

The dashboard opens at `http://127.0.0.1:3210`. Use an empty temporary remote for Git integration tests. Never use a production roster or a personal project as a test fixture.

## Discuss before implementation

Open an Issue before changing any of the following:

- `v1alpha1` YAML or JSON Schema
- ranking weights or recommendation rules
- collected execution-record fields
- Git hooks, authentication, pull/rebase, or push behavior
- local file access or command-execution permissions

Small UI fixes, typos, and test improvements may go directly to a Pull Request.

## Verification

Run the complete check before opening a Pull Request:

```bash
pnpm verify
```

Changes to path handling, privacy fields, Git concurrency, ranking, or hook preservation need regression tests. Frontend changes should also be checked with Windows and macOS-style paths and at desktop, tablet, and mobile widths.

## Git and code rules

- Keep TypeScript strict mode and the existing package boundaries.
- Registry writes must use `pull → mutate → validate all documents → commit → push`.
- Never put prompts, source code, environment variables, credentials, or private repository data in logs and fixtures.
- Create an Issue first and name the branch after it, for example `feat/#123-short-description`.
- Link the same Issue from the Pull Request with `Closes #123` or `Refs #123`.
- Do not push directly to `main`; squash-merge a Pull Request after CI passes.
- Do not commit generated `dist`, personal `.env`, or `.skillspace-cache` content.

## Pull Request description

Include:

1. the user-visible outcome;
2. the selected design and relevant alternatives;
3. the verification commands you ran;
4. screenshots for UI changes or migration notes for registry-format changes.

Contributions are accepted under the Apache License 2.0. See [Governance](docs/GOVERNANCE.md), [Security policy](SECURITY.md), and the [Code of Conduct](CODE_OF_CONDUCT.md) for the complete project rules.
