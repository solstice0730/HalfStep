from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.baby import BabyResponse, UserMeResponse, UserUpdateRequest
from app.services.baby_service import get_my_babies
from app.services.user_service import update_profile
from app.utils.date_utils import age_in_days

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", status_code=status.HTTP_200_OK)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    babies = get_my_babies(db, current_user.id)
    data = UserMeResponse(
        id=current_user.id,
        nickname=current_user.nickname,
        email=current_user.email,
        provider=current_user.social_provider,
        babies=[
            BabyResponse(
                id=b.id,
                name=b.name,
                birthDate=b.birth_date,
                gender=b.gender,
                ageInDays=age_in_days(b.birth_date),
                isActive=b.is_active,
            )
            for b in babies
        ],
        createdAt=current_user.created_at,
    )
    return {"success": True, "data": data.model_dump()}


@router.patch("/me", status_code=status.HTTP_200_OK)
def update_me(
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    user = update_profile(db, user=current_user, nickname=payload.nickname)
    db.commit()
    db.refresh(user)
    return {"success": True, "data": {"id": user.id, "nickname": user.nickname}}


