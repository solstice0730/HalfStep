from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.records import Baby, BabyCaregiver, CareLog
from app.models.user import User


def ensure_demo_caregivers(db: Session, baby: Baby) -> None:
    user_ids = set(db.scalars(select(User.id).where(User.id != baby.owner_user_id)).all())
    existing_ids = set(
        db.scalars(select(BabyCaregiver.user_id).where(BabyCaregiver.baby_id == baby.id)).all()
    )
    for user_id in sorted(user_ids - existing_ids):
        db.add(BabyCaregiver(baby_id=baby.id, user_id=user_id, role="CAREGIVER", relation="DEMO"))


def main() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.social_provider == "google", User.social_user_id == "records-demo"))
        if user is None:
            user = User(social_provider="google", social_user_id="records-demo", nickname="데모 보호자")
            db.add(user)
            db.flush()
        baby = db.scalar(select(Baby).where(Baby.owner_user_id == user.id, Baby.name == "리몽"))
        if baby is None:
            baby = Baby(owner_user_id=user.id, name="리몽", birth_date=date.today() - timedelta(days=45), gender="UNKNOWN")
            db.add(baby)
            db.flush()
        ensure_demo_caregivers(db, baby)
        if db.scalar(select(CareLog.id).where(CareLog.baby_id == baby.id).limit(1)) is None:
            now = datetime.now().replace(microsecond=0)
            db.add_all([
                CareLog(baby_id=baby.id, user_id=user.id, log_type="FEEDING", occurred_at=now - timedelta(hours=3), amount_ml=120, feeding_type="FORMULA", extra_data={"burped": True}),
                CareLog(baby_id=baby.id, user_id=user.id, log_type="SLEEP", occurred_at=now - timedelta(hours=1), started_at=now - timedelta(hours=2), ended_at=now - timedelta(hours=1), extra_data={"sleepType": "NAP", "status": "PEACEFUL"}),
                CareLog(baby_id=baby.id, user_id=user.id, log_type="URINE", occurred_at=now - timedelta(minutes=40), diaper_type="URINE", extra_data={"amount": "MEDIUM", "color": "NORMAL"}),
                CareLog(baby_id=baby.id, user_id=user.id, log_type="STOOL", occurred_at=now - timedelta(minutes=15), diaper_type="STOOL", extra_data={"amount": "SMALL", "color": "GREEN", "form": "SOFT"}),
            ])
        db.commit()
        print(f"demo_user_id={user.id} demo_baby_id={baby.id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
