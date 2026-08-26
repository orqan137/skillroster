# 발표 구성

## 10분 발표 · 10장

1. **문제** — 개인 컴퓨터에 흩어진 AI agent skill, 팀 안에서 품질 판단 불가
2. **사용자** — 여러 프로젝트와 OpenCode를 함께 쓰는 개발팀
3. **기존 방식의 빈틈** — 공개 marketplace 인기도와 우리 팀 환경의 신뢰도는 다름
4. **해결** — 선택적 발행, 동료 평가, 프로젝트 채택, 비수집 실행 근거
5. **핵심 차별점** — Git이 DB, exact version 평가, project loadout
6. **구조** — local skill → client → team Git → project `.opencode/skills`
7. **라이브 데모** — `pnpm demo` 후 아래 4개 확인
8. **오픈소스 활용** — React/Vite/Ajv/simple-git/OpenCode hook과 라이선스 검증
9. **품질·운영** — 3개 OS CI, test, rollback, PR workflow, 공개 schema
10. **현재 경계와 roadmap** — 구현 완료와 후속 범위를 분리

## 데모에서 반드시 보일 것

1. 개요에서 팀원·스킬·프로젝트 현황 확인
2. 스킬 상세에서 작성자 평가와 동료 평가 구분 확인
3. 프로젝트에서 기술 tag 추천과 연결된 version 확인
4. 임시 registry 폴더에서 YAML과 Git log 확인

## 한 문장 설명

“SkillRoster는 공개 스킬 마켓이 아니라, 우리 팀이 어떤 AI agent skill을 어느 프로젝트에서 믿고 쓸지 Git 이력으로 함께 판단하는 self-hosted roster임.”

## 발표 전 복구선

- 인터넷·GitHub 인증 불가: `pnpm demo`는 local Git만 사용
- 기본 3210 port 사용 중: demo 기본 port는 3211
- browser 자동 실행 불가: 출력된 `http://127.0.0.1:3211` 직접 열기
- UI 질문: 같은 데이터가 YAML과 Git log로 남는 점을 함께 제시
- 미구현 질문: [Roadmap](ROADMAP.md)과 현재 MVP 경계를 구분해 답변
