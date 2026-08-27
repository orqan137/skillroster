# Getting started

[한국어](GETTING_STARTED.md) · **English**

This guide covers both the isolated demo and a real team roster.

## Requirements

- Node.js 22 or later
- pnpm 11 through Corepack
- Git
- clone and push access when connecting a remote repository

```bash
git --version
node --version
corepack enable
pnpm --version
```

## Run the isolated demo

```bash
git clone https://github.com/orqan137/skillroster.git
cd skillroster
corepack enable
pnpm install
pnpm demo
```

Open `http://127.0.0.1:3211` if a browser does not open automatically. The demo uses a temporary local Git repository and reads only `examples/skills`.

## Create a real roster in the dashboard

### Team lead

1. Create an empty GitHub, GitLab, Gitea, or internal Git repository.
2. Run `pnpm dev` and open `http://127.0.0.1:3210`.
3. Select **Create roster**.
4. Enter the team name, ID, owner, and remote Git URL.
5. Confirm the write-access check and create the first commit.

### Teammate

1. Ask the team lead for access to the same repository.
2. Run `pnpm dev` and select **Join roster**.
3. Enter the remote URL and your name, email, and member ID.
4. Confirm the document validation and member commit.

SkillRoster uses your existing Git credential helper. It never stores a Git password or token.

```bash
# GitHub CLI
gh auth login

# SSH connection check
ssh -T git@github.com
```

## Local skill discovery

The default locations are:

| Agent | Directory |
|---|---|
| Codex | `~/.codex/skills` |
| OpenCode | `~/.config/opencode/skills` |
| Claude Code | `~/.claude/skills` |
| Agent Skills | `~/.agents/skills` |

You may add a project-local `.opencode/skills`, `.claude/skills`, or `.agents/skills` directory. The scanner looks for `SKILL.md` up to four levels deep and reads only its name and description while browsing.

Publishing includes `SKILL.md` by default. A reference stays as a label and location unless you explicitly choose to copy that file. Neighboring files are not included automatically.

## Local storage

The default team clone lives under `~/.skillspace/teams/<team>`, and client settings are stored in `~/.skillspace/config.yaml`. These `.skillspace` paths and the `skillspace.dev/v1alpha1` schema name are retained for compatibility with the project's original name.

The current product name is SkillRoster. Project repositories use `.skillroster/project.yaml` for their shared skill selection.

## Build the CLI

```bash
pnpm --filter @skillspace/cli build
node apps/cli/dist/index.cjs --help
```

The root command `pnpm skillroster` runs the CLI in development mode.

## Initialize or join from the CLI

```bash
# Team lead
pnpm skillroster team init \
  --name backend \
  --display-name "Backend Team" \
  --owner hong \
  --remote git@github.com:your-org/backend-skillroster.git

# Teammate
pnpm skillroster team join git@github.com:your-org/backend-skillroster.git \
  --member kim \
  --display-name "Kim"
```

## Publish and use a skill

```bash
pnpm skillroster publish ./my-skill --version 1.0.0 --tags typescript,api

cd my-project
pnpm --dir ../skillroster skillroster project init --name checkout-api
pnpm --dir ../skillroster skillroster project add hong/api-contract-check
pnpm --dir ../skillroster skillroster sync --target opencode codex claude
```

Install targets:

- OpenCode: `.opencode/skills`
- Codex and Agent Skills: `.agents/skills`
- Claude Code: `.claude/skills`

`project init` also installs the OpenCode event plugin, a Git `post-commit` hook that preserves an existing hook, and `.skillspace/project.yaml`. Automatic execution records are currently available only for OpenCode.

The verification commands in `.skillspace/project.yaml` execute with the current user's privileges after an accepted commit. Inspect changes to this file before committing or pulling from collaborators.

## Dashboard and production build

```bash
pnpm skillroster dashboard

# Or build and run the web client
pnpm build
pnpm start
```

The default address is `http://127.0.0.1:3210` unless a hostname override is explicitly configured.

## Docker

Docker Compose publishes the dashboard on localhost only.

```bash
export SKILLSPACE_REGISTRY_HOST=/absolute/path/to/team-clone
export SKILLSPACE_MEMBER=kim
docker compose up --build
```

PowerShell:

```powershell
$env:SKILLSPACE_REGISTRY_HOST = "C:\path\to\team-clone"
$env:SKILLSPACE_MEMBER = "kim"
docker compose up --build
```

## Troubleshooting

- **Git authentication fails:** configure Git Credential Manager, Keychain, `gh auth login`, or an SSH agent, then retry.
- **`GIT_WORKTREE_DIRTY`:** inspect and commit or discard the manual change in the managed clone before retrying.
- **No local skills found:** verify that the selected directory contains a `SKILL.md` within four levels.
- **The port is already in use:** stop the conflicting process or choose another supported port.
- **A verification command changed:** review `.skillspace/project.yaml` before allowing the next commit hook to run.

For system boundaries, see [Architecture](ARCHITECTURE.en.md). For canonical paths and schemas, see [Registry format](REGISTRY_FORMAT.en.md).
