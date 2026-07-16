from collections import defaultdict

from sqlalchemy.orm import Session

from app.core.time import month_bounds, to_app_timezone
from app.models.records import CareLog
from app.models.user import User
from app.repositories import calendar_repository
from app.services.records import require_baby_access

RECORD_TYPE_ORDER = ("FEEDING", "SLEEP", "URINE", "STOOL")


def get_month(
    db: Session, *, user: User, baby_id: int, year: int, month: int
) -> dict:
    require_baby_access(db, baby_id, user)
    start_at, end_at = month_bounds(year, month)
    logs = calendar_repository.list_logs_in_range(
        db, baby_id=baby_id, start_at=start_at, end_at=end_at
    )
    grouped: dict[str, list[CareLog]] = defaultdict(list)
    for log in logs:
        occurred_at = to_app_timezone(log.occurred_at)
        if occurred_at is not None:
            grouped[occurred_at.date().isoformat()].append(log)

    days = []
    for target_date in sorted(grouped):
        day_logs = grouped[target_date]
        counts = {record_type: 0 for record_type in RECORD_TYPE_ORDER}
        for log in day_logs:
            if log.log_type in counts:
                counts[log.log_type] += 1
        days.append(
            {
                "date": target_date,
                "hasDiary": False,
                "thumbnailUrl": None,
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
