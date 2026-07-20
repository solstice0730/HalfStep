from datetime import date

from sqlalchemy.orm import Session

from app.models.baby import Baby


def get_babies_by_user(db: Session, user_id: int) -> list[Baby]:
    return db.query(Baby).filter(Baby.owner_user_id == user_id).all()


def get_baby_by_id(db: Session, baby_id: int) -> Baby | None:
    return db.query(Baby).filter(Baby.id == baby_id).first()


def get_active_baby(db: Session, user_id: int) -> Baby | None:
    return (
        db.query(Baby)
        .filter(Baby.owner_user_id == user_id, Baby.is_active == True)  # noqa: E712
        .first()
    )


def create_baby(db: Session, user_id: int, name: str, birth_date: date, gender: str) -> Baby:
    # 기존 아기들을 모두 비활성화하고 새 아기를 활성으로 설정
    db.query(Baby).filter(Baby.owner_user_id == user_id).update({"is_active": False})
    baby = Baby(
        owner_user_id=user_id,
        name=name,
        birth_date=birth_date,
        gender=gender,
        is_active=True,
    )
    db.add(baby)
    db.flush()
    return baby


def update_baby(
    db: Session,
    baby: Baby,
    name: str | None = None,
    gender: str | None = None,
) -> Baby:
    if name is not None:
        baby.name = name
    if gender is not None:
        baby.gender = gender
    db.flush()
    return baby


def activate_baby(db: Session, user_id: int, baby_id: int) -> Baby | None:
    baby = get_baby_by_id(db, baby_id)
    if baby is None or baby.owner_user_id != user_id:
        return None
    db.query(Baby).filter(Baby.owner_user_id == user_id).update({"is_active": False})
    baby.is_active = True
    db.flush()
    return baby


def delete_baby(db: Session, baby: Baby) -> None:
    db.delete(baby)
    db.flush()
