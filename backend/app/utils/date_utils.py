from datetime import date, datetime, timezone


def age_in_days(birth_date: date) -> int:
    return max(0, (datetime.now(timezone.utc).date() - birth_date).days)


def age_in_months(birth_date: date) -> int:
    today = datetime.now(timezone.utc).date()
    months = (today.year - birth_date.year) * 12 + (today.month - birth_date.month)
    return max(0, months)
