from datetime import datetime

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.records import Baby, CareLog


def get_accessible_baby(db: Session, *, baby_id: int, user_id: int) -> Baby | None:
    statement = select(Baby).where(Baby.id == baby_id, Baby.owner_user_id == user_id)
    return db.scalar(statement)


def create_log(db: Session, **values) -> CareLog:
    log = CareLog(**values)
    db.add(log)
    db.flush()
    return log


def list_logs(
    db: Session,
    *,
    baby_id: int,
    log_type: str | None,
    start_at: datetime,
    end_at: datetime,
    before_at: datetime | None,
    before_id: int | None,
    limit: int,
) -> list[CareLog]:
    statement = (
        select(CareLog)
        .where(CareLog.baby_id == baby_id, CareLog.occurred_at >= start_at, CareLog.occurred_at < end_at)
        .order_by(CareLog.occurred_at.desc(), CareLog.id.desc())
        .limit(limit)
    )
    if log_type:
        statement = statement.where(CareLog.log_type == log_type)
    if before_at is not None and before_id is not None:
        statement = statement.where(
            or_(
                CareLog.occurred_at < before_at,
                and_(CareLog.occurred_at == before_at, CareLog.id < before_id),
            )
        )
    return list(db.scalars(statement).all())
