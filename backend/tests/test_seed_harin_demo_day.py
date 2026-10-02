from datetime import date

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import Baby, CareLog, User
from scripts.seed_harin_demo_day import DEMO_DAY, SEED_ID, demo_plan, seed


def test_demo_morning_is_guarded_idempotent_and_preserves_existing_record():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        owner = User(social_provider="google", social_user_id="demo-morning-test")
        db.add(owner)
        db.flush()
        baby = Baby(owner_user_id=owner.id, name="하린", birth_date=date(2026, 7, 11), gender="FEMALE")
        db.add(baby)
        db.flush()
        existing = CareLog(
            baby_id=baby.id, user_id=owner.id, log_type="FEEDING",
            occurred_at=demo_plan()[1]["occurred_at"], amount_ml=99,
            feeding_type="FORMULA", extra_data={},
        )
        db.add(existing)
        db.commit()
        baby_id, owner_id, existing_id = baby.id, owner.id, existing.id

        assert DEMO_DAY == date(2026, 10, 2)
        assert seed(db, baby_id=baby_id, expected_owner_id=owner_id, apply=False) == 6
        assert db.scalar(select(func.count(CareLog.id)).where(CareLog.baby_id == baby_id)) == 1
        assert seed(db, baby_id=baby_id, expected_owner_id=owner_id, apply=True) == 6
        assert db.get(CareLog, existing_id).amount_ml == 99
        assert db.scalar(select(func.count(CareLog.id)).where(CareLog.baby_id == baby_id)) == 7
        assert seed(db, baby_id=baby_id, expected_owner_id=owner_id, apply=True) == 0
        seeded = db.scalars(select(CareLog).where(CareLog.baby_id == baby_id, CareLog.id != existing_id)).all()
        assert all(log.extra_data["demoSeed"] == SEED_ID for log in seeded)

        db.get(Baby, baby_id).birth_date = date(2026, 7, 10)
        db.flush()
        try:
            seed(db, baby_id=baby_id, expected_owner_id=owner_id, apply=True)
        except ValueError:
            pass
        else:
            raise AssertionError("Wrong birth date must block the seed")
    engine.dispose()
