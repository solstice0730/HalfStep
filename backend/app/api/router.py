from fastapi import APIRouter

from app.api.endpoints import ai, auth, babies, calendar, community, diary, home, records, uploads, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(babies.router)
api_router.include_router(home.router)
api_router.include_router(diary.router)
api_router.include_router(records.router)
api_router.include_router(calendar.router)
api_router.include_router(community.router)
api_router.include_router(ai.router)
api_router.include_router(uploads.router)
