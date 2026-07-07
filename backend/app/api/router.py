from fastapi import APIRouter

from app.api.endpoints import auth, family_rooms

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(family_rooms.router)
