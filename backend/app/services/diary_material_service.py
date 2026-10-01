from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.time import to_app_timezone
from app.models.diary_material import DiaryMaterial
from app.models.user import User
from app.repositories import diary_material_repository
from app.schemas.diary_material import DiaryMaterialCounts, DiaryMaterialList, DiaryMaterialResponse
from app.services.records import require_baby_access


def add_material(
    db: Session, *, user: User, baby_id: int, material_date: date, source: str, content: str
) -> DiaryMaterialResponse:
    require_baby_access(db, baby_id, user)
    material = diary_material_repository.create_material(
        db, baby_id=baby_id, user_id=user.id, material_date=material_date, source=source, content=content
    )
    db.commit()
    db.refresh(material)
    return _to_response(material)


def list_materials(db: Session, *, user: User, baby_id: int, material_date: date) -> DiaryMaterialList:
    require_baby_access(db, baby_id, user)
    materials = diary_material_repository.list_materials(db, baby_id=baby_id, material_date=material_date)
    return DiaryMaterialList(
        items=[_to_response(material) for material in materials],
        counts=DiaryMaterialCounts(
            chat=sum(1 for material in materials if material.source == "CHAT"),
            memo=sum(1 for material in materials if material.source == "MEMO"),
        ),
    )


def remove_material(db: Session, *, user: User, material_id: int) -> None:
    material = diary_material_repository.get_material(db, material_id)
    if material is None or material.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")
    diary_material_repository.delete_material(db, material)
    db.commit()


def chat_count(db: Session, *, baby_id: int, material_date: date) -> int:
    return diary_material_repository.count_materials(db, baby_id=baby_id, material_date=material_date, source="CHAT")


def conversation_texts(db: Session, *, baby_id: int, material_date: date) -> list[str]:
    materials = diary_material_repository.list_materials(db, baby_id=baby_id, material_date=material_date)
    return [material.content for material in materials if material.source == "CHAT"]


def _to_response(material: DiaryMaterial) -> DiaryMaterialResponse:
    return DiaryMaterialResponse(
        id=material.id,
        babyId=material.baby_id,
        date=material.material_date,
        source=material.source,
        content=material.content,
        createdAt=to_app_timezone(material.created_at),
    )


def upsert_memo(
    db: Session, *, user: User, baby_id: int, material_date: date, content: str
) -> DiaryMaterialResponse | None:
    """날짜당 보호자 메모 1개를 유지한다. 빈 내용이면 삭제한다."""
    require_baby_access(db, baby_id, user)
    existing = diary_material_repository.get_memo(db, baby_id=baby_id, material_date=material_date)
    stripped = content.strip()
    if not stripped:
        if existing is not None:
            diary_material_repository.delete_material(db, existing)
            db.commit()
        return None
    if existing is None:
        material = diary_material_repository.create_material(
            db, baby_id=baby_id, user_id=user.id, material_date=material_date, source="MEMO", content=stripped
        )
    else:
        existing.content = stripped
        material = existing
    db.commit()
    db.refresh(material)
    return _to_response(material)
