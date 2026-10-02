from datetime import datetime, timedelta

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.time import APP_TIMEZONE
from app.db.base import Base
from app.models import Baby, CareLog, Diary, DiaryMaterial, User
from scripts.seed_harin_rehearsal import record_plan, seed


def test_rehearsal_seed_preserves_existing_data_and_is_idempotent():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    through = datetime.now(APP_TIMEZONE).date()
    original_birth = through - timedelta(days=83)
    new_birth = original_birth + timedelta(days=1)

    with Session(engine) as db:
        owner = User(social_provider="google", social_user_id="rehearsal-test")
        db.add(owner)
        db.flush()
        baby = Baby(owner_user_id=owner.id, name="하린이", birth_date=original_birth, gender="UNKNOWN")
        db.add(baby)
        db.flush()
        existing_time = record_plan(through, final_day=True)[0]["occurred_at"]
        original = CareLog(
            baby_id=baby.id, user_id=owner.id, log_type="FEEDING",
            occurred_at=existing_time, amount_ml=99, feeding_type="FORMULA", extra_data={},
        )
        db.add(original)
        db.commit()
        baby_id, owner_id, original_id = baby.id, owner.id, original.id

        preview = seed(
            db, baby_id=baby_id, expected_owner_id=owner_id,
            expected_birth_date=original_birth, new_birth_date=new_birth,
            through=through, apply=False,
        )
        assert preview == {"profile": 1, "records": 96, "diaries": 2, "materials": 1}
        db.rollback()
        assert db.get(Baby, baby_id).birth_date == original_birth
        assert db.scalar(select(func.count(CareLog.id)).where(CareLog.baby_id == baby_id)) == 1

        applied = seed(
            db, baby_id=baby_id, expected_owner_id=owner_id,
            expected_birth_date=original_birth, new_birth_date=new_birth,
            through=through, apply=True,
        )
        assert applied == preview
        assert db.get(Baby, baby_id).birth_date == new_birth
        assert db.get(CareLog, original_id).amount_ml == 99
        assert db.scalar(select(func.count(CareLog.id)).where(CareLog.baby_id == baby_id)) == 97
        assert db.scalar(select(func.count(Diary.id)).where(Diary.baby_id == baby_id)) == 2
        assert db.scalar(select(func.count(DiaryMaterial.id)).where(DiaryMaterial.baby_id == baby_id)) == 1

        again = seed(
            db, baby_id=baby_id, expected_owner_id=owner_id,
            expected_birth_date=new_birth, new_birth_date=None,
            through=through, apply=True,
        )
        assert again == {"profile": 0, "records": 0, "diaries": 0, "materials": 0}
    engine.dispose()
