"""주간 리포트: 최근 7일 패턴을 직전 7일과 비교하고 월령별 공공기관 자료 큐레이션을 붙인다."""

import json
import logging
import re
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.baby import Baby
from app.models.user import User
from app.repositories import records_repository
from app.services import stats
from app.services.llm import LlmError, get_llm_client
from app.utils.date_utils import age_in_days, age_in_months
from app.utils.korean import with_i

logger = logging.getLogger(__name__)

CURATION_REVIEWED_AT = "2026.09"

# 월령 구간별 참고 자료. 특정 문서 URL이 아니라 기관 홈을 연결해 링크가 깨지지 않도록 한다.
CURATION_CATALOG: list[dict] = [
    {
        "minMonths": 0, "maxMonths": 5,
        "title": "수유 신호와 간격 확인",
        "source": "질병관리청 국가건강정보포털",
        "url": "https://health.kdca.go.kr",
    },
    {
        "minMonths": 0, "maxMonths": 2,
        "title": "신생아 안전한 수면 환경",
        "source": "질병관리청 국가건강정보포털",
        "url": "https://health.kdca.go.kr",
    },
    {
        "minMonths": 2, "maxMonths": 11,
        "title": "월령별 수면 리듬 안내",
        "source": "육아정책연구소 자료",
        "url": "https://www.kicce.re.kr",
    },
    {
        "minMonths": 4, "maxMonths": 8,
        "title": "이유식 시작 시기와 단계",
        "source": "질병관리청 국가건강정보포털",
        "url": "https://health.kdca.go.kr",
    },
    {
        "minMonths": 6, "maxMonths": 24,
        "title": "이유식 식단과 알레르기 주의",
        "source": "질병관리청 국가건강정보포털",
        "url": "https://health.kdca.go.kr",
    },
    {
        "minMonths": 9, "maxMonths": 24,
        "title": "영유아 발달 선별 안내",
        "source": "질병관리청 국가건강정보포털",
        "url": "https://health.kdca.go.kr",
    },
]

FOCUS_BY_STAGE = {
    "newborn": ["밤중 수유", "밤낮 구분", "배변 변화"],
    "infant": ["저녁 수유", "낮잠 길이", "배변 변화"],
    "weaning": ["이유식 반응", "낮잠 길이", "배변 변화"],
}


def get_weekly_report(db: Session, *, user: User, baby_id: int, end_date: date) -> dict:
    baby = records_repository.get_accessible_baby(db, baby_id=baby_id, user_id=user.id)
    if baby is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Baby not found.")

    start_date = end_date - timedelta(days=6)
    prev_end = start_date - timedelta(days=1)
    current_logs = stats.logs_in_days(db, baby_id=baby.id, end_date=end_date, days=7)
    previous_logs = stats.logs_in_days(db, baby_id=baby.id, end_date=prev_end, days=7)

    current_feeding = stats.feeding_stats(current_logs)
    previous_feeding = stats.feeding_stats(previous_logs)
    daily = stats.daily_feeding_series(current_logs, end_date=end_date, days=7)
    nap_now = stats.nap_average_minutes(current_logs)
    nap_prev = stats.nap_average_minutes(previous_logs)
    diaper_now = stats.diaper_count(current_logs)
    diaper_prev = stats.diaper_count(previous_logs)
    change_percent = _change_percent(current_feeding.total_ml, previous_feeding.total_ml)
    nap_change = (nap_now - nap_prev) if nap_now is not None and nap_prev is not None else None

    age_months = age_in_months(baby.birth_date)
    insight = build_insight(
        current=current_feeding,
        previous=previous_feeding,
        change_percent=change_percent,
        nap_change=nap_change,
        record_count=len(current_logs),
    )
    if len(current_logs) >= 3:
        insight = polish_insight(
            insight,
            baby_name=baby.name,
            facts={
                "수유 횟수": current_feeding.count,
                "총 수유량(ml)": current_feeding.total_ml,
                "지난주 총 수유량(ml)": previous_feeding.total_ml,
                "지난주 대비 변화(%)": change_percent,
                "평균 수유 간격(분)": current_feeding.avg_interval_minutes,
                "지난주 평균 수유 간격(분)": previous_feeding.avg_interval_minutes,
                "낮잠 평균(분)": nap_now,
                "지난주 낮잠 평균(분)": nap_prev,
                "배변 횟수": diaper_now,
            },
        )
    return {
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "baby": {"id": baby.id, "name": baby.name, "ageDays": age_in_days(baby.birth_date), "ageMonths": age_months},
        "insight": insight,
        "feeding": {
            "daily": [{"date": day.date.isoformat(), "count": day.count, "totalMl": day.total_ml} for day in daily],
            "count": current_feeding.count,
            "totalMl": current_feeding.total_ml,
            "prevTotalMl": previous_feeding.total_ml,
            "changePercent": change_percent,
            "avgIntervalMinutes": current_feeding.avg_interval_minutes,
            "prevAvgIntervalMinutes": previous_feeding.avg_interval_minutes,
        },
        "sleep": {
            "totalMinutes": stats.sleep_total_minutes(current_logs),
            "avgNapMinutes": nap_now,
            "prevAvgNapMinutes": nap_prev,
            "changeMinutes": nap_change,
        },
        "diaper": {"count": diaper_now, "prevCount": diaper_prev},
        "curations": curations_for_age(age_months),
        "nextWeekFocus": FOCUS_BY_STAGE[_stage(age_months)],
    }


def build_insight(
    *,
    current: stats.FeedingStats,
    previous: stats.FeedingStats,
    change_percent: int | None,
    nap_change: int | None,
    record_count: int,
) -> dict:
    """규칙 기반 핵심 변화 헤드라인. 가장 뚜렷한 신호 하나를 고른다."""
    if record_count < 3:
        return {
            "headline": "기록을 조금 더 모아볼까요",
            "body": "일주일 동안 수유·수면·배변을 꾸준히 남기면 다음 주부터 변화 신호를 정리해 드릴게요.",
        }

    interval_text = (
        f"수유 간격은 평균 {stats.format_interval(current.avg_interval_minutes).replace('약 ', '')} 안팎"
        if current.avg_interval_minutes
        else "수유 간격은 아직 비교할 기록이 적어요"
    )
    amount_text = (
        "하루 누적량은 완만하게 늘었고"
        if change_percent is not None and change_percent > 0
        else "하루 누적량은 지난주보다 조금 줄었고"
        if change_percent is not None and change_percent < 0
        else "하루 누적량은 지난주와 비슷했고"
    )

    rhythm_improved = (
        current.interval_stdev_minutes is not None
        and previous.interval_stdev_minutes is not None
        and current.interval_stdev_minutes < previous.interval_stdev_minutes
    )
    if rhythm_improved:
        return {
            "headline": "수유 리듬이 더 일정해졌어요",
            "body": f"{amount_text}, {interval_text}으로 안정됐습니다.",
        }
    if change_percent is not None and change_percent >= 10:
        return {
            "headline": "수유량이 눈에 띄게 늘었어요",
            "body": f"지난주보다 {change_percent}% 늘었고, {interval_text}이에요.",
        }
    if nap_change is not None and nap_change >= 20:
        return {
            "headline": "낮잠이 길어졌어요",
            "body": f"낮잠 한 번이 평균 {nap_change}분 길어졌어요. {amount_text}, {interval_text}이에요.",
        }
    if change_percent is not None and change_percent <= -10:
        return {
            "headline": "수유량이 지난주보다 줄었어요",
            "body": f"지난주보다 {abs(change_percent)}% 줄었어요. 아이 신호와 컨디션을 함께 살펴보세요.",
        }
    return {
        "headline": "이번 주 리듬이 안정적으로 유지됐어요",
        "body": f"{amount_text}, {interval_text}이에요.",
    }


def curations_for_age(age_months: int) -> list[dict]:
    items = [
        {"title": item["title"], "source": item["source"], "reviewedAt": CURATION_REVIEWED_AT, "url": item["url"]}
        for item in CURATION_CATALOG
        if item["minMonths"] <= age_months <= item["maxMonths"]
    ]
    return items[:3]


def _stage(age_months: int) -> str:
    return "newborn" if age_months < 2 else "infant" if age_months < 6 else "weaning"


def _change_percent(current: int, previous: int) -> int | None:
    if previous <= 0:
        return None
    return round((current - previous) / previous * 100)


INSIGHT_SYSTEM_PROMPT = (
    "너는 아기의 일주일 기록을 지켜본 육아코치야. 주어진 수치만 근거로 부모에게 보여줄 핵심 변화를 쓴다.\n"
    "- headline: 12~20자, 가장 뚜렷한 변화 하나를 담은 문장형 제목(예: '수유 리듬이 더 일정해졌어요').\n"
    "- body: 1~2문장, 해요체 또는 합니다체, 숫자는 주어진 값만 쓰고 반올림해서 자연스럽게(분은 '약 3시간'처럼).\n"
    "- '데이터', '분석', 'AI', '기록에 따르면' 같은 말과 이모지·목록은 쓰지 않는다. 의료 판단은 하지 않는다.\n"
    '- 반드시 {"headline": string, "body": string} JSON으로만 응답한다.'
)


def polish_insight(insight: dict, *, baby_name: str, facts: dict) -> dict:
    """규칙 기반 헤드라인을 모델이 자연스럽게 다듬는다. 모델이 없거나 실패하면 원문을 그대로 쓴다."""
    client = get_llm_client()
    if client is None:
        return insight
    fact_lines = "\n".join(f"- {key}: {value if value is not None else '없음'}" for key, value in facts.items())
    prompt = (
        f"아기 이름: {with_i(baby_name)}\n이번 주 수치:\n{fact_lines}\n\n"
        f"규칙 기반 초안: 제목 '{insight['headline']}', 본문 '{insight['body']}'\n"
        "초안의 판단을 바꾸지 말고 문장만 자연스럽게 다듬어 JSON으로 돌려줘."
    )
    try:
        content = client.complete(system=INSIGHT_SYSTEM_PROMPT, user=prompt, max_tokens=300, temperature=0.4, json_mode=True)
        data = _parse_json(content)
        headline = str(data.get("headline", "")).strip()
        body = str(data.get("body", "")).strip()
        if not headline or not body or len(headline) > 40:
            raise ValueError("invalid insight json")
        return {"headline": headline, "body": body}
    except (LlmError, ValueError, AttributeError):
        logger.exception("LLM insight polishing failed")
        return insight


def _parse_json(content: str) -> dict:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            raise ValueError("not json") from None
        return json.loads(match.group(0))
