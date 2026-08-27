# 개발 계획

**한국어** · [English](ROADMAP.en.md)

이 문서는 발표용 약속이 아니라 Issue와 Release로 확인할 수 있는 개발 순서다. 이미 배포한 기능, `main`에서 개발 중인 기능, 아직 계획 단계인 기능을 구분한다.

## v0.1.0 · 첫 공개 버전

2026년 8월 26일 배포.

- Git 기반 팀 로스터 생성과 참여
- 로컬 스킬 탐색과 팀 공유
- 작성자 평가, 동료 평가, 팀 순위
- 프로젝트 기술 태그 추천과 OpenCode 설치
- 공개 YAML·JSON Schema와 전체 문서 검사
- pull, rebase, commit, push와 실패 복구
- React 대시보드, CLI, Docker, Windows·macOS·Linux CI
- Apache-2.0 배포와 의존성 라이선스 검사

## main · 다음 배포 전 개발본

- OpenCode·Codex·Claude Code 중 여러 설치 대상 선택
- 프로젝트 Git 저장소에 `.skillroster/project.yaml` 기록
- 기존 평가 수정과 프로젝트 Git 주소 수정
- CLI workspace 모듈 번들 및 빌드 결과 실행 검사
- 원격 변경 가져오기와 로컬 조회 분리
- 데스크톱·태블릿·모바일 화면과 키보드 포커스 보강
- 한국어·영문 시작 안내, 시스템 구성, 저장 형식 문서 정리

이 항목은 아직 새 버전 태그로 배포하지 않았다. 배포 전 `pnpm verify`와 실제 Git 원격 연동을 다시 확인한다.

## v0.2.0 · 설치와 팀 운영

- [npm 실행형 CLI와 운영체제별 독립 실행 파일](https://github.com/orqan137/skillroster/issues/6)
- [Codex·Claude Code 자동 실행 기록 어댑터](https://github.com/orqan137/skillroster/issues/7)
- [GitHub·GitLab 조직 신원과 프로젝트별 권한](https://github.com/orqan137/skillroster/issues/8)
- 로스터 변환, 보관, 복원 명령
- 접근성 점검과 외부 기여자 설치 경험 개선
- 개인·팀·프로젝트 메모리의 평가, 권한, 연결·해제, 보관·회수

## v1.0.0 · 안정 형식

- `v1alpha1` 사용 결과를 반영한 호환성 정책
- 서명된 스킬 release와 출처 검증
- 대규모 팀의 merge conflict와 순위 계산 성능 검증
- 조직 내부 장기 운영을 위한 백업과 감사 안내

각 항목은 구현 전에 GitHub Issue에서 완료 조건, 자료 수집 범위, 보안 영향을 정한다. 끝나지 않은 항목은 README나 발표에서 현재 기능으로 표시하지 않는다.
