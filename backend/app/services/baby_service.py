from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.baby import Baby
from app.core.time import day_bounds
from app.repositories import calendar_repository, records_repository
from app.repositories.baby_repository import (
    activate_baby,
    create_baby,
    delete_baby,
    get_active_baby,
    get_babies_by_user,
    get_baby_by_id,
    update_baby,
)
from app.utils.date_utils import age_in_days, age_in_months
from app.services import records as records_service
from app.services import stats
from app.services.diary_service import get_diary_by_date_service


def get_my_babies(db: Session, user_id: int) -> list[Baby]:
    return get_babies_by_user(db, user_id)


def create_baby_profile(
    db: Session,
    user_id: int,
    name: str,
    birth_date: date,
    gender: str,
) -> Baby:
    baby = create_baby(db, user_id=user_id, name=name, birth_date=birth_date, gender=gender)
    db.commit()
    db.refresh(baby)
    return baby


def update_baby_profile(
    db: Session,
    user_id: int,
    baby_id: int,
    name: str | None,
    gender: str | None,
) -> Baby:
    baby = _get_owned_baby(db, user_id, baby_id)
    baby = update_baby(db, baby, name=name, gender=gender)
    db.commit()
    db.refresh(baby)
    return baby


def activate_baby_profile(db: Session, user_id: int, baby_id: int) -> Baby:
    baby = activate_baby(db, user_id=user_id, baby_id=baby_id)
    if baby is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Baby not found.")
    db.commit()
    return baby


def delete_baby_profile(db: Session, user_id: int, baby_id: int) -> None:
    baby = _get_owned_baby(db, user_id, baby_id)
    records_repository.delete_logs_for_baby(db, baby_id=baby.id)
    delete_baby(db, baby)
    db.commit()


def get_dashboard(db: Session, user_id: int, baby_id: int | None) -> dict:
    if baby_id is not None:
        baby = _get_owned_baby(db, user_id, baby_id)
    else:
        baby = get_active_baby(db, user_id)
        if baby is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active baby profile. Please create one first.",
            )

    today = records_service.current_date()
    start_at, end_at = day_bounds(today)
    today_logs = calendar_repository.list_logs_in_range(
        db, baby_id=baby.id, start_at=start_at, end_at=end_at
    )
    week_logs = stats.logs_in_days(db, baby_id=baby.id, end_date=today, days=7)
    diary = get_diary_by_date_service(db, user_id=user_id, baby_id=baby.id, diary_date=today)
    age_days = age_in_days(baby.birth_date)
    age_months = age_in_months(baby.birth_date)

    today_feeding = stats.feeding_stats(today_logs)
    summary = records_service.summarize_logs(today_logs)
    summary["feedingTotalMl"] = today_feeding.total_ml
    summary["lastFeedingIntervalMinutes"] = today_feeding.last_interval_minutes
    summary["photoCount"] = len(diary.imageUrls) if diary is not None else 0
    summary["diarySaved"] = diary is not None

    curation = build_curation(
        age_days=age_days,
        age_months=age_months,
        today=today_feeding,
        weekly_avg_ml=stats.weekly_avg_daily_ml(week_logs, end_date=today),
    )

    return {
        "baby": {
            "id": baby.id,
            "name": baby.name,
            "ageInDays": age_days,
            "ageInMonths": age_months,
        },
        "todaySummary": summary,
        "aiSummary": None,
        "curation": curation,
        "curationCards": [curation],
        "activeTimer": None,
    }


CURATION_HEADLINE = "오늘의 맞춤 큐레이션"
DEFAULT_CURATION_TEXT = (
    "이 시기에는 수유 텀과 낮잠 리듬이 조금씩 달라져요. "
    "오늘은 수유 간격, 낮잠 길이, 배변 변화를 같이 확인해보세요."
)
CURATION_CHIPS_BY_STAGE = {
    "newborn": ["수유 신호", "밤낮 구분", "배변 체크"],
    "infant": ["수유 신호", "낮잠 루틴", "배변 체크"],
    "weaning": ["이유식 반응", "낮잠 루틴", "배변 변화"],
}


def build_curation(
    *, age_days: int, age_months: int, today: stats.FeedingStats, weekly_avg_ml: int | None
) -> dict:
    """오늘 누적 수유량을 최근 7일 일평균과 비교해 규칙 기반 큐레이션 문장을 만든다."""
    stage = "newborn" if age_months < 2 else "infant" if age_months < 6 else "weaning"
    basis = [f"생후 {age_days}일"]
    if today.count == 0:
        text = DEFAULT_CURATION_TEXT
    else:
        basis.append(f"오늘 수유 {today.count}회")
        text = f"오늘 누적 수유량은 {today.total_ml}ml예요. "
        if weekly_avg_ml:
            basis.append(f"최근 7일 평균 {weekly_avg_ml}ml")
            ratio = today.total_ml / weekly_avg_ml
            if ratio > 1.15:
                text += "최근 7일 평균보다 조금 많은 편이에요. "
            elif ratio < 0.85 and today.count >= 3:
                text += "최근 7일 평균보다 조금 적은 편이에요. "
            else:
                text += "최근 7일 범위와 비슷하며, "
        if today.avg_interval_minutes:
            text += f"수유 간격은 {stats.format_interval(today.avg_interval_minutes)}이에요. "
        text += "다음 수유는 아이 신호를 함께 확인해 주세요."
    return {
        "headline": CURATION_HEADLINE,
        "text": text,
        "chips": CURATION_CHIPS_BY_STAGE[stage],
        "basis": basis,
    }


def _get_owned_baby(db: Session, user_id: int, baby_id: int) -> Baby:
    baby = get_baby_by_id(db, baby_id)
    if baby is None or baby.owner_user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Baby not found.")
    return baby
