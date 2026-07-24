import mimetypes

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings


mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/heic", ".heic")

app = FastAPI(title=settings.PROJECT_NAME)

app.mount(
    "/uploads",
    StaticFiles(directory=settings.UPLOAD_DIR, check_dir=False),
    name="uploads",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_PREFIX)
