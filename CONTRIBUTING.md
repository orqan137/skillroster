# SkillRoster에 기여하기

**한국어** · [English](CONTRIBUTING.en.md)

버그 제보, 문서 개선, 새로운 에이전트 연동과 코드 기여를 환영합니다. SkillRoster는 팀 Git 저장소에 자료를 기록하므로 저장 형식, 경로 안전성, 개인정보 범위, Git 복구 가능성을 중요하게 다룹니다.

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

대시보드는 `http://127.0.0.1:3210`에서 열립니다. 자세한 실행 방법은 [시작하기](docs/GETTING_STARTED.md)를 참고해 주세요. Git 연동을 시험할 때는 빈 임시 저장소를 사용하고 개인 프로젝트나 운영 중인 로스터는 테스트 자료로 쓰지 마세요.

## 변경 제안

모든 Pull Request는 먼저 Issue를 만들고 연결해야 합니다. 특히 다음 변경은 구현 전에 범위와 보안 영향을 먼저 논의해 주세요.

- `v1alpha1` YAML·JSON Schema 변경
- 랭킹 가중치 또는 추천 규칙 변경
- 수집되는 실행 기록 필드 추가
- Git hook, 인증, push/rebase 흐름 변경
- 새로운 로컬 파일 접근 또는 명령 실행 권한 추가

## 검증

Pull Request를 열기 전에 전체 검사를 실행해 주세요.

```bash
pnpm verify
```

경로 처리, 개인정보 필드, Git 동시성, 순위 계산, 기존 훅 보존 방식을 바꿨다면 회귀 테스트도 추가해 주세요. 화면을 바꿨다면 데스크톱·태블릿·모바일 너비와 Windows·macOS 형식의 긴 경로도 확인해 주세요.

## 코드와 커밋

- TypeScript strict 모드와 기존 패키지 경계를 유지해 주세요.
- 팀 Git 쓰기는 `pull → 변경 → 전체 문서 검사 → commit → push` 순서를 거쳐야 합니다.
- 프롬프트, 소스 코드, 환경 변수, 인증정보를 로그나 테스트 자료에 넣지 마세요.
- 브랜치는 `feat/#123-short-description`처럼 변경 유형과 같은 Issue 번호를 사용해 주세요.
- Pull Request 본문에는 `Closes #123` 또는 `Refs #123`으로 같은 Issue를 연결해 주세요.
- `main`에 직접 push하지 말고 CI를 통과한 Pull Request를 squash merge해 주세요.
- 생성된 `dist`, 개인 `.env`, `.skillspace-cache`는 커밋하지 마세요.

## Pull Request 설명

다음 내용을 포함해 주세요.

1. 사용자에게 달라지는 결과
2. 선택한 방식과 검토한 대안
3. 실행한 검사와 결과
4. 화면 변경 이미지 또는 저장 형식 이전 방법

기여한 코드는 Apache License 2.0으로 배포되는 데 동의한 것으로 간주합니다.

역할, 브랜치 보호, 배포 규칙은 [프로젝트 운영](docs/GOVERNANCE.md)을 참고해 주세요.
