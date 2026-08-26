# 프로젝트 운영과 Git workflow

SkillRoster는 작은 유지관리자 그룹에서도 변경 이유와 품질 근거가 남도록 GitHub Flow를 사용함.

## 변경 흐름

1. 버그·기능·설계 변경을 Issue로 정의
2. `main`에서 짧은 수명의 branch 생성
3. 테스트와 문서를 함께 변경
4. Conventional Commit 제목으로 Pull Request 생성
5. CI 통과, CODEOWNERS 검토, 대화 해결 후 squash merge
6. 사용자에게 의미 있는 변경은 CHANGELOG와 semantic version tag로 배포

| 변경 | branch 예시 | PR 제목 예시 |
|---|---|---|
| 기능 | `feat/local-demo` | `feat(cli): add credential-free demo` |
| 버그 | `fix/review-parser` | `fix(core): split comma-separated tags` |
| 문서 | `docs/registry-guide` | `docs: explain registry recovery` |
| 유지보수 | `chore/dependencies` | `chore: update development dependencies` |

`main`은 항상 배포 가능한 상태를 유지함. 직접 push 대신 PR을 사용하고, 강제 push와 branch 삭제를 금지함. CI 필수 항목은 Linux·Windows·macOS의 `Verify`와 PR 제목 검사임.

## 의사결정 기준

- 공개 `v1alpha1` 문서 형식, 개인정보 필드, 랭킹 가중치, Git 쓰기 순서 변경은 먼저 Issue에서 논의
- 큰 구조 변경은 `docs/decisions/`의 ADR로 선택지·결과·되돌리는 방법 기록
- 기능 요청은 해결하려는 팀 문제, 최소 재현, 개인정보 영향을 포함
- 보안 취약점은 공개 Issue 대신 SECURITY.md의 비공개 절차 사용

## 역할

- **Maintainer**: roadmap, release, 최종 merge와 보안 대응
- **Code owner**: 담당 영역의 설계·테스트 품질 검토
- **Contributor**: Issue, 문서, 코드와 검증 결과 제안
- **User**: 버그 재현과 실제 팀 환경 피드백 제공

현재 단일 maintainer 단계에서는 GitHub가 자기 PR 승인을 허용하지 않으므로 CI와 공개 PR 기록을 필수 증거로 사용함. 기여자가 늘면 보호 규칙의 최소 승인 수를 1명 이상으로 올림.

## Release 정책

- `MAJOR`: 저장 형식 또는 CLI의 호환되지 않는 변경
- `MINOR`: 호환되는 기능과 adapter 추가
- `PATCH`: 버그·문서·내부 품질 개선

릴리스마다 annotated tag, GitHub Release, CHANGELOG를 함께 갱신함. 실험 형식은 `v1alpha1`처럼 명시하고 안정화 전에 migration 문서를 준비함.
