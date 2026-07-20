from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

from app.core.time import day_bounds, month_bounds, to_app_timezone
from app.models.diary import Diary
from app.models.records import CareLog
from app.models.user import User
from app.repositories import calendar_repository
from app.services.diary_service import get_diary_by_date_service
from app.services.records import require_baby_access

RECORD_TYPE_ORDER = ("FEEDING", "SLEEP", "URINE", "STOOL")
AMOUNT_LABELS = {"SMALL": "적음", "MEDIUM": "보통", "LARGE": "많음"}
COLOR_LABELS = {
    "NORMAL": "정상",
    "DARK_YELLOW": "진한 노랑",
    "PINK": "분홍",
    "RED": "빨강",
    "GREEN": "초록",
    "BLACK": "검정",
    "WHITE": "흰색",
    "OTHER": "기타",
}
FORM_LABELS = {
    "WATERY": "묽은 변",
    "SOFT": "무른 변",
    "NORMAL": "보통 변",
    "HARD": "단단한 변",
}


def get_month(
    db: Session, *, user: User, baby_id: int, year: int, month: int
) -> dict:
    require_baby_access(db, baby_id, user)
    start_at, end_at = month_bounds(year, month)
    logs = calendar_repository.list_logs_in_range(
        db, baby_id=baby_id, start_at=start_at, end_at=end_at
    )
    start_date = date(year, month, 1)
    end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    diaries = calendar_repository.list_diaries_in_range(
        db, baby_id=baby_id, start_date=start_date, end_date=end_date
    )

    grouped: dict[str, list[CareLog]] = defaultdict(list)
    for log in logs:
        occurred_at = to_app_timezone(log.occurred_at)
        if occurred_at is not None:
            grouped[occurred_at.date().isoformat()].append(log)

    diaries_by_date = {diary.diary_date.isoformat(): diary for diary in diaries}
    days = []
    for target_date in sorted(set(grouped) | set(diaries_by_date)):
        day_logs = grouped[target_date]
        diary = diaries_by_date.get(target_date)
        counts = {record_type: 0 for record_type in RECORD_TYPE_ORDER}
        for log in day_logs:
            if log.log_type in counts:
                counts[log.log_type] += 1
        days.append(
            {
                "date": target_date,
                "hasDiary": diary is not None,
                "thumbnailUrl": _diary_thumbnail(diary),
                "recordCount": len(day_logs),
                "recordTypes": [
                    record_type for record_type in RECORD_TYPE_ORDER if counts[record_type]
                ],
                "recordCounts": {
                    "feeding": counts["FEEDING"],
                    "sleep": counts["SLEEP"],
                    "urine": counts["URINE"],
                    "stool": counts["STOOL"],
                },
            }
        )
    return {"year": year, "month": month, "days": days}


def get_day(db: Session, *, user: User, baby_id: int, target_date: date) -> dict:
    require_baby_access(db, baby_id, user)
    start_at, end_at = day_bounds(target_date)
    logs = calendar_repository.list_logs_in_range(
        db, baby_id=baby_id, start_at=start_at, end_at=end_at
    )
    diary = get_diary_by_date_service(
        db, user_id=user.id, baby_id=baby_id, diary_date=target_date
    )
    summary = {
        "feedingCount": 0,
        "sleepTotalMinutes": 0,
        "urineCount": 0,
        "stoolCount": 0,
    }
    timeline = []
    for log in logs:
        if log.log_type == "FEEDING":
            summary["feedingCount"] += 1
        elif log.log_type == "SLEEP":
            summary["sleepTotalMinutes"] += _sleep_minutes(log)
        elif log.log_type == "URINE":
            summary["urineCount"] += 1
        elif log.log_type == "STOOL":
            summary["stoolCount"] += 1
        timeline.append(
            {
                "id": str(log.id),
                "type": log.log_type,
                "time": to_app_timezone(log.occurred_at),
                "summary": _record_summary(log),
            }
        )
    return {
        "date": target_date.isoformat(),
        "diary": diary,
        "timeline": timeline,
        "daySummary": summary,
    }


def _diary_thumbnail(diary: Diary | None) -> str | None:
    if diary is None or not diary.photos:
        return None
    return min(diary.photos, key=lambda photo: photo.sort_order).image_url


def _sleep_minutes(log: CareLog) -> int:
    if log.started_at is None or log.ended_at is None:
        return 0
    return max(0, round((log.ended_at - log.started_at).total_seconds() / 60))


def _record_summary(log: CareLog) -> str:
    content = log.extra_data or {}
    if log.log_type == "FEEDING":
        if log.feeding_type == "FORMULA":
            return f"분유 {log.amount_ml or 0}ml"
        if log.feeding_type == "MIXED":
            return "혼합 수유"
        return f"모유 {content.get('durationMinutes') or 0}분"
    if log.log_type == "SLEEP":
        minutes = _sleep_minutes(log)
        hours, remainder = divmod(minutes, 60)
        duration = f"{hours}시간" if hours else ""
        if remainder:
            duration += f"{' ' if duration else ''}{remainder}분"
        return f"수면 {duration or '0분'}"

    parts = ["소변" if log.log_type == "URINE" else "대변"]
    amount = content.get("amount")
    color = content.get("color")
    form = content.get("form")
    if amount:
        parts.append(AMOUNT_LABELS.get(amount, amount))
    if color:
        parts.append(COLOR_LABELS.get(color, color))
    if log.log_type == "STOOL" and form:
        parts.append(FORM_LABELS.get(form, form))
    return " · ".join(parts)
