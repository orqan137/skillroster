# ADR-0001: Issue 연결형 GitHub Flow

- 상태: 채택
- 결정일: 2026-08-26
- 관련 Issue: [#11](https://github.com/orqan137/skillroster/issues/11)

## 배경

GAYADI-Android 저장소는 `fix/#96-tour-place-category-mapping` 같은 branch와 `fix/#96: ...` PR을 반복적으로 사용함. Issue → branch → PR → merge commit의 번호가 이어져, 짧은 기간에 많은 변경이 있어도 각 작업의 목적을 Git log에서 찾기 쉬움. Android CI도 PR과 `main` push에서 같은 quality gate를 실행하고 concurrency로 이전 실행을 취소함.

SkillRoster의 기존 GitHub Flow는 Conventional Commit과 CI는 강제했지만 branch와 Issue의 연결이 문서 권장 사항에 머물렀음. release, 변경 영역 label, 완료 조건도 사람이 빠뜨릴 수 있었음.

## 결정

검증된 Issue 번호 기반 추적성을 채택하고 다음을 자동화함.

1. branch는 `type/#issue-short-description` 형식 사용
2. PR 제목은 Conventional Commit, 본문은 같은 Issue를 `Closes` 또는 `Refs`로 연결
3. CI가 branch·title·Issue 번호 일치를 검사
4. 경로 기반 label로 담당 영역과 release note 자동 분류
5. squash merge만 허용해 `main`의 linear history 유지
6. `vX.Y.Z` tag와 package version 일치 및 전체 검증 후 release 자동 발행

Dependabot은 서비스가 관리하는 branch 이름을 사용하므로 명시적으로 예외 처리함. 긴급 보안 수정도 공개 Issue를 만들지 않고 private advisory branch와 maintainer 승인으로 처리하며, 공개 후 보안 공지에 추적 정보를 남김.

## 대안

- **Issue 번호를 권장만 함**: 진입 장벽은 낮지만 누락을 탐지하지 못함
- **Git Flow의 develop/release/hotfix branch**: release train이 없는 현재 규모에는 장기 branch와 merge 비용이 큼
- **trunk에 직접 commit**: 빠르지만 대회와 오픈소스 협업에 필요한 검토·설명 이력이 사라짐
- **merge commit 허용**: branch 이력은 보존되지만 동기화 merge가 `main`을 복잡하게 만들어 squash를 선택함

## 결과

- Issue와 PR의 왕복 추적이 자동 보장됨
- 작고 설명 가능한 PR을 유도함
- tag 하나로 동일한 품질 검증과 release note 생성 가능
- 사소한 변경도 Issue가 필요한 비용이 있지만, 모든 Pull Request에 같은 규칙을 적용해 자동 검사의 예외를 줄임
