import json
from datetime import date, datetime

import pytest
from fastapi import HTTPException
from openai import OpenAIError

from app.core.config import settings
from app.schemas.ai import (
    BabyInfo,
    DiaperRecord,
    DiaryGenerateRequest,
    DiaryRecords,
    FeedingRecord,
    SleepRecord,
)
from app.services import ai as ai_service


class FakeCompletions:
    def __init__(self, content: str | None = None, error: Exception | None = None) -> None:
        self._content = content
        self._error = error

    def create(self, **kwargs):
        if self._error:
            raise self._error
        message = type("Message", (), {"content": self._content})()
        choice = type("Choice", (), {"message": message})()
        return type("Response", (), {"choices": [choice]})()


class FakeClient:
    def __init__(self, content: str | None = None, error: Exception | None = None) -> None:
        self.chat = type("Chat", (), {"completions": FakeCompletions(content, error)})()


def _payload(**overrides) -> DiaryGenerateRequest:
    defaults = dict(
        baby=BabyInfo(name="하루", ageMonths=4),
        date=date(2026, 7, 14),
        records=DiaryRecords(
            feeding=[FeedingRecord(recordedAt=datetime(2026, 7, 14, 8, 30), feedingType="FORMULA", amountMl=120)],
            sleep=[SleepRecord(startedAt=datetime(2026, 7, 14, 10, 0), endedAt=datetime(2026, 7, 14, 11, 20))],
            diaper=[DiaperRecord(recordedAt=datetime(2026, 7, 14, 12, 10), type="NORMAL")],
        ),
        photoDescriptions=[],
        memo="오늘 처음으로 혼자 뒤집기를 시도했다.",
    )
    defaults.update(overrides)
    return DiaryGenerateRequest(**defaults)


def test_generate_diary_with_full_records_uses_ai_response(monkeypatch):
    ai_content = json.dumps({"title": "새로운 움직임을 보여준 하루", "content": "오늘은 뒤집기를 시도했어요."})
    monkeypatch.setattr(ai_service, "_get_openai_client", lambda: FakeClient(content=ai_content))

    result = ai_service.generate_diary(_payload())

    assert result.generatedByAi is True
    assert result.title == "새로운 움직임을 보여준 하루"
    assert result.content == "오늘은 뒤집기를 시도했어요."
    assert result.highlights == ["수유 1회 (총 120ml)", "낮잠 1회 (총 1시간 20분)", "배변 1회"]


def test_generate_diary_without_photos_does_not_mention_photos(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_openai_client", lambda: None)

    result = ai_service.generate_diary(_payload(photoDescriptions=[]))

    assert "사진" not in result.content
    assert result.generatedByAi is False


def test_generate_diary_with_sparse_records_stays_short(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_openai_client", lambda: None)
    sparse = _payload(
        records=DiaryRecords(feeding=[FeedingRecord(recordedAt=datetime(2026, 7, 14, 8, 30), amountMl=100)]),
        memo=None,
        photoDescriptions=[],
    )

    result = ai_service.generate_diary(sparse)

    assert result.highlights == ["수유 1회 (총 100ml)"]
    assert result.content == "오늘은 수유 1회 (총 100ml)이 있었어요."


def test_generate_diary_with_no_input_raises_validation_error():
    empty = _payload(records=DiaryRecords(), memo=None, photoDescriptions=[])

    with pytest.raises(HTTPException) as exc_info:
        ai_service.generate_diary(empty)

    assert exc_info.value.status_code == 422


def test_generate_diary_falls_back_when_ai_call_fails(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_openai_client", lambda: FakeClient(error=OpenAIError("boom")))
    monkeypatch.setattr(settings, "AI_FALLBACK_ENABLED", True)

    result = ai_service.generate_diary(_payload())

    assert result.generatedByAi is False
    assert result.notice == ai_service.DIARY_FALLBACK_NOTICE


def test_generate_diary_raises_clean_error_when_ai_fails_and_fallback_disabled(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_openai_client", lambda: FakeClient(error=OpenAIError("boom")))
    monkeypatch.setattr(settings, "AI_FALLBACK_ENABLED", False)

    with pytest.raises(HTTPException) as exc_info:
        ai_service.generate_diary(_payload())

    assert exc_info.value.status_code == 502
    assert exc_info.value.detail == ai_service.DIARY_GENERATION_FAILED_DETAIL


def test_generate_diary_falls_back_when_ai_returns_invalid_json(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_openai_client", lambda: FakeClient(content="not json"))
    monkeypatch.setattr(settings, "AI_FALLBACK_ENABLED", True)

    result = ai_service.generate_diary(_payload())

    assert result.generatedByAi is False
