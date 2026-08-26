# SkillRoster 데모 영상

실제 공개 GitHub 저장소를 새 로스터로 초기화하고 별도 팀원 환경에서 연결한 뒤, 더미 데이터로 스킬 공유·평가·프로젝트 Git 연결·OpenCode 설치까지 수행하는 브라우저 화면 녹화임. 모든 자막에 `01`부터 `07`까지 단계 번호를 표시하고 최소 4.2초 동안 유지해 음소거 상태에서도 입력 내용과 결과를 이해할 수 있게 구성함. 확대·축소 효과와 정지 화면 슬라이드 사용 없음.

| 번호 | 화면 | 전달 내용 |
| --- | --- | --- |
| 01 | 빈 GitHub | `skillroster-test2` 저장소가 비어 있는 상태 확인 |
| 02 | 새 로스터 | 팀장 정보와 원격 주소 입력, 첫 커밋과 push, GitHub 결과 확인 |
| 03 | 팀원 연결 | 별도 로컬 환경에서 clone, 팀원 문서 커밋과 변경 이력 확인 |
| 04 | 스킬 공유·평가 | 링크·경로와 명시적 파일 첨부, 작성자 평가와 동료 평가 |
| 05 | 프로젝트 Git | 빈 `skillroster-project-test` 연결, 추천 스킬 선택, `.skillroster/project.yaml` 확인 |
| 06 | OpenCode 설치 | 프로젝트 구성을 실제 `.opencode/skills`에 설치 |
| 07 | 팀원·설정 | 구성원 활동과 로스터별 Git·사용자·로컬 경로 관리 |

## 내레이션 추가

화면 자막만으로 전체 흐름을 이해할 수 있으며, 생성되는 SRT를 그대로 읽거나 조금 풀어서 내레이션 추가 가능. 배경 음악과 효과음 없음.

## 다시 만들기

```bash
pnpm demo --port 3213 --no-open
node scripts/record-demo-session.cjs artifacts/video/recording
node scripts/assemble-demo-recording.cjs # 7개 번호 단계와 원격 주소 검증
python scripts/render-demo-recording.py
```

화면 캡처에는 `playwright-core`와 Chromium 계열 브라우저가 필요함. 영상 렌더링에는 FFmpeg가 필요함. 실제 저장소 연동 구간을 다시 녹화하려면 팀 로스터와 프로젝트용 테스트 저장소가 모두 비어 있어야 하며 push 권한 필요. 렌더링 결과는 무음 MP4와 수정 가능한 SRT로 생성됨.
