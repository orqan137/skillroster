# Roadmap

[한국어](ROADMAP.md) · **English**

This roadmap separates released work, unreleased work on `main`, and future plans. Items are tracked through Issues and Releases rather than treated as presentation promises.

## v0.1.0 · Initial public release

Released August 26, 2026.

- Create or join a Git-backed team roster
- Discover and publish local skills
- Collect author and peer reviews and calculate a team ranking
- Recommend by project technology tags and install for OpenCode
- Validate public YAML and JSON Schemas as a full snapshot
- Recoverable pull, rebase, commit, and push transactions
- React dashboard, CLI, Docker, and Windows/macOS/Linux CI
- Apache-2.0 distribution and dependency-license checks

## main · Unreleased

- Select multiple install targets across OpenCode, Codex, and Claude Code
- Write `.skillroster/project.yaml` to a project's own Git repository
- Edit existing reviews and project remote URLs
- Bundle CLI workspace modules and smoke-test the compiled entry point
- Separate local reads from explicit remote pulls
- Improve desktop, tablet, mobile, and keyboard-focus behavior
- Add paired Korean and English setup, architecture, and format documentation

These changes do not have a release tag yet. Before release, they require a clean `pnpm verify` run and another real-remote integration check.

## v0.2.0 · Installation and team operations

- [npm-executable CLI and standalone binaries](https://github.com/orqan137/skillroster/issues/6)
- [Codex and Claude Code automatic execution-record adapters](https://github.com/orqan137/skillroster/issues/7)
- [GitHub and GitLab organization identity with project-level authorization](https://github.com/orqan137/skillroster/issues/8)
- roster migration, archival, and restore commands
- accessibility audit and smoother external-contributor setup
- evaluated and permissioned personal, team, and project memory with linking, archival, and retrieval

## v1.0.0 · Stable format

- compatibility policy informed by `v1alpha1` usage
- signed skill releases and provenance verification
- merge-conflict and ranking-performance validation for larger teams
- backup and audit guidance for long-running internal deployments

Each item begins with Issue acceptance criteria, collection scope, and security impact. Unfinished work is not presented as a current feature.
