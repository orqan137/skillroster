# Open-source components and license checks

[한국어](OPEN_SOURCE_COMPLIANCE.md) · **English**

SkillRoster is distributed under Apache License 2.0. Dependencies are evaluated for function, maintainability, self-hosted operation, and license compatibility.

## Major components

| Component | Use | License |
|---|---|---|
| React, React DOM, React Router | Local dashboard and navigation | MIT |
| Vite, TypeScript, tsx, tsup | Development server, type checks, and builds | MIT / Apache-2.0 |
| Vitest | Unit and integration regression tests | MIT |
| simple-git | Clone, pull, rebase, commit, and push transactions | MIT |
| Ajv, ajv-formats | Public JSON Schema validation | MIT |
| yaml, gray-matter | Registry YAML and `SKILL.md` front matter | ISC / MIT |
| Commander | Cross-platform CLI | MIT |
| Lucide React | UI icons | ISC |
| Pretendard | Korean web font | SIL OFL 1.1 |

Git runs as an external program and is not bundled with SkillRoster. The OpenCode plugin uses a public hook but does not redistribute OpenCode source or binaries.

## Automated policy

```bash
pnpm license:check
```

The check scans production dependencies from the pnpm lockfile. The current allowlist is `Apache-2.0`, `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, and `OFL-1.1`. CI fails on unidentified licenses or licenses that require a separate copyleft-obligation review.

The check also requires:

- `/LICENSE`: full Apache-2.0 text for SkillRoster;
- `/NOTICE`: project and bundled-asset notices;
- `/apps/web/public/Pretendard-LICENSE.txt`: OFL text for the distributed font.

A Pull Request that adds a dependency must document its role, alternatives considered, license, and `pnpm license:check` result. Allowlist changes require a separate compatibility review.

## Compatibility conclusion

The current permissively licensed production dependencies and Pretendard's OFL terms are compatible with distribution in this Apache-2.0 project. The font notice remains with the web asset and in NOTICE, and the project does not claim endorsement by the original authors.
