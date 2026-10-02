"""Add a small, idempotent synthetic morning for the October 2 device demo.

Dry run by default. Existing records and diaries are never changed.
"""

import argparse
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time import APP_TIMEZONE, to_utc_naive
from app.db.session import SessionLocal
from app.models.baby import Baby
from app.models.records import CareLog


DEMO_DAY = date(2026, 10, 2)
EXPECTED_BIRTH_DATE = date(2026, 7, 11)
SEED_ID = "harin-device-demo-2026-10-02-morning-v1"


def local_at(hour: int, minute: int, *, day: date = DEMO_DAY) -> datetime:
    return datetime.combine(day, time(hour, minute), tzinfo=APP_TIMEZONE)


def demo_plan() -> list[dict]:
    def at(hour: int, minute: int) -> datetime:
        return to_utc_naive(local_at(hour, minute))

    night_start = to_utc_naive(local_at(22, 10, day=DEMO_DAY - timedelta(days=1)))
    nap_start = at(10, 15)
    return [
        {"log_type": "SLEEP", "occurred_at": at(6, 10), "started_at": night_start,
         "ended_at": at(6, 10), "extra_data": {"demoSeed": SEED_ID, "sleepType": "NIGHT"}},
        {"log_type": "FEEDING", "occurred_at": at(6, 45), "amount_ml": 110,
         "feeding_type": "FORMULA", "extra_data": {"demoSeed": SEED_ID}},
        {"log_type": "URINE", "occurred_at": at(7, 40), "diaper_type": "URINE",
         "extra_data": {"demoSeed": SEED_ID}},
        {"log_type": "FEEDING", "occurred_at": at(9, 35), "amount_ml": 120,
         "feeding_type": "FORMULA", "extra_data": {"demoSeed": SEED_ID}},
        {"log_type": "SLEEP", "occurred_at": at(11, 5), "started_at": nap_start,
         "ended_at": at(11, 5), "extra_data": {"demoSeed": SEED_ID, "sleepType": "NAP"}},
        {"log_type": "URINE", "occurred_at": at(11, 35), "diaper_type": "URINE",
         "extra_data": {"demoSeed": SEED_ID}},
        {"log_type": "FEEDING", "occurred_at": at(12, 15), "amount_ml": 115,
         "feeding_type": "FORMULA", "extra_data": {"demoSeed": SEED_ID}},
    ]


def seed(db: Session, *, baby_id: int, expected_owner_id: int, apply: bool) -> int:
    baby = db.get(Baby, baby_id)
    if (baby is None or baby.owner_user_id != expected_owner_id
            or baby.name not in {"하린", "하린이"}
            or baby.birth_date != EXPECTED_BIRTH_DATE):
        raise ValueError("시연 대상 아기·보호자·생일이 예상과 달라 기록을 넣지 않았습니다.")

    added = 0
    for values in demo_plan():
        existing = db.scalar(select(CareLog.id).where(
            CareLog.baby_id == baby_id,
            CareLog.log_type == values["log_type"],
            CareLog.occurred_at == values["occurred_at"],
        ).limit(1))
        if existing is not None:
            continue
        added += 1
        if apply:
            db.add(CareLog(baby_id=baby_id, user_id=expected_owner_id, **values))

    if apply:
        db.commit()
    return added


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baby-id", type=int, required=True)
    parser.add_argument("--expected-owner-id", type=int, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        added = seed(db, baby_id=args.baby_id, expected_owner_id=args.expected_owner_id, apply=args.apply)
        print(f"mode={'apply' if args.apply else 'dry-run'} baby_id={args.baby_id} date={DEMO_DAY} new_records={added}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
