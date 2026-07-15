from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.records import FeedingRecordCreate, SleepRecordCreate, StoolRecordCreate, UrineRecordCreate
from app.services import records as records_service

router = APIRouter(prefix="/records", tags=["records"])


@router.get("")
def list_records(
    baby_id: int = Query(alias="babyId", gt=0),
    record_type: str | None = Query(default=None, alias="type"),
    target_date: date = Query(default_factory=date.today, alias="date"),
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    logs, next_cursor, has_next = records_service.list_records(
        db, user=user, baby_id=baby_id, log_type=record_type, target_date=target_date,
        cursor=cursor, limit=limit,
    )
    return {"success": True, "data": [records_service.serialize_log(log) for log in logs], "meta": {"cursor": next_cursor, "hasNext": has_next}}


@router.post("/feeding", status_code=status.HTTP_201_CREATED)
def create_feeding(payload: FeedingRecordCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    log = records_service.create_record(
        db, user=user, log_type="FEEDING",
        values={"baby_id": payload.babyId, "occurred_at": payload.occurredAt,
                "amount_ml": payload.amountMl, "feeding_type": payload.feedingType,
                "memo": payload.memo, "extra_data": {"durationMinutes": payload.durationMinutes,
                "breastSide": payload.breastSide, "burped": payload.burped}},
    )
    return {"success": True, "data": records_service.serialize_log(log)}


@router.post("/sleep", status_code=status.HTTP_201_CREATED)
def create_sleep(payload: SleepRecordCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    log = records_service.create_record(
        db, user=user, log_type="SLEEP",
        values={"baby_id": payload.babyId, "occurred_at": payload.endedAt,
                "started_at": payload.startedAt, "ended_at": payload.endedAt,
                "extra_data": {"sleepType": payload.sleepType, "status": payload.status}},
    )
    return {"success": True, "data": records_service.serialize_log(log)}


@router.post("/urine", status_code=status.HTTP_201_CREATED)
def create_urine(payload: UrineRecordCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    log = records_service.create_record(
        db, user=user, log_type="URINE",
        values={"baby_id": payload.babyId, "occurred_at": payload.occurredAt,
                "diaper_type": "URINE", "extra_data": {"amount": payload.amount, "color": payload.color}},
    )
    return {"success": True, "data": records_service.serialize_log(log)}


@router.post("/stool", status_code=status.HTTP_201_CREATED)
def create_stool(payload: StoolRecordCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    log = records_service.create_record(
        db, user=user, log_type="STOOL",
        values={"baby_id": payload.babyId, "occurred_at": payload.occurredAt,
                "diaper_type": "STOOL", "extra_data": {"amount": payload.amount,
                "color": payload.color, "form": payload.form, "photoUrl": payload.photoUrl}},
    )
    return {"success": True, "data": records_service.serialize_log(log)}
