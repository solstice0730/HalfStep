from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.baby import BabyCreate, BabyResponse, BabyUpdate
from app.services.baby_service import (
    activate_baby_profile,
    create_baby_profile,
    delete_baby_profile,
    update_baby_profile,
)
from app.utils.date_utils import age_in_days

router = APIRouter(prefix="/babies", tags=["babies"])


def _serialize(baby) -> dict:
    return BabyResponse(
        id=baby.id,
        name=baby.name,
        birthDate=baby.birth_date,
        gender=baby.gender,
        ageInDays=age_in_days(baby.birth_date),
        isActive=baby.is_active,
    ).model_dump()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_baby(
    payload: BabyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    baby = create_baby_profile(
        db,
        user_id=current_user.id,
        name=payload.name,
        birth_date=payload.birthDate,
        gender=payload.gender,
    )
    return {"success": True, "data": _serialize(baby)}


@router.patch("/{baby_id}", status_code=status.HTTP_200_OK)
def update_baby(
    baby_id: int,
    payload: BabyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    baby = update_baby_profile(
        db,
        user_id=current_user.id,
        baby_id=baby_id,
        name=payload.name,
        gender=payload.gender,
    )
    return {"success": True, "data": {"id": baby.id, "name": baby.name, "gender": baby.gender}}


@router.patch("/{baby_id}/activate", status_code=status.HTTP_200_OK)
def activate_baby(
    baby_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    baby = activate_baby_profile(db, user_id=current_user.id, baby_id=baby_id)
    return {"success": True, "data": {"activeBabyId": str(baby.id)}}


@router.delete("/{baby_id}", status_code=status.HTTP_200_OK)
def delete_baby(
    baby_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    delete_baby_profile(db, user_id=current_user.id, baby_id=baby_id)
    return {"success": True, "data": None}
