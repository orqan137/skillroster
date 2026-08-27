# 프로젝트 운영과 Git 작업 흐름

**한국어** · [English](GOVERNANCE.en.md)

SkillRoster는 인원이 적어도 변경 이유와 검토 결과가 남도록 GitHub Flow를 사용한다.

## 변경 흐름

1. 버그·기능·설계 변경을 Issue로 만들고 확인 가능한 완료 조건 작성
2. `main`에서 같은 Issue 번호가 들어간 짧은 작업 브랜치 생성
3. 첫 변경부터 Draft Pull Request를 열어 진행 상황과 설계 판단 공유
4. 테스트와 문서를 함께 바꾸고 본문에 `Closes #번호` 연결
5. Pull Request 정책, 3개 운영체제 CI, CODEOWNERS 검토와 대화 해결 후 squash merge
6. 사용자에게 영향을 주는 변경은 CHANGELOG와 semantic version 태그로 배포

| 변경 | branch 예시 | PR 제목 예시 |
|---|---|---|
| 기능 | `feat/#123-local-demo` | `feat(cli): add credential-free demo` |
| 버그 | `fix/#124-review-parser` | `fix(core): split comma-separated tags` |
| 문서 | `docs/#125-registry-guide` | `docs: explain registry recovery` |
| 유지보수 | `chore/#126-dependencies` | `chore(deps): update dependencies` |

브랜치의 `#번호`와 Pull Request 본문의 Issue 번호가 다르면 자동 정책 검사가 실패한다. Dependabot 브랜치만 관리형 이름을 허용한다. `main`은 항상 배포 가능한 상태를 유지하며 직접 push와 강제 push를 막는다. 필수 검사는 Linux·Windows·macOS의 `Verify`, Conventional Commit 제목, Issue 연결 정책이다.

## PR 상태와 크기

- 구현을 시작하면 Draft Pull Request에 선택한 방식, 남은 질문, 예상 영향 기록
- 검토할 수 있는 크기는 사용자 결과 하나를 기준으로 하고 구조 변경과 기능 변경은 가능한 한 분리
- 화면 변경은 전후 이미지, 저장 형식 변경은 YAML 예시와 이전·복구 방법 첨부
- 보안·개인정보·라이선스 점검에서 해당하지 않는 항목도 이유 기록
- 변경 경로는 `area: web`, `area: cli`, `area: git` 등의 label로 자동 분류

## 의사결정 기준

- 공개 `v1alpha1` 문서 형식, 개인정보 필드, 랭킹 가중치, Git 쓰기 순서 변경은 먼저 Issue에서 논의
- 큰 구조 변경은 `docs/decisions/`의 ADR로 선택지·결과·되돌리는 방법 기록
- 기능 요청에는 해결하려는 팀 문제, 최소 재현 방법, 개인정보 영향 포함
- 보안 취약점은 공개 Issue 대신 SECURITY.md의 비공개 절차 사용

## 역할

- **Maintainer**: 개발 계획, 배포, 최종 merge와 보안 대응
- **Code owner**: 담당 영역의 설계·테스트 품질 검토
- **Contributor**: Issue, 문서, 코드와 검증 결과 제안
- **User**: 버그 재현과 실제 팀 환경 피드백 제공

현재는 유지관리자가 한 명이므로 CI 결과와 공개 Pull Request 기록을 필수 검토 자료로 사용한다. 유지관리자가 늘면 보호 규칙의 최소 승인 수를 1명 이상으로 올린다.

## Release 정책

- `MAJOR`: 저장 형식 또는 CLI의 호환되지 않는 변경
- `MINOR`: 호환되는 기능과 adapter 추가
- `PATCH`: 버그·문서·내부 품질 개선

`vX.Y.Z` 태그는 루트 `package.json` 버전과 같아야 한다. 태그를 push하면 `pnpm verify`를 다시 실행하고 통과한 commit만 GitHub Release로 발행한다. 릴리스 노트는 Pull Request label에 따라 기능·수정·문서·운영 변경을 나눈다. 실험 형식은 `v1alpha1`처럼 표시하고 안정화 전에 이전 문서를 준비한다.

선택 배경과 GAYADI-Android 작업 흐름 비교는 [ADR-0001](decisions/0001-issue-linked-github-flow.md)에 기록한다.
