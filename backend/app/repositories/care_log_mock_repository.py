from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class CareLogRecord:
    type: str  # "feeding" | "sleep" | "diaper"
    time: str
    note: str


# Epic C(CareLog API)가 붙기 전까지 쓰는 목업 데이터.
# get_care_logs_for_day 시그니처는 실제 리포지토리로 교체될 때도 그대로 유지한다.
_MOCK_CARE_LOGS: dict[str, list[CareLogRecord]] = {
    "demo-baby-1": [
        CareLogRecord(type="feeding", time="07:15", note="분유 120ml"),
        CareLogRecord(type="diaper", time="08:00", note="소변"),
        CareLogRecord(type="sleep", time="09:00", note="낮잠 1시간 30분"),
        CareLogRecord(type="feeding", time="11:30", note="모유 수유 20분"),
        CareLogRecord(type="diaper", time="12:15", note="대변, 정상 색"),
        CareLogRecord(type="sleep", time="13:30", note="낮잠 45분"),
        CareLogRecord(type="feeding", time="18:00", note="분유 150ml"),
    ],
}


def get_care_logs_for_day(baby_id: str, target_date: date) -> list[CareLogRecord]:
    return list(_MOCK_CARE_LOGS.get(baby_id, []))
