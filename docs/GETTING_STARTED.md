# SkillRoster 시작하기

**한국어** · [English](GETTING_STARTED.en.md)

이 문서는 데모 실행부터 실제 팀 Git 저장소 연결, CLI 사용과 프로젝트 설치까지 설명합니다.

## 준비 사항

- Node.js 22 이상
- pnpm 11 이상
- Git
- 실제 로스터를 만들 때 사용할 빈 원격 Git 저장소와 쓰기 권한

Windows에서는 PowerShell, macOS와 Linux에서는 Terminal에서 같은 명령을 사용할 수 있습니다. 사용자 홈과 기본 경로는 Node.js의 운영체제 API로 계산하므로 특정 운영체제의 절대 경로를 코드에 고정하지 않습니다.

## 먼저 데모 실행

```bash
git clone https://github.com/orqan137/skillroster.git
cd skillroster
corepack enable
pnpm install
pnpm demo
```

`http://127.0.0.1:3211`에서 샘플 로스터가 열립니다. 외부 Git 계정이나 토큰은 필요하지 않습니다. 데모는 별도 임시 Git 저장소와 `examples/skills`만 사용하며 사용자의 실제 스킬 폴더를 탐색하지 않습니다.

## 실제 로스터 실행

```bash
corepack enable
pnpm install
pnpm dev
```

브라우저에서 `http://127.0.0.1:3210`을 엽니다.

### 팀장이 새 로스터 만들기

1. GitHub, GitLab, Gitea 또는 사내 Git에 빈 저장소를 만듭니다.
2. 첫 화면에서 `새 로스터 만들기`를 선택합니다.
3. 팀 이름, 팀 ID, 관리자 정보와 원격 Git 주소를 입력합니다.
4. 쓰기 권한 확인이 끝나면 SkillRoster가 폴더와 스키마를 만들고 첫 commit을 push합니다.

원격 저장소는 README, 라이선스, `.gitignore` 없이 완전히 빈 상태로 준비하는 것이 가장 안전합니다.

### 팀원이 기존 로스터에 참여하기

1. 첫 화면에서 `기존 로스터 들어가기`를 선택합니다.
2. 팀장이 초기화한 원격 Git 주소와 로컬 저장 경로를 입력합니다.
3. 이름, 이메일과 사용자 ID를 등록합니다.
4. SkillRoster가 저장소를 clone하고 팀원 문서를 commit·push합니다.

두 과정 모두 clone과 push 권한이 필요합니다.

## Git 인증

SkillRoster는 비밀번호나 접근 토큰을 따로 저장하지 않습니다. 현재 컴퓨터의 Git Credential Manager, macOS Keychain 또는 SSH Agent를 그대로 사용합니다. 원격 주소를 입력하면 `git push --dry-run`으로 쓰기 권한을 먼저 확인합니다.

GitHub CLI를 사용하는 경우:

```bash
gh auth login
```

SSH 연결을 확인하는 경우:

```bash
ssh -T git@github.com
```

권한 확인이 실패하면 해당 저장소에 현재 계정의 쓰기 권한이 있는지, HTTPS 토큰이나 SSH 키가 만료되지 않았는지 확인합니다.

## 로컬 스킬 경로 연결

기본 탐색 경로는 다음과 같습니다.

| 도구 | 기본 경로 |
|---|---|
| Codex | `~/.codex/skills` |
| OpenCode | `~/.config/opencode/skills` |
| Claude Code | `~/.claude/skills` |
| Agent Skills 공통 경로 | `~/.agents/skills` |

프로젝트 전용 `.opencode/skills`, `.claude/skills`, `.agents/skills`도 직접 추가할 수 있습니다. 탐색기는 선택한 폴더 아래에서 `SKILL.md`를 최대 4단계까지 찾고 이름과 설명만 읽습니다.

스킬을 팀에 공유하면 `SKILL.md`만 기본으로 복사합니다. 관련 자료는 링크나 경로만 남길 수 있습니다. 파일 내용까지 공유하려면 `파일 포함`을 직접 선택해야 하며, 선택하지 않은 파일과 폴더는 복사하지 않습니다.

## 로컬 저장 위치

팀 Git 저장소는 기본적으로 다음 경로에 clone됩니다.

```text
~/.skillspace/teams/<team>
```

클라이언트 연결 정보는 다음 파일에 저장됩니다.

```text
~/.skillspace/config.yaml
```

`.skillspace`는 초기 개발명과 기존 저장 형식의 호환성을 위해 유지하는 내부 경로입니다. 사용자 화면과 제품 이름은 SkillRoster를 사용합니다. 프로젝트 저장소에 공유되는 스킬 구성은 `.skillroster/project.yaml`에 기록됩니다.

## CLI 빌드

```bash
pnpm --filter @skillspace/cli build
node apps/cli/dist/index.cjs --help
```

빌드 과정은 내부 workspace 모듈을 CLI 파일에 함께 묶고, 완성된 진입점의 버전 명령을 다시 실행합니다.

현재 CLI는 저장소 소스에서 실행하는 개발자용 배포물입니다. `npx skillroster`와 독립 실행 파일은 다음 릴리스 범위입니다.

## CLI로 로스터 만들기

팀장:

```bash
pnpm skillroster team init \
  --name backend \
  --display-name "백엔드 팀" \
  --owner hong \
  --remote git@github.com:your-org/backend-skillroster.git
```

팀원:

```bash
pnpm skillroster team join git@github.com:your-org/backend-skillroster.git \
  --member kim \
  --display-name "김개발"
```

## 스킬 공유와 프로젝트 구성

```bash
pnpm skillroster publish ./my-skill --version 1.0.0 --tags typescript,api

cd my-project
pnpm --dir ../skillroster skillroster project init --name checkout-api
pnpm --dir ../skillroster skillroster project add hong/api-contract-check
pnpm --dir ../skillroster skillroster sync --target opencode codex claude
```

`sync`는 선택한 버전을 다음 경로에 설치합니다.

- OpenCode: `.opencode/skills`
- Codex: `.agents/skills`
- Claude Code: `.claude/skills`

자동 실행 기록은 현재 OpenCode에서만 지원합니다.

## OpenCode 실행 기록 연동

`project init`은 다음 파일을 설치합니다.

- `.opencode/plugins/skillspace.js`: OpenCode의 스킬 사용 이벤트 기록
- `.git/hooks/post-commit`: commit 뒤 실행 기록 반영
- `.skillspace/project.yaml`: 프로젝트 태그와 검사 명령

프로젝트 검사 명령은 현재 사용자의 권한으로 실행됩니다. 프로젝트 저장소에서 이 파일이 바뀌었다면 commit 전에 내용을 확인해야 합니다.

## 대시보드 실행

CLI로 연결을 끝낸 뒤 다음 명령으로 대시보드를 엽니다.

```bash
pnpm skillroster dashboard
```

기본 주소는 `http://127.0.0.1:3210`입니다.

## 프로덕션 빌드

```bash
pnpm build
pnpm start
```

## Docker

Docker Compose는 대시보드를 localhost에만 연결합니다.

macOS·Linux:

```bash
export SKILLSPACE_REGISTRY_HOST=/absolute/path/to/your/team-clone
export SKILLSPACE_MEMBER=kim
docker compose up --build
```

Windows PowerShell:

```powershell
$env:SKILLSPACE_REGISTRY_HOST = "C:\path\to\team-clone"
$env:SKILLSPACE_MEMBER = "kim"
docker compose up --build
```

## 문제가 생겼을 때

- `GIT_AUTH_REQUIRED`: Git 인증과 원격 저장소 쓰기 권한 확인
- `GIT_WORKTREE_DIRTY`: 관리 중인 clone의 수동 변경을 commit하거나 되돌린 뒤 재시도
- 스킬이 보이지 않음: 설정에서 로컬 스킬 경로와 `SKILL.md` 위치 확인
- 원격 변경이 보이지 않음: 설정에서 `Git 변경 가져오기` 실행
- 설치 경로 오류: 실제 프로젝트 폴더와 선택한 도구 확인

저장 형식과 복구 원칙은 [레지스트리 저장 형식](REGISTRY_FORMAT.md), 보안상 주의할 점은 [보안 정책](../SECURITY.md)에서 확인할 수 있습니다.
