import unittest
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.db.base import Base
from app.main import app
from app.models.baby import Baby
from app.models.user import User


class CalendarApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(social_provider="google", social_user_id="calendar-owner", nickname="달력 사용자")
        self.other = User(social_provider="google", social_user_id="calendar-other", nickname="다른 사용자")
        self.db.add_all([self.user, self.other])
        self.db.flush()
        self.baby = Baby(
            owner_user_id=self.user.id,
            name="리몽",
            birth_date=date(2026, 6, 1),
            gender="UNKNOWN",
        )
        self.db.add(self.baby)
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def create_record(self, path: str, body: dict) -> None:
        response = self.client.post(f"/api/records/{path}", json={"babyId": self.baby.id, **body})
        self.assertEqual(response.status_code, 201, response.text)

    def create_diary(self, target_date: str = "2026-07-18") -> dict:
        response = self.client.post(
            "/api/diary",
            json={
                "babyId": self.baby.id,
                "date": target_date,
                "title": "A day to remember",
                "content": "The diary content",
                "isAiGenerated": False,
                "highlights": ["walk"],
                "imageUrls": ["https://example.test/diary.jpg"],
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["data"]

    def test_monthly_calendar_groups_record_days_and_types(self) -> None:
        self.create_record(
            "feeding",
            {
                "occurredAt": "2026-07-15T09:00:00+09:00",
                "feedingType": "FORMULA",
                "amountMl": 120,
            },
        )
        self.create_record(
            "sleep",
            {
                "startedAt": "2026-07-15T10:00:00+09:00",
                "endedAt": "2026-07-15T11:30:00+09:00",
            },
        )
        self.create_record("urine", {"occurredAt": "2026-07-15T12:00:00+09:00"})
        self.create_record("stool", {"occurredAt": "2026-07-15T13:00:00+09:00"})
        self.create_record(
            "feeding",
            {
                "occurredAt": "2026-07-20T08:00:00+09:00",
                "feedingType": "BREAST",
                "durationMinutes": 20,
            },
        )

        response = self.client.get(
            "/api/calendar", params={"babyId": self.baby.id, "year": 2026, "month": 7}
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json()["data"]["days"],
            [
                {
                    "date": "2026-07-15",
                    "hasDiary": False,
                    "thumbnailUrl": None,
                    "recordCount": 4,
                    "recordTypes": ["FEEDING", "SLEEP", "URINE", "STOOL"],
                    "recordCounts": {"feeding": 1, "sleep": 1, "urine": 1, "stool": 1},
                },
                {
                    "date": "2026-07-20",
                    "hasDiary": False,
                    "thumbnailUrl": None,
                    "recordCount": 1,
                    "recordTypes": ["FEEDING"],
                    "recordCounts": {"feeding": 1, "sleep": 0, "urine": 0, "stool": 0},
                },
            ],
        )

    def test_monthly_calendar_handles_empty_month_and_leap_day(self) -> None:
        empty = self.client.get(
            "/api/calendar", params={"babyId": self.baby.id, "year": 2026, "month": 8}
        )
        self.assertEqual(empty.status_code, 200)
        self.assertEqual(empty.json()["data"]["days"], [])

        self.create_record("urine", {"occurredAt": "2028-02-29T23:50:00+09:00"})
        leap = self.client.get(
            "/api/calendar", params={"babyId": self.baby.id, "year": 2028, "month": 2}
        )
        self.assertEqual(leap.status_code, 200)
        self.assertEqual(leap.json()["data"]["days"][0]["date"], "2028-02-29")

    def test_monthly_calendar_includes_diary_only_day_and_thumbnail(self) -> None:
        self.create_diary()

        response = self.client.get(
            "/api/calendar", params={"babyId": self.baby.id, "year": 2026, "month": 7}
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json()["data"]["days"],
            [
                {
                    "date": "2026-07-18",
                    "hasDiary": True,
                    "thumbnailUrl": "https://example.test/diary.jpg",
                    "recordCount": 0,
                    "recordTypes": [],
                    "recordCounts": {"feeding": 0, "sleep": 0, "urine": 0, "stool": 0},
                }
            ],
        )

    def test_monthly_calendar_validates_input_and_owner(self) -> None:
        invalid = self.client.get(
            "/api/calendar", params={"babyId": self.baby.id, "year": 2026, "month": 13}
        )
        self.assertEqual(invalid.status_code, 422)

        app.dependency_overrides[get_current_user] = lambda: self.other
        forbidden = self.client.get(
            "/api/calendar", params={"babyId": self.baby.id, "year": 2026, "month": 7}
        )
        self.assertEqual(forbidden.status_code, 404)

        app.dependency_overrides.pop(get_current_user)
        unauthorized = self.client.get(
            "/api/calendar", params={"babyId": self.baby.id, "year": 2026, "month": 7}
        )
        self.assertEqual(unauthorized.status_code, 401)

    def test_daily_timeline_orders_records_and_builds_summary(self) -> None:
        self.create_record(
            "feeding",
            {
                "occurredAt": "2026-07-15T09:00:00+09:00",
                "feedingType": "FORMULA",
                "amountMl": 120,
            },
        )
        self.create_record(
            "sleep",
            {
                "startedAt": "2026-07-15T10:00:00+09:00",
                "endedAt": "2026-07-15T11:30:00+09:00",
                "sleepType": "NAP",
            },
        )
        self.create_record(
            "urine",
            {
                "occurredAt": "2026-07-15T12:00:00+09:00",
                "amount": "MEDIUM",
                "color": "NORMAL",
            },
        )
        self.create_record(
            "stool",
            {
                "occurredAt": "2026-07-15T13:00:00+09:00",
                "amount": "SMALL",
                "color": "GREEN",
                "form": "SOFT",
            },
        )

        response = self.client.get(
            "/api/calendar/daily",
            params={"babyId": self.baby.id, "date": "2026-07-15"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["date"], "2026-07-15")
        self.assertIsNone(data["diary"])
        self.assertEqual(
            [item["summary"] for item in data["timeline"]],
            ["분유 120ml", "수면 1시간 30분", "소변 · 보통 · 정상", "대변 · 적음 · 초록 · 무른 변"],
        )
        self.assertEqual(
            data["daySummary"],
            {"feedingCount": 1, "sleepTotalMinutes": 90, "urineCount": 1, "stoolCount": 1},
        )

    def test_daily_timeline_uses_korean_day_boundary_and_empty_state(self) -> None:
        self.create_record("urine", {"occurredAt": "2026-07-16T00:30:00+09:00"})

        previous = self.client.get(
            "/api/calendar/daily",
            params={"babyId": self.baby.id, "date": "2026-07-15"},
        )
        selected = self.client.get(
            "/api/calendar/daily",
            params={"babyId": self.baby.id, "date": "2026-07-16"},
        )

        self.assertEqual(previous.status_code, 200)
        self.assertEqual(previous.json()["data"]["timeline"], [])
        self.assertEqual(
            previous.json()["data"]["daySummary"],
            {"feedingCount": 0, "sleepTotalMinutes": 0, "urineCount": 0, "stoolCount": 0},
        )
        self.assertEqual(len(selected.json()["data"]["timeline"]), 1)
        self.assertEqual(selected.json()["data"]["timeline"][0]["time"], "2026-07-16T00:30:00+09:00")

    def test_daily_timeline_includes_saved_diary(self) -> None:
        diary = self.create_diary("2026-07-15")

        response = self.client.get(
            "/api/calendar/daily",
            params={"babyId": self.baby.id, "date": "2026-07-15"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["diary"], diary)

    def test_daily_timeline_requires_owner(self) -> None:
        app.dependency_overrides[get_current_user] = lambda: self.other
        forbidden = self.client.get(
            "/api/calendar/daily",
            params={"babyId": self.baby.id, "date": "2026-07-15"},
        )
        self.assertEqual(forbidden.status_code, 404)


if __name__ == "__main__":
    unittest.main()
