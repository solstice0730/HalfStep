from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.baby_service import get_dashboard

router = APIRouter(prefix="/home", tags=["home"])


@router.get("/dashboard", status_code=status.HTTP_200_OK)
def dashboard(
    baby_id: int | None = Query(default=None, alias="babyId", description="아기 ID. 미입력 시 활성 아기 사용"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    data = get_dashboard(db, user_id=current_user.id, baby_id=baby_id)
    return {"success": True, "data": data}
