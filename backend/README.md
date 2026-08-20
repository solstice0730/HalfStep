# HalfStep Backend

FastAPI, SQLAlchemy, Alembic, MySQL 기반 API 서버입니다.

## 로컬 실행

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

## Docker 실행

저장소 루트에서 다음 명령을 실행합니다.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

백엔드 컨테이너는 시작할 때 migration을 자동 적용합니다.

## 확인

```txt
GET /health
GET /docs
```

```bash
pytest -q
alembic heads
alembic current
```

## 환경 변수

- 개발용 데모 로그인: `OAUTH_DEV_TOKENS_ENABLED=true`
- AI fallback: `AI_FALLBACK_ENABLED=true`
- 실제 OAuth secret과 `OPENAI_API_KEY`는 로컬 `.env`에서만 관리합니다.
