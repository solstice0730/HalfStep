# 협업 컨벤션

## 1. 기본 원칙

- 브랜치명은 영어로 작성한다.
- 커밋 메시지는 타입을 명확히 작성한다.
- 커밋 메시지 본문과 설명에는 한국어를 허용한다.
- `main`, `develop`에는 직접 커밋하지 않는다.
- 기능 개발은 `feature/*`, 버그 수정은 `fix/*` 브랜치에서 진행한다.
- 모든 작업은 Pull Request를 통해 병합한다.
- PR은 최소 1명 승인 후 merge한다.

## 2. 브랜치 네이밍

```txt
feature/{feature-name}
fix/{bug-name}
docs/{document-name}
chore/{task-name}
refactor/{target-name}
```

예시:

```txt
feature/auth-login
feature/care-log
fix/login-token-refresh
fix/care-log-validation
docs/erd
chore/project-setup
refactor/api-client
```

## 3. 커밋 메시지

커밋 메시지는 다음 형식을 사용한다.

```txt
type: message
```

사용하는 타입:

| 타입 | 용도 |
| --- | --- |
| feat | 새로운 기능 추가 |
| fix | 버그 수정 |
| docs | 문서 수정 |
| chore | 설정, 빌드, 패키지, 기타 작업 |
| refactor | 동작 변경 없는 코드 구조 개선 |
| style | 포맷팅, 세미콜론 등 코드 의미 변경 없는 수정 |
| test | 테스트 추가 또는 수정 |

예시:

```txt
feat: add auth login screen
fix: refresh token 만료 처리 수정
docs: ERD 문서 추가
chore: add project directory structure
refactor: split api client
```

## 4. Pull Request 규칙

- PR 제목은 작업 내용을 간단히 설명한다.
- PR 본문에는 작업 내용과 확인한 내용을 작성한다.
- UI 변경이 있으면 스크린샷을 첨부한다.
- PR은 최소 1명 승인 후 merge한다.
- 충돌이 있으면 작성자가 해결한다.
- PR merge 전 불필요한 파일이 포함되지 않았는지 확인한다.

## 5. 코드 리뷰 기준

- 기능이 요구사항과 맞는지 확인한다.
- 예외 상황과 에러 처리가 충분한지 확인한다.
- 불필요한 복잡도나 중복이 없는지 확인한다.
- API 요청/응답, DB 스키마, 화면 흐름이 문서와 충돌하지 않는지 확인한다.

## 6. 문서 관리

- API 변경 시 `docs/api-spec.md`를 함께 수정한다.
- DB 구조 변경 시 `docs/erd.md`를 함께 수정한다.
- 디렉토리 구조 변경 시 `docs/architecture.md`를 함께 수정한다.
- 협업 방식 변경 시 `docs/convention.md` 또는 `docs/git-flow.md`를 수정한다.
