import json
from datetime import date, datetime

import pytest
from fastapi import HTTPException

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


from app.services.llm import LlmError


class FakeLlm:
    """LlmClient 대역: 고정 응답 또는 예외를 돌려준다."""

    provider = "fake"

    def __init__(self, content: str | None = None, error: Exception | None = None) -> None:
        self._content = content
        self._error = error
        self.calls: list[dict] = []

    def complete(self, **kwargs):
        self.calls.append(kwargs)
        if self._error:
            raise self._error
        return self._content


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
    monkeypatch.setattr(ai_service, "_get_llm_client", lambda: FakeLlm(content=ai_content))

    result = ai_service.generate_diary(_payload())

    assert result.generatedByAi is True
    assert result.title == "새로운 움직임을 보여준 하루"
    assert result.content == "오늘은 뒤집기를 시도했어요."
    assert result.highlights == ["수유 1회 (총 120ml)", "낮잠 1회 (총 1시간 20분)", "배변 1회"]


def test_generate_diary_without_photos_does_not_mention_photos(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_llm_client", lambda: None)

    result = ai_service.generate_diary(_payload(photoDescriptions=[]))

    assert "사진" not in result.content
    assert result.generatedByAi is False


def test_generate_diary_with_sparse_records_stays_short(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_llm_client", lambda: None)
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
    monkeypatch.setattr(ai_service, "_get_llm_client", lambda: FakeLlm(error=LlmError("boom")))
    monkeypatch.setattr(settings, "AI_DIARY_FALLBACK_ON_ERROR", True)

    result = ai_service.generate_diary(_payload())

    assert result.generatedByAi is False
    assert result.notice == ai_service.DIARY_FALLBACK_NOTICE


def test_generate_diary_raises_clean_error_when_ai_fails_and_fallback_disabled(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_llm_client", lambda: FakeLlm(error=LlmError("boom")))
    monkeypatch.setattr(settings, "AI_DIARY_FALLBACK_ON_ERROR", False)

    with pytest.raises(HTTPException) as exc_info:
        ai_service.generate_diary(_payload())

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == ai_service.DIARY_AI_BUSY_DETAIL


def test_generate_diary_falls_back_when_ai_returns_invalid_json(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_llm_client", lambda: FakeLlm(content="not json"))
    monkeypatch.setattr(settings, "AI_DIARY_FALLBACK_ON_ERROR", True)

    result = ai_service.generate_diary(_payload())

    assert result.generatedByAi is False


def test_generate_diary_skips_model_when_only_one_material(monkeypatch):
    llm = FakeLlm(content=json.dumps({"title": "x", "content": "y"}))
    monkeypatch.setattr(ai_service, "_get_llm_client", lambda: llm)
    sparse = _payload(
        records=DiaryRecords(feeding=[FeedingRecord(recordedAt=datetime(2026, 7, 14, 8, 30), amountMl=100)]),
        memo=None,
        photoDescriptions=[],
    )

    result = ai_service.generate_diary(sparse)

    assert result.generatedByAi is False
    assert llm.calls == []


def test_generate_diary_uses_analyzed_photo_as_only_material(monkeypatch):
    llm = FakeLlm(content=json.dumps({
        "title": "이불 위의 하루",
        "content": "하루가 이불 위에 누워 카메라를 바라보는 모습을 사진으로 남겼다.",
    }))
    monkeypatch.setattr(ai_service, "_get_llm_client", lambda: llm)
    photo_scene = "아기가 이불 위에 누워 카메라를 바라보고 있다."
    payload = _payload(records=DiaryRecords(), memo=None, photoDescriptions=[photo_scene])

    result = ai_service.generate_diary(payload)

    assert result.generatedByAi is True
    assert photo_scene in llm.calls[0]["user"]
    assert "이불 위에" in result.content


def test_photo_analysis_returns_scene_for_diary(monkeypatch):
    from app.services.llm import ImageInput

    llm = FakeLlm(content=json.dumps({
        "captions": ["아기가 이불 위에 누워 카메라를 바라보고 있다."]
    }))
    monkeypatch.setattr(ai_service, "_get_llm_client", lambda: llm)
    monkeypatch.setattr(ai_service, "load_image", lambda _url: ImageInput("image/jpeg", "QUJD"))

    result = ai_service.analyze_photos(["http://localhost:8000/uploads/photo.jpg"])

    assert result.items[0].source == "ai"
    assert result.items[0].caption == "아기가 이불 위에 누워 카메라를 바라보고 있다."
    assert len(llm.calls[0]["images"]) == 1
    assert "표정" in llm.calls[0]["system"]
