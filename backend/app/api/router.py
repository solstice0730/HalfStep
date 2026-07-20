from fastapi import APIRouter

from app.api.endpoints import auth, babies, diary, home, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(babies.router)
api_router.include_router(home.router)
api_router.include_router(diary.router)
