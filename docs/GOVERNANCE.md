# 프로젝트 운영과 Git workflow

SkillRoster는 작은 유지관리자 그룹에서도 변경 이유와 품질 근거가 남도록 GitHub Flow를 사용함.

## 변경 흐름

1. 버그·기능·설계 변경을 Issue로 정의하고 관찰 가능한 완료 조건 작성
2. `main`에서 같은 Issue 번호를 포함한 짧은 수명의 branch 생성
3. 첫 변경부터 Draft PR을 열어 진행 상황과 설계 판단 공유
4. 테스트와 문서를 함께 변경하고 PR 본문에 `Closes #번호` 연결
5. PR policy, 3개 OS CI, CODEOWNERS 검토와 대화 해결 후 squash merge
6. 사용자에게 의미 있는 변경은 CHANGELOG와 semantic version tag로 배포

| 변경 | branch 예시 | PR 제목 예시 |
|---|---|---|
| 기능 | `feat/#123-local-demo` | `feat(cli): add credential-free demo` |
| 버그 | `fix/#124-review-parser` | `fix(core): split comma-separated tags` |
| 문서 | `docs/#125-registry-guide` | `docs: explain registry recovery` |
| 유지보수 | `chore/#126-dependencies` | `chore(deps): update dependencies` |

branch의 `#번호`와 PR 본문의 Issue 번호가 다르면 자동 policy 검사가 실패함. Dependabot branch만 관리형 이름을 허용함. `main`은 항상 배포 가능한 상태를 유지하며 직접 push, 강제 push와 branch 삭제를 금지함. 필수 검사는 Linux·Windows·macOS의 `Verify`, Conventional title, Issue 연결 정책임.

## PR 상태와 크기

- 구현을 시작하면 Draft PR로 선택한 접근, 미해결 질문, 예상 영향 공개
- 리뷰 가능한 PR은 사용자 결과 하나를 중심으로 구성하고 구조 변경과 기능 변경을 가능하면 분리
- UI 변경은 전후 이미지, registry 변경은 YAML 예시와 migration/rollback 방법 첨부
- 보안·privacy·license 체크리스트에서 해당하지 않는 항목도 이유 기록
- 변경 경로는 `area: web`, `area: cli`, `area: git` 등의 label로 자동 분류

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

`vX.Y.Z` tag는 root `package.json` version과 같아야 함. tag push 시 전체 `pnpm verify`를 다시 실행하고 통과한 commit만 GitHub Release로 자동 발행함. GitHub의 generated notes는 PR label을 기준으로 기능·수정·문서·운영 변경을 분류함. 실험 형식은 `v1alpha1`처럼 명시하고 안정화 전에 migration 문서를 준비함.

선택 배경과 GAYADI-Android workflow 비교는 [ADR-0001](decisions/0001-issue-linked-github-flow.md)에 기록함.
