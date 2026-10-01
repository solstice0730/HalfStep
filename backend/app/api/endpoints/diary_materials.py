from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.diary_material import DiaryMaterialCreate, DiaryMemoUpsert
from app.services import diary_material_service

# diary.py의 "/diary/{diary_id}"보다 먼저 등록해야 "/diary/materials"가 숫자 경로로 해석되지 않는다.
router = APIRouter(prefix="/diary/materials", tags=["diary"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_material(
    payload: DiaryMaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    material = diary_material_service.add_material(
        db,
        user=current_user,
        baby_id=payload.babyId,
        material_date=payload.date,
        source=payload.source,
        content=payload.content,
    )
    return {"success": True, "data": material.model_dump()}


@router.get("", status_code=status.HTTP_200_OK)
def list_materials(
    baby_id: int = Query(alias="babyId", gt=0),
    material_date: date = Query(alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = diary_material_service.list_materials(
        db, user=current_user, baby_id=baby_id, material_date=material_date
    )
    return {"success": True, "data": result.model_dump()}


@router.put("/memo", status_code=status.HTTP_200_OK)
def upsert_memo(
    payload: DiaryMemoUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    material = diary_material_service.upsert_memo(
        db, user=current_user, baby_id=payload.babyId, material_date=payload.date, content=payload.content
    )
    return {"success": True, "data": material.model_dump() if material else None}


@router.delete("/{material_id}", status_code=status.HTTP_200_OK)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    diary_material_service.remove_material(db, user=current_user, material_id=material_id)
    return {"success": True, "data": None}
