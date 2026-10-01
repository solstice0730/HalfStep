"""기록(care_logs) 집계 유틸. 홈 큐레이션, AI 대화 근거, 주간 리포트가 공유한다."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from statistics import pstdev

from sqlalchemy.orm import Session

from app.core.time import day_bounds, to_app_timezone
from app.models.records import CareLog
from app.repositories import calendar_repository


@dataclass(frozen=True)
class FeedingStats:
    count: int
    total_ml: int
    avg_interval_minutes: int | None
    interval_stdev_minutes: float | None
    last_interval_minutes: int | None


# 이보다 긴 간격은 밤중 공백이나 기록 누락으로 보고 "수유 리듬" 계산에서 제외한다.
MAX_RHYTHM_INTERVAL_MINUTES = 8 * 60


@dataclass(frozen=True)
class DailyFeeding:
    date: date
    count: int
    total_ml: int


def feeding_logs(logs: list[CareLog]) -> list[CareLog]:
    return sorted((log for log in logs if log.log_type == "FEEDING"), key=lambda log: (log.occurred_at, log.id))


def feeding_stats(logs: list[CareLog]) -> FeedingStats:
    feedings = feeding_logs(logs)
    total_ml = sum(log.amount_ml or 0 for log in feedings)
    raw_intervals = [
        round((later.occurred_at - earlier.occurred_at).total_seconds() / 60)
        for earlier, later in zip(feedings, feedings[1:])
    ]
    intervals = [minutes for minutes in raw_intervals if 0 < minutes <= MAX_RHYTHM_INTERVAL_MINUTES]
    avg = round(sum(intervals) / len(intervals)) if intervals else None
    stdev = round(pstdev(intervals), 1) if len(intervals) >= 2 else None
    return FeedingStats(
        count=len(feedings),
        total_ml=total_ml,
        avg_interval_minutes=avg,
        interval_stdev_minutes=stdev,
        last_interval_minutes=raw_intervals[-1] if raw_intervals else None,
    )


def sleep_minutes(log: CareLog) -> int:
    if log.started_at is None or log.ended_at is None:
        return 0
    return max(0, round((log.ended_at - log.started_at).total_seconds() / 60))


def sleep_total_minutes(logs: list[CareLog]) -> int:
    return sum(sleep_minutes(log) for log in logs if log.log_type == "SLEEP")


def nap_average_minutes(logs: list[CareLog]) -> int | None:
    durations = [sleep_minutes(log) for log in logs if log.log_type == "SLEEP" and sleep_minutes(log) > 0]
    return round(sum(durations) / len(durations)) if durations else None


def diaper_count(logs: list[CareLog]) -> int:
    return sum(1 for log in logs if log.log_type in {"URINE", "STOOL"})


def logs_in_days(db: Session, *, baby_id: int, end_date: date, days: int) -> list[CareLog]:
    """end_date를 포함해 뒤로 days일 동안의 기록(KST 날짜 경계)."""
    start_date = end_date - timedelta(days=days - 1)
    start_at, _ = day_bounds(start_date)
    _, end_at = day_bounds(end_date)
    return calendar_repository.list_logs_in_range(db, baby_id=baby_id, start_at=start_at, end_at=end_at)


def daily_feeding_series(logs: list[CareLog], *, end_date: date, days: int) -> list[DailyFeeding]:
    grouped: dict[date, list[CareLog]] = defaultdict(list)
    for log in feeding_logs(logs):
        local = to_app_timezone(log.occurred_at)
        if local is not None:
            grouped[local.date()].append(log)
    series = []
    for offset in range(days - 1, -1, -1):
        day = end_date - timedelta(days=offset)
        day_logs = grouped.get(day, [])
        series.append(DailyFeeding(date=day, count=len(day_logs), total_ml=sum(log.amount_ml or 0 for log in day_logs)))
    return series


def weekly_avg_daily_ml(logs: list[CareLog], *, end_date: date, days: int = 7) -> int | None:
    series = [day for day in daily_feeding_series(logs, end_date=end_date, days=days) if day.count > 0]
    if not series:
        return None
    return round(sum(day.total_ml for day in series) / len(series))


def format_minutes(minutes: int) -> str:
    hours, mins = divmod(minutes, 60)
    if hours and mins:
        return f"{hours}시간 {mins}분"
    if hours:
        return f"{hours}시간"
    return f"{mins}분"


def format_interval(minutes: int) -> str:
    """180 → '약 3시간', 150 → '약 2시간 30분', 45 → '약 45분'."""
    rounded = round(minutes / 15) * 15
    return f"약 {format_minutes(max(15, rounded))}"
