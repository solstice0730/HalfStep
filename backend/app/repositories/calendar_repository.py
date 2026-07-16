from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

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
