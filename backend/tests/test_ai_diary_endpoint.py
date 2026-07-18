from app.api.deps import get_current_user
from app.main import app
from app.services import ai as ai_service
from fastapi.testclient import TestClient

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: object()


def test_diary_generate_endpoint_returns_wrapped_response(monkeypatch):
    monkeypatch.setattr(ai_service, "_get_openai_client", lambda: None)

    response = client.post(
        "/api/ai/diary/generate",
        json={
            "baby": {"name": "하루", "ageMonths": 4},
            "date": "2026-07-14",
            "records": {
                "feeding": [{"recordedAt": "2026-07-14T08:30:00", "feedingType": "FORMULA", "amountMl": 120}],
                "sleep": [],
                "diaper": [],
            },
            "photoDescriptions": [],
            "memo": "오늘 처음으로 혼자 뒤집기를 시도했다.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["highlights"] == ["수유 1회 (총 120ml)"]
    assert "generatedByAi" in body["data"]
    assert "notice" in body["data"]


def test_diary_generate_endpoint_rejects_empty_input():
    response = client.post(
        "/api/ai/diary/generate",
        json={"baby": {"name": "하루"}, "date": "2026-07-14", "records": {}, "photoDescriptions": [], "memo": None},
    )

    assert response.status_code == 422


def test_diary_generate_endpoint_rejects_negative_feeding_amount():
    response = client.post(
        "/api/ai/diary/generate",
        json={
            "baby": {"name": "하루"},
            "date": "2026-07-14",
            "records": {"feeding": [{"recordedAt": "2026-07-14T08:00:00", "amountMl": -50}]},
            "memo": None,
        },
    )

    assert response.status_code == 422


def test_diary_generate_endpoint_rejects_negative_age_months():
    response = client.post(
        "/api/ai/diary/generate",
        json={"baby": {"name": "하루", "ageMonths": -3}, "date": "2026-07-14", "records": {}, "memo": "m"},
    )

    assert response.status_code == 422


def test_diary_generate_endpoint_rejects_sleep_end_before_start():
    response = client.post(
        "/api/ai/diary/generate",
        json={
            "baby": {"name": "하루"},
            "date": "2026-07-14",
            "records": {"sleep": [{"startedAt": "2026-07-14T11:00:00", "endedAt": "2026-07-14T10:00:00"}]},
            "memo": None,
        },
    )

    assert response.status_code == 422
