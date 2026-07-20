from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.baby import Baby
from app.models.records import CareLog
from app.models.user import User


def select_demo_owner(db: Session) -> User:
    user = db.scalar(
        select(User).where(User.social_user_id != "records-demo").order_by(User.id.desc()).limit(1)
    )
    if user is not None:
        return user
    user = db.scalar(select(User).where(User.social_provider == "google", User.social_user_id == "records-demo"))
    if user is None:
        user = User(social_provider="google", social_user_id="records-demo", nickname="데모 보호자")
        db.add(user)
        db.flush()
    return user


def main() -> None:
    db = SessionLocal()
    try:
        user = select_demo_owner(db)
        baby = db.scalar(select(Baby).where(Baby.name == "리몽").order_by(Baby.id).limit(1))
        if baby is None:
            baby = Baby(owner_user_id=user.id, name="리몽", birth_date=date.today() - timedelta(days=45), gender="UNKNOWN")
            db.add(baby)
            db.flush()
        elif baby.owner_user_id != user.id:
            baby.owner_user_id = user.id
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
