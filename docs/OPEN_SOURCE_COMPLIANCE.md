# 오픈소스 구성과 라이선스 검증

SkillRoster 자체 코드는 Apache License 2.0으로 배포함. 패키지를 선택할 때 기능뿐 아니라 유지보수 가능성, self-hosted 동작, 라이선스 호환성을 함께 확인함.

## 주요 OSS 활용

| 구성 | 역할 | 라이선스 |
|---|---|---|
| React, React DOM, React Router | 로컬 대시보드와 화면 이동 | MIT |
| Vite, TypeScript, tsx, tsup | 개발 서버, 타입 검사, 빌드 | MIT / Apache-2.0 |
| Vitest | 단위·통합 회귀 테스트 | MIT |
| simple-git | clone, pull, rebase, commit, push 트랜잭션 | MIT |
| Ajv, ajv-formats | 공개 JSON Schema 검증 | MIT |
| yaml, gray-matter | YAML registry와 SKILL.md frontmatter | ISC / MIT |
| Commander | cross-platform CLI | MIT |
| Lucide React | 의미가 명확한 UI 아이콘 | ISC |
| Pretendard | 한국어 중심 웹 폰트 | SIL OFL 1.1 |

Git은 외부 프로세스로 사용하며 SkillRoster 결과물에 포함하지 않음. OpenCode plugin은 공개 plugin hook에 연결되지만 OpenCode 소스나 바이너리를 재배포하지 않음.

## 자동 검사 정책

```bash
pnpm license:check
```

검사는 pnpm lockfile의 프로덕션 의존성 전체를 조회함. 현재 허용 목록은 `Apache-2.0`, `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `OFL-1.1`임. 알려지지 않은 라이선스, copyleft 의무 검토가 필요한 라이선스, 라이선스 식별 실패가 추가되면 CI가 실패함.

다음 고지 파일도 함께 검사함.

- `/LICENSE`: SkillRoster Apache-2.0 전문
- `/NOTICE`: 프로젝트와 번들 asset 고지
- `/apps/web/public/Pretendard-LICENSE.txt`: 배포 font의 OFL 전문

새 의존성을 추가하는 PR은 역할, 대체재, 라이선스를 설명하고 `pnpm license:check` 결과를 포함해야 함. 허용 목록 변경은 단순 통과 처리가 아니라 호환성 검토 후 별도 PR로 진행함.

## 호환성 결론

현재 프로덕션 의존성의 permissive license와 Pretendard의 OFL은 Apache-2.0 프로젝트에서 사용·재배포 가능함. OFL font 고지를 웹 asset과 NOTICE에 유지하며, 원 저작자의 상표나 보증을 주장하지 않음.
