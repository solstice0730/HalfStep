from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.baby import Baby
from app.repositories.baby_repository import (
    activate_baby,
    create_baby,
    delete_baby,
    get_active_baby,
    get_babies_by_user,
    get_baby_by_id,
    update_baby,
)
from app.utils.date_utils import age_in_days, age_in_months


def get_my_babies(db: Session, user_id: int) -> list[Baby]:
    return get_babies_by_user(db, user_id)


def create_baby_profile(
    db: Session,
    user_id: int,
    name: str,
    birth_date: date,
    gender: str,
) -> Baby:
    baby = create_baby(db, user_id=user_id, name=name, birth_date=birth_date, gender=gender)
    db.commit()
    db.refresh(baby)
    return baby


def update_baby_profile(
    db: Session,
    user_id: int,
    baby_id: int,
    name: str | None,
    gender: str | None,
) -> Baby:
    baby = _get_owned_baby(db, user_id, baby_id)
    baby = update_baby(db, baby, name=name, gender=gender)
    db.commit()
    db.refresh(baby)
    return baby


def activate_baby_profile(db: Session, user_id: int, baby_id: int) -> Baby:
    baby = activate_baby(db, user_id=user_id, baby_id=baby_id)
    if baby is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Baby not found.")
    db.commit()
    return baby


def delete_baby_profile(db: Session, user_id: int, baby_id: int) -> None:
    baby = _get_owned_baby(db, user_id, baby_id)
    delete_baby(db, baby)
    db.commit()


def get_dashboard(db: Session, user_id: int, baby_id: int | None) -> dict:
    if baby_id is not None:
        baby = _get_owned_baby(db, user_id, baby_id)
    else:
        baby = get_active_baby(db, user_id)
        if baby is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active baby profile. Please create one first.",
            )

    return {
        "baby": {
            "id": baby.id,
            "name": baby.name,
            "ageInDays": age_in_days(baby.birth_date),
            "ageInMonths": age_in_months(baby.birth_date),
        },
        "todaySummary": {
            # TODO: care_logs 구현 후 실제 집계로 교체
            "feedingCount": 0,
            "sleepTotalMinutes": 0,
            "urineCount": 0,
            "stoolCount": 0,
            "lastFeedingAt": None,
            "lastSleepAt": None,
        },
        "aiSummary": None,
        "curationCards": [],
        "activeTimer": None,
    }


def _get_owned_baby(db: Session, user_id: int, baby_id: int) -> Baby:
    baby = get_baby_by_id(db, baby_id)
    if baby is None or baby.owner_user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Baby not found.")
    return baby
