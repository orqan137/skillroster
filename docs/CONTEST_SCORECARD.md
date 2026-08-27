# 2026 오픈소스 개발자대회 배점 대응표

이 문서는 [2026-08-20 공개된 공식 심사기준](https://osscontest.kr/notice/41)의 각 항목을 재현 가능한 저장소 증거와 연결함. 2026-08-26 기준으로 항목명과 배점을 다시 대조했으며, 주장보다 실행 결과를 우선함.

## 1차 평가 · 서면 30점

| 항목 | 배점 | 저장소 증거 | 확인 방법 |
|---|---:|---|---|
| 프로젝트 구조 및 코드 완성도 | 6 | 역할별 monorepo, 공개 Schema, Git 트랜잭션, 회귀 테스트, [기능 점검표](TEST_REPORT.md) | `pnpm verify` |
| 오픈소스 프로젝트 발전 가능성 | 6 | [로드맵](ROADMAP.md), Issue 기반 제안, 도구 독립 저장 형식 | `README`의 MVP 경계와 Roadmap 확인 |
| 개발 문서의 구체성 | 6 | [Architecture](ARCHITECTURE.md), [Registry format](REGISTRY_FORMAT.md), [Demo](DEMO.md), 기여·보안 문서 | 문서의 명령을 새 clone에서 실행 |
| 프로젝트 혁신성 | 6 | 팀 내부 평가 + 비수집 실행 근거 + 프로젝트 기술 태그 추천 + Git DB | `pnpm demo`에서 순위·추천·Git 이력 확인 |
| 프로젝트 협업 및 관리체계 | 6 | [Governance](GOVERNANCE.md), CODEOWNERS, PR template, Issue template, CI, Dependabot, 실제 PR·Release | GitHub의 Pull requests, Actions, Releases 확인 |

## 2차 평가 · 발표 70점

| 항목 | 배점 | 저장소 증거 | 발표 확인점 |
|---|---:|---|---|
| 작품발표(PT) | 10 | [발표 구성](PRESENTATION_OUTLINE.md), [데모 대본](DEMO.md) | 문제 → 차별점 → 구조 → 데모 → 확장 순서 |
| 활용성 | 15 | Windows·macOS·Linux 지원, 자체 설치 환경에서 기존 Git 권한 재사용, OpenCode·Codex·Claude Code 대상별 설치 | 로스터 생성 → 평가 → 프로젝트 연결 → 설치 |
| 작품 데모(완성도) | 10 | 원격 인증 없는 `pnpm demo`, [실제 전체 화면](../README.md#실제-화면), 실제 React 화면과 Git 자료 | 샘플 3명·3스킬·2프로젝트·4평가·2실행 기록 확인 |
| 커뮤니티 확장 가능성 | 5 | 프로젝트 운영, 개발 계획, 기여 안내, Issue·Pull Request 양식, 공개 Schema | 새로운 도구 연동과 Schema 기여 경로 설명 |
| 오픈소스SW 적절성 | 15 | [오픈소스 구성과 라이선스](OPEN_SOURCE_COMPLIANCE.md) | 사용 OSS의 역할과 대체 가능성 설명 |
| 기능테스트 | 10 | 3개 운영체제 CI, Git 회귀 테스트, 데모 자료 테스트, Docker 빌드 | Actions 결과와 `pnpm verify` 결과 제시 |
| 라이선스 검증 | 5 | Apache-2.0, NOTICE, Pretendard OFL, 자동 허용 목록 검사 | `pnpm license:check` 실행 |

## 심사 직전 단일 검증

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm demo
```

`verify`는 lint, 라이선스, 타입, 테스트, 빌드를 순서대로 확인함. 데모는 외부 Git 계정이나 토큰 없이 임시 로컬 Git 레지스트리를 만들고 `http://127.0.0.1:3211`을 실행함.

## 아직 주장하지 않는 범위

- 조직 SSO·LDAP와 프로젝트별 세부 권한은 v0.2 이후 범위
- npm 전역 설치와 단일 실행 파일 배포는 후속 배포 범위
- 자동 실행 기록은 현재 OpenCode만 지원

구현되지 않은 기능을 발표에서 완료 기능처럼 설명하지 않음. 현재 경계 자체를 공개하는 것이 기술 신뢰도의 일부임.
