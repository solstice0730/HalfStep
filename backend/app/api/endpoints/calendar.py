from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services import calendar as calendar_service

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("")
def get_month(
    baby_id: int = Query(alias="babyId", gt=0),
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return {
        "success": True,
        "data": calendar_service.get_month(
            db, user=user, baby_id=baby_id, year=year, month=month
        ),
    }
