from datetime import date, datetime, time, timedelta, timezone

APP_TIMEZONE = timezone(timedelta(hours=9), "Asia/Seoul")


def to_utc_naive(value: datetime) -> datetime:
    aware = value if value.tzinfo is not None else value.replace(tzinfo=APP_TIMEZONE)
    return aware.astimezone(timezone.utc).replace(tzinfo=None)


def to_app_timezone(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    aware = value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
    return aware.astimezone(APP_TIMEZONE)


def day_bounds(target_date: date) -> tuple[datetime, datetime]:
    local_start = datetime.combine(target_date, time.min, tzinfo=APP_TIMEZONE)
    return to_utc_naive(local_start), to_utc_naive(local_start + timedelta(days=1))


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    local_start = datetime(year, month, 1, tzinfo=APP_TIMEZONE)
    if month == 12:
        local_end = datetime(year + 1, 1, 1, tzinfo=APP_TIMEZONE)
    else:
        local_end = datetime(year, month + 1, 1, tzinfo=APP_TIMEZONE)
    return to_utc_naive(local_start), to_utc_naive(local_end)
