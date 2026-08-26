# Security policy

## Supported version

The current `main` branch and latest tagged release receive security fixes during the hackathon MVP phase.

## Reporting

Do not open a public issue for a suspected vulnerability involving credential exposure, path traversal, command execution, or cross-team data disclosure. Contact the maintainers privately through the security advisory feature of the hosting repository.

Include the affected version, reproduction steps, impact, and any suggested mitigation. Do not include real credentials or private source code.

## Security boundaries

- A SkillRoster team is protected by its Git remote access controls.
- The dashboard is a local client and has no built-in multi-user authentication. It binds to `127.0.0.1` by default. Put an authenticated reverse proxy in front of any remote deployment.
- Project verification commands are trusted configuration authored by members who can modify the registry. They execute locally with the current user's permissions.
- Published skills are executable agent instructions. Review their Git diff before adding them to a project loadout.
- Pending evidence and the installed-skill manifest are ignored local files.
- Evidence JSON Schema forbids prompt or source storage but cannot prevent a malicious fork or modified plugin from collecting data.

## Maintainer checklist

- Never accept an untrusted path without checking it remains inside the registry or project root.
- Preserve existing Git hooks when installing the managed SkillRoster block.
- Never log verification output, environment variables, prompts, or source content into the registry.
- Treat OpenCode plugin API updates as security-sensitive dependency changes.
