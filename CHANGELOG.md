# Changelog

**한국어** · [English](CHANGELOG.en.md)

주요 변경 사항은 이 문서에 기록합니다. 버전 형식은 [Semantic Versioning](https://semver.org/)을 따릅니다.

## [Unreleased]

### Changed

- 프로젝트 스킬 설치 대상을 OpenCode·Codex·Claude Code 중 복수 선택 가능하도록 확장
- 조회 화면은 로컬 clone을 즉시 읽고 원격 변경 가져오기를 설정의 명시적 동작으로 분리
- 작성자 단독 평가와 실행 기록이 없는 신규 스킬의 초기 점수 보수화
- 기존 평가 수정, 프로젝트 Git 주소 수정과 구성 중복 커밋 방지
- 모달 포커스 순환·외부 클릭 닫기와 데스크톱·태블릿·모바일 레이아웃 정비
- 한국어 UI 문구, 로고 정렬, 프로젝트·스킬 관리 상태 표시 개선

### Fixed

- 빌드된 CLI가 workspace의 TypeScript 소스 경로를 찾다가 종료되던 문제를 내부 모듈 번들과 실행 검사로 수정

### Documentation

- 영문 기여 안내와 결과보고서용 SBOM·AI 보조도구 사용 범위 정리

### Planned

- 설치형 CLI 배포
- Codex·Claude Code 실행 기록 어댑터
- 조직 인증과 프로젝트별 권한

## [0.1.0] - 2026-08-26

### Added

- Git 기반 팀 스킬 레지스트리 초기화와 참여 흐름
- React·Vite 로컬 대시보드
- 로컬 스킬 탐색, 발행, 자기평가와 동료 평가
- 프로젝트 기술 태그 기반 추천과 OpenCode 스킬 설치
- 검증 가능한 공개 YAML·JSON Schema
- pull/rebase/commit/push 트랜잭션과 오류 복구
- Windows·macOS·Linux GitHub Actions 및 Docker 실행 환경
