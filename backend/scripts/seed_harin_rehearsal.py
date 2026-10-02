"""Add idempotent synthetic history for one explicitly identified local baby.

Dry run by default. Existing records are never changed. A birth-date change
requires both the expected current date and an explicit new date.
"""

import argparse
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time import APP_TIMEZONE, to_utc_naive
from app.db.session import SessionLocal
from app.models.baby import Baby
from app.models.diary import Diary
from app.models.diary_material import DiaryMaterial
from app.models.records import CareLog


SEED_ID = "harin-rehearsal-2026-10-01-v1"


def local_at(day: date, hour: int, minute: int) -> datetime:
    return datetime.combine(day, time(hour, minute), tzinfo=APP_TIMEZONE)


def record_plan(day: date, *, final_day: bool) -> list[dict]:
    offset = (day.toordinal() % 5 - 2) * 5
    feedings = [(6, 45, 120), (9, 50, 110), (12, 40, 130), (15, 50, 115), (18, 40, 125)]
    if not final_day:
        feedings.append((21, 40, 110))

    plan: list[dict] = []
    for hour, minute, amount in feedings:
        plan.append({
            "log_type": "FEEDING",
            "occurred_at": to_utc_naive(local_at(day, hour, minute)),
            "amount_ml": amount + offset,
            "feeding_type": "FORMULA",
            "extra_data": {"demoSeed": SEED_ID, "burped": True},
        })

    sleep_periods = [
        (day - timedelta(days=1), 22, 0, day, 6, 15, "NIGHT"),
        (day, 10, 20, day, 11, 10, "NAP"),
        (day, 14, 40, day, 15, 50, "NAP"),
    ]
    for start_day, start_hour, start_minute, end_day, end_hour, end_minute, sleep_type in sleep_periods:
        start = to_utc_naive(local_at(start_day, start_hour, start_minute))
        end = to_utc_naive(local_at(end_day, end_hour, end_minute))
        plan.append({
            "log_type": "SLEEP",
            "occurred_at": end,
            "started_at": start,
            "ended_at": end,
            "extra_data": {"demoSeed": SEED_ID, "sleepType": sleep_type, "status": "PEACEFUL"},
        })

    for hour, minute in [(8, 15), (11, 50), (16, 40), (21, 0)]:
        plan.append({
            "log_type": "URINE",
            "occurred_at": to_utc_naive(local_at(day, hour, minute)),
            "diaper_type": "URINE",
            "extra_data": {"demoSeed": SEED_ID, "amount": "MEDIUM", "color": "NORMAL"},
        })
    plan.append({
        "log_type": "STOOL",
        "occurred_at": to_utc_naive(local_at(day, 14, 10)),
        "diaper_type": "STOOL",
        "extra_data": {"demoSeed": SEED_ID, "amount": "SMALL", "color": "NORMAL", "form": "SOFT"},
    })
    return plan


def seed(
    db: Session, *, baby_id: int, expected_owner_id: int,
    expected_birth_date: date, new_birth_date: date | None,
    through: date, apply: bool,
) -> dict:
    baby = db.get(Baby, baby_id)
    if baby is None or baby.owner_user_id != expected_owner_id or baby.name not in {"하린", "하린이"}:
        raise ValueError("대상 아기 ID, 보호자 ID, 이름이 일치하지 않습니다.")
    if baby.birth_date != expected_birth_date:
        raise ValueError("아기 생일이 예상과 달라 데이터를 넣지 않았습니다.")
    if through < expected_birth_date or through > datetime.now(APP_TIMEZONE).date():
        raise ValueError("마지막 날짜는 생일 이후이면서 오늘 이하여야 합니다.")

    first_day = through - timedelta(days=6)
    counts = {"profile": int(new_birth_date is not None and new_birth_date != baby.birth_date), "records": 0, "diaries": 0, "materials": 0}
    if new_birth_date is not None:
        if new_birth_date > through:
            raise ValueError("새 생일은 기록 날짜보다 늦을 수 없습니다.")
        if apply:
            baby.birth_date = new_birth_date
    for day_index in range(7):
        day = first_day + timedelta(days=day_index)
        for values in record_plan(day, final_day=day == through):
            existing = db.scalar(select(CareLog.id).where(
                CareLog.baby_id == baby_id,
                CareLog.log_type == values["log_type"],
                CareLog.occurred_at == values["occurred_at"],
            ).limit(1))
            if existing is not None:
                continue
            counts["records"] += 1
            if apply:
                db.add(CareLog(baby_id=baby_id, user_id=expected_owner_id, **values))

    diary_samples = [
        (through - timedelta(days=3), "낮잠 뒤 함께 웃은 오후", "오전 수유와 낮잠을 기록했다. 낮잠에서 깬 뒤 하린이와 눈을 맞추며 잠깐 놀았고, 저녁에는 평소처럼 하루를 마무리했다."),
        (through - timedelta(days=1), "차분하게 흘러간 하루", "수유와 기저귀, 낮잠 시간을 남겨 보니 하루의 흐름이 한눈에 보였다. 짧은 순간이지만 오늘의 모습을 기록해 두고 싶었다."),
    ]
    for diary_date, title, content in diary_samples:
        existing = db.scalar(select(Diary.id).where(Diary.baby_id == baby_id, Diary.diary_date == diary_date).limit(1))
        if existing is not None:
            continue
        counts["diaries"] += 1
        if apply:
            db.add(Diary(
                baby_id=baby_id, user_id=expected_owner_id, diary_date=diary_date,
                title=title, content=content, is_ai_generated=False,
                notice="시연용 예시 일기입니다.", highlights='["시연용 기록"]',
            ))

    memo_date = through - timedelta(days=1)
    existing_memo = db.scalar(select(DiaryMaterial.id).where(
        DiaryMaterial.baby_id == baby_id,
        DiaryMaterial.material_date == memo_date,
        DiaryMaterial.source == "MEMO",
    ).limit(1))
    if existing_memo is None:
        counts["materials"] += 1
        if apply:
            db.add(DiaryMaterial(
                baby_id=baby_id, user_id=expected_owner_id, material_date=memo_date,
                source="MEMO", content="시연용 메모: 낮잠 후 눈을 맞추며 함께 놀았다.",
            ))

    if apply:
        db.commit()
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baby-id", type=int, required=True)
    parser.add_argument("--expected-owner-id", type=int, required=True)
    parser.add_argument("--expected-birth-date", type=date.fromisoformat, required=True)
    parser.add_argument("--new-birth-date", type=date.fromisoformat)
    parser.add_argument("--through", type=date.fromisoformat, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        counts = seed(
            db, baby_id=args.baby_id, expected_owner_id=args.expected_owner_id,
            expected_birth_date=args.expected_birth_date, new_birth_date=args.new_birth_date,
            through=args.through, apply=args.apply,
        )
        print(f"mode={'apply' if args.apply else 'dry-run'} baby_id={args.baby_id} through={args.through} new={counts}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
