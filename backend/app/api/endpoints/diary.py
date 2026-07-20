from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.diary import DiaryCreate, DiaryUpdate
from app.services.diary_service import (
    edit_diary,
    get_diary,
    get_diary_by_date_service,
    remove_diary,
    save_diary,
)

router = APIRouter(prefix="/diary", tags=["diary"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_diary(
    payload: DiaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    diary = save_diary(
        db,
        user_id=current_user.id,
        baby_id=payload.babyId,
        diary_date=payload.date,
        title=payload.title,
        content=payload.content,
        is_ai_generated=payload.isAiGenerated,
        highlights=payload.highlights,
        notice=payload.notice,
        image_urls=payload.imageUrls,
    )
    return {"success": True, "data": diary.model_dump()}


@router.get("", status_code=status.HTTP_200_OK)
def get_diary_by_date(
    baby_id: int = Query(alias="babyId"),
    diary_date: date = Query(alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    diary = get_diary_by_date_service(db, user_id=current_user.id, baby_id=baby_id, diary_date=diary_date)
    if diary is None:
        return {"success": True, "data": None}
    return {"success": True, "data": diary.model_dump()}


@router.get("/{diary_id}", status_code=status.HTTP_200_OK)
def get_diary_detail(
    diary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    diary = get_diary(db, user_id=current_user.id, diary_id=diary_id)
    return {"success": True, "data": diary.model_dump()}


@router.put("/{diary_id}", status_code=status.HTTP_200_OK)
def update_diary(
    diary_id: int,
    payload: DiaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    diary = edit_diary(
        db,
        user_id=current_user.id,
        diary_id=diary_id,
        title=payload.title,
        content=payload.content,
        image_urls=payload.imageUrls,
    )
    return {"success": True, "data": diary.model_dump()}


@router.delete("/{diary_id}", status_code=status.HTTP_200_OK)
def delete_diary(
    diary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    remove_diary(db, user_id=current_user.id, diary_id=diary_id)
    return {"success": True, "data": None}
