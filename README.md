# HalfStep

AI 기반 신생아 육아 관리 플랫폼 MVP 프로젝트입니다.

## 목표

HalfStep은 보호자가 아기의 일상 기록을 쉽게 남기고, 가족과 공유하며, AI를 통해 육아 일기와 요약을 생성할 수 있도록 돕는 서비스입니다.

MVP 범위는 다음 기능을 기준으로 합니다.

- 회원가입 / 로그인 / 로그아웃
- 홈 화면
- 육아 기록
- AI 일기 생성
- 캘린더
- 가족방
- 커뮤니티
- AI 챗봇

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React Native |
| Backend | FastAPI |
| Database | MySQL |
| ORM / Migration | SQLAlchemy, Alembic |
| Infra | Docker Compose |

## 프로젝트 구조

```txt
frontend/   # React Native 앱
backend/    # FastAPI API 서버
infra/      # Docker, MySQL, Nginx, 실행 스크립트
docs/       # 협업 문서
.github/    # PR / Issue 템플릿
```

자세한 구조는 [docs/architecture.md](docs/architecture.md)를 참고합니다.

## 주요 문서

- [디렉토리 구조](docs/architecture.md)
- [ERD](docs/erd.md)
- [API 명세](docs/api-spec.md)
- [협업 컨벤션](docs/convention.md)
- [브랜치 전략](docs/git-flow.md)

## 로컬 실행

### Docker Compose

```bash
docker compose up --build
```

서비스 포트:

| 서비스 | URL |
| --- | --- |
| Backend | http://localhost:8000 |
| Backend Health Check | http://localhost:8000/health |
| Frontend Metro | http://localhost:8081 |
| MySQL | localhost:3306 |

현재 프론트엔드는 아직 React Native 프로젝트가 초기화되지 않았습니다. `frontend/package.json`이 생기기 전까지 frontend 컨테이너는 안내 메시지를 출력하고 대기합니다.

### Backend 단독 실행

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 환경 변수

환경변수 예시는 아래 파일을 기준으로 합니다.

```txt
backend/.env.example
frontend/.env.example
```

실제 로컬 개발에서는 필요한 경우 `.env` 파일을 만들어 사용합니다. `.env` 파일은 Git에 커밋하지 않습니다.

## Docker 구조

Dockerfile은 애플리케이션 코드 폴더가 아니라 `infra/docker` 아래에서 관리합니다.

```txt
infra/docker/
├── backend/
│   └── Dockerfile
└── frontend/
    └── Dockerfile
```

백엔드 의존성 파일인 `backend/requirements.txt`는 백엔드 앱의 실행 의존성이므로 `backend/`에 둡니다.

## 브랜치 전략

브랜치는 `main`, `develop`, `feature/*`, `fix/*` 기준으로 운영합니다.

| 브랜치 | 역할 |
| --- | --- |
| main | 배포 가능한 안정 브랜치 |
| develop | 개발 통합 브랜치 |
| feature/* | 기능 개발 브랜치 |
| fix/* | 버그 수정 브랜치 |

기능 개발은 `feature/*`, 버그 수정은 `fix/*` 브랜치에서 진행합니다. 작업 완료 후 PR을 만들고, 최소 1명 승인 후 `develop`에 병합합니다.

## 커밋 메시지

커밋 메시지는 다음 형식을 사용합니다.

```txt
type: message
```

예시:

```txt
feat: add auth login
fix: refresh token 만료 처리 수정
docs: ERD 문서 추가
chore: move dockerfiles to infra
```

자세한 규칙은 [docs/convention.md](docs/convention.md)를 참고합니다.

## 현재 상태

- 프로젝트 디렉토리 구조 생성 완료
- ERD 문서와 이미지 추가 완료
- FastAPI 최소 실행 골격 추가 완료
- Docker Compose 기본 설정 완료
- GitHub PR / Issue 템플릿 추가 완료
- `develop` 브랜치 생성 완료

다음 작업 후보:

- 프론트엔드 React Native 프로젝트 초기화
- API 명세 정리
- SQLAlchemy 모델 및 Alembic migration 구성
- 인증 API 구현

## iOS OAuth 개발 빌드

Expo Go는 HalfStep의 `halfstep://` URL 스킴을 소유하지 않으므로 실제 OAuth
callback을 받을 수 없습니다. Expo Go에서는 UI와 개발용 로그인을 확인하고,
실제 카카오·Google·네이버 OAuth는 HalfStep development build에서 검증합니다.

OAuth 제공자 콘솔에는 네이티브 Redirect URI로 `halfstep://login`을 정확히
등록합니다. 프론트엔드에는 `.env.example`의 공개 client ID만 설정하고,
client secret은 `backend/.env`에만 둡니다.

macOS에서 처음 development build를 설치할 때:

```bash
cd frontend
npm install
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
완료 후 앱은 고정 callback인 `halfstep://login`으로 다시 열립니다.
