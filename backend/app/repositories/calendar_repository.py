from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.diary import Diary
from app.models.records import CareLog


def list_logs_in_range(
    db: Session, *, baby_id: int, start_at: datetime, end_at: datetime
) -> list[CareLog]:
    statement = (
        select(CareLog)
        .where(
            CareLog.baby_id == baby_id,
            CareLog.occurred_at >= start_at,
            CareLog.occurred_at < end_at,
        )
        .order_by(CareLog.occurred_at, CareLog.id)
    )
    return list(db.scalars(statement).all())


def list_diaries_in_range(
    db: Session, *, baby_id: int, start_date: date, end_date: date
) -> list[Diary]:
    statement = (
        select(Diary)
        .options(selectinload(Diary.photos))
        .where(
            Diary.baby_id == baby_id,
            Diary.diary_date >= start_date,
            Diary.diary_date < end_date,
        )
        .order_by(Diary.diary_date, Diary.id)
    )
    return list(db.scalars(statement).all())
