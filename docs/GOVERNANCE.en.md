# Project governance and Git workflow

[한국어](GOVERNANCE.md) · **English**

SkillRoster follows GitHub Flow so that the reason for a change and its review trail remain visible even with a small maintainer group.

## Change flow

1. Open an Issue with an observable acceptance condition.
2. Branch from `main` and include the same Issue number in the branch name.
3. Open a Draft Pull Request with the first change and record design decisions as work progresses.
4. Update tests and documentation with the implementation and link `Closes #number`.
5. Resolve discussion and pass PR policy, CODEOWNERS review, and CI on Linux, Windows, and macOS.
6. Squash-merge, then release user-facing changes through the changelog and a semantic-version tag.

| Change | Branch example | Pull Request title example |
|---|---|---|
| Feature | `feat/#123-local-demo` | `feat(cli): add credential-free demo` |
| Bug | `fix/#124-review-parser` | `fix(core): split comma-separated tags` |
| Documentation | `docs/#125-registry-guide` | `docs: explain registry recovery` |
| Maintenance | `chore/#126-dependencies` | `chore(deps): update dependencies` |

The Issue number in the branch must match the one linked from the Pull Request. Dependabot is the only exception to the managed branch-name rule. Direct and force pushes to `main` are blocked. Required checks cover the three operating systems, Conventional Commit titles, and Issue linkage.

## Pull Request scope

- Record the chosen approach, open questions, and expected impact in a Draft Pull Request.
- Keep a reviewable Pull Request centered on one user-visible outcome.
- Separate structural refactoring from feature work when practical.
- Include before-and-after images for UI changes.
- Include YAML examples plus migration and rollback notes for registry-format changes.
- Explain why a security, privacy, or license checklist item does not apply instead of leaving it blank.

## Decisions

- Discuss public `v1alpha1` formats, privacy fields, ranking weights, and Git write order in an Issue before implementation.
- Record major structural choices in `docs/decisions/` with alternatives, consequences, and rollback notes.
- Feature requests should identify the team problem, a minimal reproduction, and privacy impact.
- Report vulnerabilities through the private process in `SECURITY.md`, not a public Issue.

## Roles

- **Maintainer:** roadmap, releases, final merges, and security response
- **Code owner:** design and test review for an owned area
- **Contributor:** Issues, documentation, code, and verification results
- **User:** reproducible bug reports and feedback from real team use

While the project has one maintainer, CI results and the public Pull Request record are mandatory review evidence. When the maintainer group grows, branch protection will require at least one independent approval.

## Releases

- `MAJOR`: incompatible registry-format or CLI changes
- `MINOR`: compatible features and adapters
- `PATCH`: bug fixes, documentation, and internal quality improvements

A `vX.Y.Z` tag must match the root `package.json` version. Tag pushes rerun `pnpm verify`; only passing commits are published as GitHub Releases. Release notes group changes by Pull Request labels. Experimental formats use an explicit name such as `v1alpha1` and require migration guidance before stabilization.

The rationale and comparison with the GAYADI-Android workflow are recorded in [ADR-0001](decisions/0001-issue-linked-github-flow.md).
