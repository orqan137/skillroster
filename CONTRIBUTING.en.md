# Contributing to SkillRoster

[한국어](CONTRIBUTING.md) · **English**

Bug reports, documentation improvements, agent integrations, and code contributions are welcome. Because SkillRoster writes team data to Git, schema compatibility, path safety, privacy, and recoverable Git operations are core requirements.

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

The dashboard opens at `http://127.0.0.1:3210`. See [Getting started](docs/GETTING_STARTED.en.md) for the full setup. Use an empty temporary remote for Git integration tests; never use a production roster or personal project as a fixture.

## Discuss before implementation

Every pull request must reference an Issue. Discuss scope and security impact before implementing any of the following:

- `v1alpha1` YAML or JSON Schema
- ranking weights or recommendation rules
- collected execution-record fields
- Git hooks, authentication, pull/rebase, or push behavior
- local file access or command-execution permissions

## Verification

Run the complete check before opening a Pull Request:

```bash
pnpm verify
```

Changes to path handling, privacy fields, Git concurrency, ranking, or existing-hook preservation need regression tests. Check frontend changes at desktop, tablet, and mobile widths, including long Windows- and macOS-style paths.

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

Contributions are accepted under the Apache License 2.0. See [Governance](docs/GOVERNANCE.en.md), [Security policy](SECURITY.md), and the [Code of Conduct](CODE_OF_CONDUCT.en.md) for the complete project rules.
