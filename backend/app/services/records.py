import base64
import binascii
from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.records import CareLog
from app.models.user import User
from app.repositories import records_repository

LOG_TYPES = {"FEEDING", "SLEEP", "URINE", "STOOL"}


def require_baby_access(db: Session, baby_id: int, user: User) -> None:
    if records_repository.get_accessible_baby(db, baby_id=baby_id, user_id=user.id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Baby not found.")


def create_record(db: Session, *, user: User, log_type: str, values: dict) -> CareLog:
    baby_id = values.pop("baby_id")
    require_baby_access(db, baby_id, user)
    log = records_repository.create_log(db, baby_id=baby_id, user_id=user.id, log_type=log_type, **values)
    db.commit()
    db.refresh(log)
    return log


def list_records(db: Session, *, user: User, baby_id: int, log_type: str | None, target_date: date, cursor: str | None, limit: int):
    require_baby_access(db, baby_id, user)
    normalized_type = log_type.upper() if log_type else None
    if normalized_type and normalized_type not in LOG_TYPES:
        raise HTTPException(status_code=400, detail="Invalid record type.")
    start_at = datetime.combine(target_date, time.min)
    logs = records_repository.list_logs(
        db, baby_id=baby_id, log_type=normalized_type, start_at=start_at,
        end_at=start_at + timedelta(days=1), before_id=_decode_cursor(cursor) if cursor else None,
        limit=limit + 1,
    )
    has_next = len(logs) > limit
    page = logs[:limit]
    return page, (_encode_cursor(page[-1].id) if has_next and page else None), has_next


def serialize_log(log: CareLog) -> dict:
    content = dict(log.extra_data or {})
    if log.feeding_type:
        content["feedingType"] = log.feeding_type
    if log.amount_ml is not None:
        content["formulaAmountMl"] = log.amount_ml
    return {
        "id": str(log.id), "type": log.log_type, "occurredAt": log.occurred_at,
        "startedAt": log.started_at, "endedAt": log.ended_at, "content": content,
        "memo": log.memo, "createdAt": log.created_at,
    }


def _encode_cursor(record_id: int) -> str:
    return base64.urlsafe_b64encode(f"record:{record_id}".encode()).decode().rstrip("=")


def _decode_cursor(cursor: str) -> int:
    try:
        value = base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)).decode()
        prefix, raw_id = value.split(":", 1)
        if prefix != "record" or int(raw_id) < 1:
            raise ValueError
        return int(raw_id)
    except (ValueError, UnicodeDecodeError, binascii.Error) as exc:
        raise HTTPException(status_code=400, detail="Invalid cursor.") from exc
