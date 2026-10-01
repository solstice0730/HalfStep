from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services import records as records_service
from app.services import reports as reports_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/weekly")
def weekly_report(
    baby_id: int = Query(alias="babyId", gt=0),
    end_date: date = Query(default_factory=records_service.current_date, alias="endDate"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return {
        "success": True,
        "data": reports_service.get_weekly_report(db, user=user, baby_id=baby_id, end_date=end_date),
    }
