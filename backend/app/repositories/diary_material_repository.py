from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.diary_material import DiaryMaterial


def create_material(
    db: Session, *, baby_id: int, user_id: int, material_date: date, source: str, content: str
) -> DiaryMaterial:
    material = DiaryMaterial(
        baby_id=baby_id, user_id=user_id, material_date=material_date, source=source, content=content
    )
    db.add(material)
    db.flush()
    return material


def list_materials(db: Session, *, baby_id: int, material_date: date) -> list[DiaryMaterial]:
    statement = (
        select(DiaryMaterial)
        .where(DiaryMaterial.baby_id == baby_id, DiaryMaterial.material_date == material_date)
        .order_by(DiaryMaterial.created_at, DiaryMaterial.id)
    )
    return list(db.scalars(statement).all())


def count_materials(db: Session, *, baby_id: int, material_date: date, source: str) -> int:
    statement = select(func.count(DiaryMaterial.id)).where(
        DiaryMaterial.baby_id == baby_id,
        DiaryMaterial.material_date == material_date,
        DiaryMaterial.source == source,
    )
    return int(db.scalar(statement) or 0)


def get_material(db: Session, material_id: int) -> DiaryMaterial | None:
    return db.get(DiaryMaterial, material_id)


def delete_material(db: Session, material: DiaryMaterial) -> None:
    db.delete(material)
    db.flush()


def get_memo(db: Session, *, baby_id: int, material_date: date) -> DiaryMaterial | None:
    statement = (
        select(DiaryMaterial)
        .where(
            DiaryMaterial.baby_id == baby_id,
            DiaryMaterial.material_date == material_date,
            DiaryMaterial.source == "MEMO",
        )
        .order_by(DiaryMaterial.id)
    )
    return db.scalars(statement).first()
