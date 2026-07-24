# HalfStep (반걸음)

처음 부모가 되는 첫 180일을 중심으로 아기의 기록을 모으고, AI가 기록의 의미를 파악하도록 돕는 육아 관리 서비스입니다.

## 현재 MVP

- 소셜 로그인과 개발용 데모 로그인
- 아기 프로필 생성·조회·수정과 홈 요약
- 수유·수면·소변·대변 기록과 사진 업로드
- 기록 기반 AI 요약·질문과 육아 일지 생성·수정·저장
- 월간 캘린더와 날짜별 기록·일지 조회
- 월령·주제 기반 커뮤니티 목록·상세·작성
- 7일 체험 후 월 8,900원 전면 유료 구독 목업

가족방 생성·초대·채팅은 현재 MVP에서 제외했습니다. 댓글, 좋아요, 신고, 결제도 후속 범위입니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Expo SDK 54, React Native, TypeScript |
| Backend | FastAPI, Python 3.12 |
| Database | MySQL 8.4, SQLAlchemy, Alembic |
| Infra | Docker Compose |

## 프로젝트 구조

```txt
frontend/   # Expo React Native 앱
backend/    # FastAPI API 서버와 테스트
infra/      # Docker, MySQL 설정
docs/       # API, ERD, 협업 및 기획 문서
.github/    # PR / Issue 템플릿
```

## 빠른 실행

Docker Desktop을 실행한 뒤 저장소 루트에서 진행합니다.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

서비스가 준비되면 아래 주소를 확인합니다.

| 서비스 | URL |
| --- | --- |
| Frontend Web | http://localhost:8081 |
| Backend | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
| MySQL | localhost:3306 |

백엔드 컨테이너는 시작할 때 `alembic upgrade head`를 자동 실행합니다. 개발용 로그인은 로컬 환경에서만 `OAUTH_DEV_TOKENS_ENABLED=true`로 사용합니다.

## 모바일 실행

백엔드와 MySQL을 먼저 실행한 뒤 별도 터미널에서 Expo를 시작합니다.

```bash
cd frontend
npm ci
npm run ios
```

Android는 `npm run android`, 웹은 `npm run web`을 사용합니다. 실제 기기에서 테스트할 때는 `EXPO_PUBLIC_API_BASE_URL`을 기기에서 접근 가능한 개발 PC 주소로 바꿔야 합니다.

## 검증

Frontend:

```bash
cd frontend
npm ci
npm test
npm run typecheck
npx expo install --check
npx expo export --platform web
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
```

2026-08-13 `develop` 기준 프론트 테스트는 `10 passed`, 백엔드 전체 테스트는
`71 passed, 2 skipped`이며 TypeScript, Expo 의존성 정합성, Web export를
확인했습니다.

## 환경 변수

- 예시 파일: `backend/.env.example`, `frontend/.env.example`
- 실제 `.env`, OAuth secret, OpenAI API key는 Git에 커밋하지 않습니다.
- 운영 OAuth 값이 없을 때 프론트는 해당 제공자를 비활성화하고 설정 안내를 표시합니다.

## 남은 검증

- [#28 실제 OAuth 로그인과 iOS 핵심 플로우 검증](https://github.com/solstice0730/HalfStep/issues/28)
- [#29 Expo SDK 업그레이드와 전이 의존성 보안 경고 해소](https://github.com/solstice0730/HalfStep/issues/29)

## 주요 문서

- [디렉토리 구조](docs/architecture.md)
- [ERD](docs/erd.md)
- [API 명세](docs/api-spec.md)
- [협업 컨벤션](docs/convention.md)
- [브랜치 전략](docs/git-flow.md)
- [기록 기능 PRD](docs/prd-records.md)

## 브랜치와 커밋

`main`, `develop`, `feature/*`, `fix/*`, `docs/*` 브랜치를 사용합니다. 기능은 PR과 최소 1명 승인을 거쳐 `develop`에 병합합니다.

커밋 메시지는 `type: message` 형식을 사용합니다.

```txt
feat: add auth login
fix: refresh token 만료 처리 수정
docs: update local setup
```

자세한 규칙은 [docs/convention.md](docs/convention.md)를 참고합니다.

## iOS OAuth 개발 빌드

Expo Go는 HalfStep의 `halfstep://` URL 스킴을 소유하지 않으므로 실제 OAuth
callback을 받을 수 없습니다. Expo Go에서는 UI와 개발용 로그인을 확인하고,
실제 카카오·Google·네이버 OAuth는 HalfStep development build에서 검증합니다.

네이티브 OAuth에서 제공자 콘솔에 등록할 Redirect URI는 앱 스킴이 아니라
외부에서 접근 가능한 백엔드 HTTPS callback입니다. 각 제공자에 아래 주소를
정확히 등록합니다.

```text
{EXPO_PUBLIC_API_BASE_URL}/auth/google/callback
{EXPO_PUBLIC_API_BASE_URL}/auth/kakao/callback
{EXPO_PUBLIC_API_BASE_URL}/auth/naver/callback
```

백엔드는 인가 결과만 `halfstep://login`으로 전달하고 development build가 앱을
다시 엽니다. Web은 실행 중인 앱의 `/login` callback을 별도로 등록합니다.
프론트엔드에는 `.env.example`의 공개 client ID만 설정하고, client secret은
`backend/.env`에만 둡니다. Appetize와 제공자 서버가 접근할 수 없는
`localhost` 또는 만료되는 임시 터널은 지속적인 QA와 배포에 사용할 수 없습니다.

macOS에서 처음 development build를 설치할 때:

```bash
cd frontend
npm ci
npm run ios
```

설치 후 Metro를 다시 시작할 때:

```bash
cd frontend
npm run start:dev-client
```

Expo Go로 UI 또는 개발용 로그인만 확인할 때:

```bash
cd frontend
npm run ios:go
```

개발 빌드의 iOS bundle identifier는 `com.solstice0730.halfstep`이며, OAuth
완료 후 백엔드 callback이 앱의 고정 return URI인 `halfstep://login`으로
전달합니다.
