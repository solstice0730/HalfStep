from fastapi import APIRouter

from app.api.endpoints import auth, records

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(records.router)
