# 오픈소스 구성과 라이선스 검증

**한국어** · [English](OPEN_SOURCE_COMPLIANCE.en.md)

SkillRoster 자체 코드는 Apache License 2.0으로 배포한다. 패키지를 고를 때는 기능뿐 아니라 유지보수 가능성, 자체 설치 환경에서의 동작, 라이선스 호환성을 함께 확인한다.

## 주요 OSS 활용

| 구성 | 역할 | 라이선스 |
|---|---|---|
| React, React DOM, React Router | 로컬 대시보드와 화면 이동 | MIT |
| Vite, TypeScript, tsx, tsup | 개발 서버, 타입 검사, 빌드 | MIT / Apache-2.0 |
| Vitest | 단위·통합 회귀 테스트 | MIT |
| simple-git | clone, pull, rebase, commit, push 트랜잭션 | MIT |
| Ajv, ajv-formats | 공개 JSON Schema 검증 | MIT |
| yaml, gray-matter | YAML registry와 SKILL.md frontmatter | ISC / MIT |
| Commander | 운영체제 공통 CLI | MIT |
| Lucide React | 의미가 명확한 UI 아이콘 | ISC |
| Pretendard | 한국어 중심 웹 폰트 | SIL OFL 1.1 |

Git은 외부 프로그램으로 사용하며 SkillRoster 결과물에 포함하지 않는다. OpenCode 플러그인은 공개 훅에 연결되지만 OpenCode 소스나 실행 파일을 재배포하지 않는다.

## 자동 검사 정책

```bash
pnpm license:check
```

검사는 pnpm lockfile의 운영 의존성을 모두 확인한다. 현재 허용 목록은 `Apache-2.0`, `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `OFL-1.1`이다. 알 수 없는 라이선스, copyleft 의무를 따로 검토해야 하는 라이선스, 라이선스 식별 실패가 추가되면 CI가 실패한다.

다음 고지 파일도 함께 검사함.

- `/LICENSE`: SkillRoster Apache-2.0 전문
- `/NOTICE`: 프로젝트와 포함 자산 고지
- `/apps/web/public/Pretendard-LICENSE.txt`: 배포 글꼴의 OFL 전문

새 의존성을 추가하는 Pull Request는 역할, 검토한 대안, 라이선스와 `pnpm license:check` 결과를 적어야 한다. 허용 목록은 검사를 통과시키기 위해 바로 바꾸지 않고 호환성을 검토한 별도 Pull Request에서 변경한다.

## 호환성 결론

현재 운영 의존성의 허용적 라이선스와 Pretendard의 OFL은 Apache-2.0 프로젝트에서 사용하고 재배포할 수 있다. OFL 글꼴 고지는 웹 자산과 NOTICE에 유지하며, 원 저작자의 상표나 보증을 주장하지 않는다.
