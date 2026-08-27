# 팀 Git 저장 형식

**한국어** · [English](REGISTRY_FORMAT.en.md)

팀 로스터는 일반 Git 작업 폴더다. 정식 문서는 저장소의 `schemas/`에 포함된 JSON Schema로 검사한다.

초기 프로젝트 이름에서 사용한 `skillspace.dev/v1alpha1`은 공개 문서의 `apiVersion` 호환을 위해 유지한다. 제품명은 SkillRoster이며, 안정 버전으로 바꿀 때는 이전 도구와 자료를 위한 변환 방법을 함께 제공할 예정이다.

```text
skillspace.yaml
members/<member>.yaml
skills/<owner>/<skill>/SKILL.md
skills/<owner>/<skill>/skill.yaml
releases/<owner>/<skill>/<version>/SKILL.md
releases/<owner>/<skill>/<version>/attachments/*
reviews/<owner>/<skill>/<version>/<reviewer>.yaml
evidence/<yyyy>/<mm>/<event>.yaml
projects/<project>/project.yaml
projects/<project>/skillset.yaml
schemas/*.schema.json
```

## 문서 역할

- `skills/`: 화면 탐색과 현재 버전 표시에 사용하는 최신 발행본
- `releases/`: 정확한 버전을 다시 설치할 수 있도록 남기는 변경 불가 스냅샷
- `reviews/`: 평가자 한 명과 스킬 버전 하나를 묶은 평가 문서
- `evidence/`: 스킬 사용과 프로젝트 검사 결과를 담은 최소 실행 기록
- `projects/`: 프로젝트 정보와 선택한 스킬 ID·버전
- `schemas/`: 외부 도구도 같은 규칙을 적용할 수 있는 공개 JSON Schema

## 식별자와 버전

- 이미 존재하는 `owner/name/version` 조합은 다시 발행할 수 없다.
- 평가 하나는 스킬 버전과 평가자 조합으로 식별한다. 같은 사람이 다시 평가하면 새 문서를 쌓지 않고 기존 평가를 바꾼다.
- 작성자도 자기 스킬을 평가할 수 있다. 화면에서 작성자 평가로 표시하며 순위에서는 동료 평가의 35%만 반영한다.
- 실행 기록 ID는 로컬에서 한 번 만들고 재시도할 때 그대로 사용한다. 같은 실행이 중복 문서로 생기지 않는다.
- slug는 영문 소문자, 숫자, 한 개의 하이픈 구분만 허용한다.

## 참고 자료와 첨부 파일

`Skill.spec.references`에는 사용자가 입력한 표시 이름과 위치를 기록한다.

- `included: false`: 링크나 경로만 기록하며 대상 파일을 읽거나 복사하지 않음
- `included: true`: 사용자가 직접 고른 파일 하나를 release의 `attachments/`에 복사

발행 기본 범위는 `SKILL.md`다. 선택하지 않은 스크립트, 소스 코드, 인증정보, 업무 문서는 원래 위치에 남는다.

`SKILL.md`와 첨부 파일에는 다음 제한을 적용한다.

- 심볼릭 링크 제외
- 파일 하나당 2MB 이하
- 첨부 파일 10개 이하, 전체 10MB 이하
- 인증정보로 보이는 파일 이름 제외

프로젝트 Git 저장소의 `.skillroster/project.yaml`에는 선택한 스킬 ID와 버전만 기록하며 첨부 파일 내용은 넣지 않는다.

## 실행 기록 필드

| 필드 | 내용 |
|---|---|
| `skill`, `version` | 사용한 정확한 스킬 release |
| `member`, `project` | 사용자와 선언된 프로젝트 |
| `sessionId` | OpenCode 세션 연결 ID. 프롬프트가 아님 |
| `status` | `used`, `verified`, `failed`, `co-used` 중 하나 |
| `changedFiles` | commit에 포함된 고유 경로. 파일 내용은 없음 |
| `verificationCommand` | 프로젝트에 적힌 검사 명령 이름. 출력 내용은 없음 |
| `verificationPassed` | 검사 명령이 있을 때의 통과 여부 |
| `acceptedCommit` | 실행 결과와 연결된 Git commit |
| `coUsedSkills` | 같은 세션에서 함께 불러온 스킬 |
| `privacy` | `promptStored: false`, `sourceStored: false`로 고정 |

검사 명령은 `.skillspace/project.yaml`에서 읽어 현재 사용자 권한으로 실행한다. 이 설정 파일의 변경도 일반 코드와 같이 검토해야 한다.

## 전체 문서 검사

스냅샷을 읽을 때 다음 항목을 함께 검사한다.

- JSON Schema 일치 여부
- 파일 경로와 문서 ID 일치 여부
- ID 중복
- 팀원과 스킬 소유자 연결
- 평가·프로젝트·실행 기록이 가리키는 대상의 존재
- 프로젝트 스킬 구성에 적힌 release의 존재
- 알 수 없는 `apiVersion`, `kind`, 추가 필드

정식 경로의 문서 하나라도 잘못되면 일부 자료만 조용히 보여주지 않고 해당 경로와 함께 읽기를 중단한다.

## Git 쓰기와 복구

대시보드는 한 로컬 clone에 대한 쓰기를 차례로 처리한다.

1. 관리 중인 작업 폴더가 깨끗한지 확인하고 원격 변경을 가져옴
2. 요청한 파일을 쓰고 전체 스냅샷을 검사
3. commit과 push 실행
4. 실패하면 작업 전 revision으로 되돌리고 해당 작업이 새로 만든 파일만 제거

대시보드가 실행 중일 때 관리 중인 clone을 직접 수정하지 않는 것이 좋다. `GIT_WORKTREE_DIRTY`가 나오면 수동 변경을 확인해 commit하거나 되돌린 뒤 다시 시도한다. Git 인증은 운영체제의 credential helper를 사용하며 SkillRoster는 토큰을 저장하지 않는다.

자료 흐름과 실행 경계는 [시스템 구성](ARCHITECTURE.md)에서 확인할 수 있다.
