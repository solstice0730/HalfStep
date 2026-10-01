"""Gemini 클라이언트와 공급자 선택 테스트 (네트워크 없이 httpx.post를 대역으로 교체)."""

import httpx
import pytest

from app.core.config import settings
from app.services import llm
from app.services.llm import GeminiClient, ImageInput, LlmError, get_llm_client


class FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None, text: str = "") -> None:
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text

    def json(self) -> dict:
        return self._payload


def _gemini_payload(text: str) -> dict:
    return {"candidates": [{"content": {"parts": [{"text": text}]}, "finishReason": "STOP"}]}


def test_gemini_complete_sends_system_instruction_json_mode_and_images(monkeypatch):
    captured = {}

    def fake_post(url, *, headers, json, timeout):
        captured.update(url=url, headers=headers, body=json, timeout=timeout)
        return FakeResponse(200, _gemini_payload('{"captions": ["눈맞춤"]}'))

    monkeypatch.setattr(llm.httpx, "post", fake_post)
    client = GeminiClient("secret-key", "gemini-2.5-flash")

    text = client.complete(
        system="시스템",
        user="사진 1장",
        json_mode=True,
        max_tokens=120,
        temperature=0.2,
        images=[ImageInput(mime_type="image/jpeg", data_base64="QUJD")],
    )

    assert text == '{"captions": ["눈맞춤"]}'
    assert captured["url"].endswith("/models/gemini-2.5-flash:generateContent")
    assert captured["headers"]["x-goog-api-key"] == "secret-key"
    assert "secret-key" not in captured["url"]
    body = captured["body"]
    assert body["systemInstruction"]["parts"][0]["text"] == "시스템"
    parts = body["contents"][0]["parts"]
    assert parts[0] == {"text": "사진 1장"}
    assert parts[1]["inline_data"] == {"mime_type": "image/jpeg", "data": "QUJD"}
    config = body["generationConfig"]
    assert config["responseMimeType"] == "application/json"
    assert config["maxOutputTokens"] == 120
    assert config["temperature"] == 0.2
    assert config["thinkingConfig"] == {"thinkingBudget": 0}


def test_gemini_complete_raises_llm_error_on_http_error_and_blocked_response(monkeypatch):
    client = GeminiClient("k", "gemini-2.5-flash")

    monkeypatch.setattr(llm.httpx, "post", lambda *a, **k: FakeResponse(429, text="quota"))
    with pytest.raises(LlmError, match="429"):
        client.complete(system="s", user="u")

    monkeypatch.setattr(
        llm.httpx, "post", lambda *a, **k: FakeResponse(200, {"promptFeedback": {"blockReason": "SAFETY"}})
    )
    with pytest.raises(LlmError, match="SAFETY"):
        client.complete(system="s", user="u")

    def raise_timeout(*a, **k):
        raise httpx.ReadTimeout("slow")

    monkeypatch.setattr(llm.httpx, "post", raise_timeout)
    with pytest.raises(LlmError, match="request failed"):
        client.complete(system="s", user="u")


def test_get_llm_client_prefers_gemini_and_respects_provider_setting(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "g")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "o")

    monkeypatch.setattr(settings, "AI_PROVIDER", "auto")
    assert get_llm_client().provider == "gemini"

    monkeypatch.setattr(settings, "AI_PROVIDER", "openai")
    assert get_llm_client().provider == "openai"

    monkeypatch.setattr(settings, "AI_PROVIDER", "none")
    assert get_llm_client() is None

    monkeypatch.setattr(settings, "AI_PROVIDER", "auto")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    assert get_llm_client() is None


def test_diary_generation_uses_gemini_json(monkeypatch):
    from datetime import date, datetime

    from app.schemas.ai import BabyInfo, DiaryGenerateRequest, DiaryRecords, FeedingRecord
    from app.services import ai as ai_service

    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "g")
    monkeypatch.setattr(
        llm.httpx,
        "post",
        lambda *a, **k: FakeResponse(200, _gemini_payload('{"title": "눈맞춤이 길어진 하루", "content": "오늘은 눈을 오래 맞췄어요."}')),
    )

    result = ai_service.generate_diary(
        DiaryGenerateRequest(
            baby=BabyInfo(name="하린"),
            date=date(2026, 9, 23),
            records=DiaryRecords(feeding=[FeedingRecord(recordedAt=datetime(2026, 9, 23, 8, 0), amountMl=120)]),
            memo="눈맞춤이 길어졌다.",
        )
    )

    assert result.generatedByAi is True
    assert result.title == "눈맞춤이 길어진 하루"
