from fastapi import APIRouter

from app.api.endpoints import ai, auth

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(ai.router)
