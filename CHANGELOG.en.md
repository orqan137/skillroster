# Changelog

[한국어](CHANGELOG.md) · **English**

This file records notable changes. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Allow projects to select multiple installation targets across OpenCode, Codex, and Claude Code
- Read immediately from the local clone and move remote pulls to an explicit Settings action
- Make initial rankings conservative when a skill has only an author review or no execution history
- Support editing existing reviews and project Git URLs without duplicate composition commits
- Improve modal focus trapping, outside-click dismissal, and responsive layouts
- Refine Korean UI copy, logo alignment, and project and skill management states

### Fixed

- Bundle internal workspace modules into the CLI and smoke-test the compiled entry point so it no longer exits on TypeScript source imports

### Documentation

- Add English contribution guidance and record SBOM and AI-assistance scope for the contest report
- Add paired Korean and English setup, architecture, registry-format, governance, roadmap, and license documents

### Planned

- npm-executable CLI distribution
- Codex and Claude Code automatic execution-record adapters
- organization authentication and project-level authorization

## [0.1.0] - 2026-08-26

### Added

- Git-backed team roster initialization and joining
- React and Vite local dashboard
- Local skill discovery, publishing, author reviews, and peer reviews
- Project technology-tag recommendations and OpenCode skill installation
- Public YAML and JSON Schemas
- Recoverable pull, rebase, commit, and push transactions
- GitHub Actions on Windows, macOS, and Linux plus Docker support
