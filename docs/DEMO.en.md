# Demo guide

[한국어](DEMO.md) · **English**

## Run without a Git account

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm demo
```

The command creates a sample roster in a temporary Git worktree and opens `http://127.0.0.1:3211`. A healthy demo contains:

- three members;
- three shared skills;
- two projects with two connected skills each;
- four reviews: three peer reviews and one author review;
- two execution records that contain neither prompts nor source code.

The demo uses an isolated `sources.yaml` and scans only `examples/skills`. It does not inspect the user's actual Codex, OpenCode, or Claude Code skill directories.

## Suggested walkthrough

1. **Roster overview:** show member, skill, project, and recent-review counts.
2. **Skill review:** distinguish author and peer feedback and show its ranking effect.
3. **Project setup:** use technology tags and team feedback to pin exact releases.
4. **Agent targets:** show OpenCode, Codex, and Claude Code install destinations.
5. **Git record:** confirm the same change in YAML and commit history.

## Checking a real remote connection

1. Prepare one empty remote for the team roster and another for a project.
2. Use two terminals with different `SKILLSPACE_CONFIG` paths to represent a lead and teammate.
3. Create the roster, refresh GitHub, and show the first commit.
4. Join from the second identity and show the member commit in the remote history.
5. Create a project and inspect `.skillroster/project.yaml` in the project repository.

## Common questions

**How is this different from a public skill marketplace?**  
SkillRoster shows this team's reviews, project adoption, and execution history rather than community-wide popularity. Reviews apply to exact releases.

**Why Git instead of a database?**  
Teams can reuse existing access control, history, review, backup, and recovery practices. The Markdown and YAML remain usable even if SkillRoster disappears.

**Are prompts or source code uploaded?**  
Not by default. The team repository receives published `SKILL.md` files, explicitly included attachments, reviews, and minimal execution records.

**Does a failed verification block a commit?**  
No. It records a failed outcome for later review without blocking the developer's commit.

**Are Codex and Claude Code supported?**  
Yes for discovery, publishing, reviews, project composition, and installation. Automatic execution records are currently OpenCode-only.

## Troubleshooting check

```bash
git status --short
pnpm verify
git log --oneline -5
```

If internet access or GitHub credentials are unavailable, switch to `pnpm demo`. If port 3211 is occupied or the browser does not open, use the address and diagnostic output printed in the terminal.
