# SkillRoster에 기여하기

버그 제보, 문서 개선, 새로운 에이전트 어댑터와 코드 기여를 환영합니다. SkillRoster는 팀 Git 저장소를 데이터베이스로 사용하므로 파일 형식·경로 안전성·Git 복구 가능성을 일반 UI 변경보다 엄격하게 다룹니다.

## 시작하기

Node.js 22+, pnpm 11+, Git이 필요합니다.

```bash
git clone https://github.com/orqan137/skillroster.git
cd skillroster
corepack enable
pnpm install
pnpm verify
pnpm dev
```

대시보드는 `http://127.0.0.1:3210`에서 실행됩니다. 실제 원격 저장소를 사용하는 테스트와 분리하려면 빈 임시 Git 저장소를 사용하세요. 개인 프로젝트나 운영 로스터를 테스트 fixture로 사용하지 마세요.

## 변경 제안

다음 변경은 구현 전에 Issue에서 설계를 먼저 논의해주세요.

- `v1alpha1` YAML·JSON Schema 변경
- 랭킹 가중치 또는 추천 규칙 변경
- 수집되는 실행 근거 필드 추가
- Git hook, 인증, push/rebase 흐름 변경
- 새로운 로컬 파일 또는 명령 실행 권한 추가

작은 UI 수정, 오탈자와 테스트 보강은 바로 Pull Request를 열어도 됩니다.

## 검증

PR 전에 아래 명령을 모두 실행해주세요.

```bash
pnpm typecheck
pnpm test:run
pnpm build
pnpm license:check
pnpm lint
```

경로 처리, 개인정보 필드, Git 동시성, 랭킹, hook 보존을 변경했다면 해당 회귀 테스트가 필요합니다. 프론트엔드 변경은 Windows와 macOS 경로가 화면을 깨뜨리지 않는지도 확인해주세요.

## 코드와 커밋

- TypeScript strict 모드와 기존 패키지 경계를 유지합니다.
- 레지스트리 쓰기는 `pull → mutate → 전체 검증 → commit → push` 트랜잭션을 통과해야 합니다.
- 프롬프트, 소스 코드, 환경 변수, 인증정보를 로그나 fixture에 넣지 않습니다.
- Conventional Commit 형식의 짧은 커밋 메시지를 권장합니다.
- branch는 `feat/`, `fix/`, `docs/`, `chore/` 중 변경 목적에 맞는 prefix를 사용합니다.
- `main`에 직접 push하지 않고 CI를 통과한 PR을 squash merge합니다.
- 생성된 `dist`, 개인 `.env`, `.skillspace-cache`는 커밋하지 않습니다.

## Pull Request 설명

다음을 포함해주세요.

1. 사용자에게 달라지는 결과
2. 선택한 설계와 고려한 대안
3. 실행한 테스트
4. UI 변경 이미지 또는 저장 형식 migration 여부

기여한 코드는 Apache License 2.0으로 배포되는 데 동의한 것으로 간주합니다.

전체 역할, branch 보호와 release 규칙은 [Governance](docs/GOVERNANCE.md)를 참고하세요.
