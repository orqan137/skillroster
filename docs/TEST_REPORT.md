# 기능 및 제출 준비 점검표

점검일: 2026-08-26  
대상: `fix/#15-responsive-demo-readme` → `main`

## 자동 검증

| 구분 | 명령 | 결과 |
|---|---|---|
| 정적 분석 | `pnpm lint` | 경고·오류 0건 |
| 타입 | `pnpm typecheck` | 6개 workspace 통과 |
| 단위·통합 테스트 | `pnpm test` | 7개 테스트 파일, 10개 테스트 통과 |
| 제출 전 전체 검증 | `pnpm verify` | lint, license, typecheck, test:run, build 일괄 확인 |
| 운영체제 CI | GitHub Actions | Ubuntu, macOS, Windows 병렬 실행 |
| Docker | GitHub Actions | 이미지 build 확인. 로컬 점검 환경에는 Docker CLI 없음 |

## 실제 사용자 흐름

| 흐름 | 확인 내용 | 결과 |
|---|---|---|
| 처음 사용 | 새 로스터 만들기 / 기존 로스터 들어가기 분리 | 통과 |
| 데모 격리 | 임시 Git, 별도 sources 설정, `examples/skills`만 탐색 | 통과 |
| 개요 | 3명·3스킬·2프로젝트·4평가 집계 | 통과 |
| 스킬 | 공유/로컬 탭, 검색, 상세 이동, 작성자·동료 평가 구분 | 통과 |
| 프로젝트 생성 | 한글 표시 이름 + 영문 ID + 복수 태그 + 추천 스킬 2개 | 통과 |
| Git CRUD | 프로젝트와 skillset 생성 후 실제 상세 페이지 이동 | 통과 |
| 프로젝트 연결 | 태그 일치 추천, 평가 순위, 연결/해제 상태 표시 | 통과 |
| 설정 | Git 연결·사용자·로컬 경로 읽기 모드와 영역별 수정 | 통과 |

실제 조작 결과는 [README의 전체 화면](../README.md#실제-동작-화면)에 순서대로 보관함.

## 반응형 및 접근성

- 1024px, 768px, 390px에서 개요·스킬·프로젝트·팀원·설정·프로젝트 상세의 수평 넘침 0건.
- 1120px 이하에서 아이콘 중심 좌측 탐색, 760px 이하에서 모바일 상단 탐색 적용.
- 390px 프로젝트 생성 모달 너비 342px, 문서 너비 390px 유지.
- 탭은 `tablist`/`tab`/`tabpanel`, 평점은 `fieldset`, 진행률은 `progressbar` 의미 구조 사용.
- 모달은 바깥 영역 클릭, 닫기 버튼, Escape로 닫기 가능.

## 심사 기준 연결

공식 1차 30점·2차 70점의 세부 항목은 [Contest scorecard](CONTEST_SCORECARD.md)에 저장소 증거와 함께 연결함. 구현하지 않은 SSO·세부 RBAC·npm 전역 배포는 완료 기능으로 주장하지 않음.
