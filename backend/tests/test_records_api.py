import unittest
from datetime import date, datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.core.time import APP_TIMEZONE
from app.db.base import Base
from app.main import app
from app.models.baby import Baby
from app.models.user import User
from scripts.seed_records_demo import select_demo_owner


class RecordsApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(social_provider="google", social_user_id="records-test", nickname="기록자")
        self.other = User(social_provider="google", social_user_id="other-user", nickname="다른 사용자")
        self.db.add_all([self.user, self.other])
        self.db.flush()
        self.baby = Baby(owner_user_id=self.user.id, name="리몽", birth_date=date(2026, 6, 1), gender="UNKNOWN")
        self.db.add(self.baby)
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def test_create_all_record_types_and_list(self) -> None:
        cases = [
            ("feeding", {"babyId": self.baby.id, "occurredAt": "2026-07-15T09:00:00", "feedingType": "FORMULA", "amountMl": 120, "burped": True}),
            ("sleep", {"babyId": self.baby.id, "startedAt": "2026-07-15T10:00:00", "endedAt": "2026-07-15T12:00:00", "sleepType": "NAP"}),
            ("urine", {"babyId": self.baby.id, "occurredAt": "2026-07-15T12:30:00", "amount": "MEDIUM", "color": "NORMAL"}),
            ("stool", {"babyId": self.baby.id, "occurredAt": "2026-07-15T13:00:00", "amount": "SMALL", "color": "GREEN", "form": "SOFT", "photoUrl": "https://example.test/stool.jpg"}),
        ]
        for path, body in cases:
            response = self.client.post(f"/api/records/{path}", json=body)
            self.assertEqual(response.status_code, 201, response.text)
        listed = self.client.get("/api/records", params={"babyId": self.baby.id, "date": "2026-07-15"})
        self.assertEqual(listed.status_code, 200)
        self.assertEqual({item["type"] for item in listed.json()["data"]}, {"FEEDING", "SLEEP", "URINE", "STOOL"})

    def test_filter_and_validation(self) -> None:
        self.client.post("/api/records/feeding", json={"babyId": self.baby.id, "occurredAt": "2026-07-15T09:00:00", "feedingType": "BREAST", "durationMinutes": 20, "breastSide": "LEFT"})
        response = self.client.get("/api/records", params={"babyId": self.baby.id, "date": "2026-07-15", "type": "FEEDING"})
        self.assertEqual(len(response.json()["data"]), 1)
        invalid = self.client.post("/api/records/feeding", json={"babyId": self.baby.id, "occurredAt": "2026-07-15T09:00:00", "feedingType": "FORMULA"})
        self.assertEqual(invalid.status_code, 422)

    def test_cursor_follows_occurrence_order_for_backdated_records(self) -> None:
        for occurred_at in ("2026-07-15T12:00:00", "2026-07-15T08:00:00", "2026-07-15T10:00:00"):
            response = self.client.post(
                "/api/records/urine",
                json={"babyId": self.baby.id, "occurredAt": occurred_at},
            )
            self.assertEqual(response.status_code, 201, response.text)

        first = self.client.get(
            "/api/records", params={"babyId": self.baby.id, "date": "2026-07-15", "limit": 2}
        )
        self.assertEqual([item["occurredAt"] for item in first.json()["data"]], ["2026-07-15T12:00:00+09:00", "2026-07-15T10:00:00+09:00"])
        cursor = first.json()["meta"]["cursor"]
        second = self.client.get(
            "/api/records", params={"babyId": self.baby.id, "date": "2026-07-15", "limit": 2, "cursor": cursor}
        )
        self.assertEqual([item["occurredAt"] for item in second.json()["data"]], ["2026-07-15T08:00:00+09:00"])

    def test_date_filter_uses_korean_calendar_day_for_offset_timestamp(self) -> None:
        created = self.client.post(
            "/api/records/urine",
            json={"babyId": self.baby.id, "occurredAt": "2026-07-15T00:30:00+09:00"},
        )
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(created.json()["data"]["occurredAt"], "2026-07-15T00:30:00+09:00")

        selected_day = self.client.get("/api/records", params={"babyId": self.baby.id, "date": "2026-07-15"})
        previous_day = self.client.get("/api/records", params={"babyId": self.baby.id, "date": "2026-07-14"})
        self.assertEqual(len(selected_day.json()["data"]), 1)
        self.assertEqual(previous_day.json()["data"], [])

    def test_rejects_inaccessible_baby_and_missing_auth(self) -> None:
        app.dependency_overrides[get_current_user] = lambda: self.other
        forbidden = self.client.get("/api/records", params={"babyId": self.baby.id})
        self.assertEqual(forbidden.status_code, 404)
        app.dependency_overrides.pop(get_current_user)
        self.assertEqual(self.client.get("/api/records", params={"babyId": self.baby.id}).status_code, 401)

    def test_home_dashboard_summarizes_today_records(self) -> None:
        today = datetime.now(APP_TIMEZONE).date().isoformat()
        self.client.post(
            "/api/records/feeding",
            json={
                "babyId": self.baby.id,
                "occurredAt": f"{today}T09:00:00+09:00",
                "feedingType": "FORMULA",
                "amountMl": 120,
            },
        )
        self.client.post(
            "/api/records/sleep",
            json={
                "babyId": self.baby.id,
                "startedAt": f"{today}T10:00:00+09:00",
                "endedAt": f"{today}T11:30:00+09:00",
            },
        )
        self.client.post(
            "/api/records/urine",
            json={"babyId": self.baby.id, "occurredAt": f"{today}T12:00:00+09:00"},
        )
        self.client.post(
            "/api/records/stool",
            json={"babyId": self.baby.id, "occurredAt": f"{today}T13:00:00+09:00"},
        )

        response = self.client.get(
            "/api/home/dashboard", params={"babyId": self.baby.id}
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json()["data"]["todaySummary"],
            {
                "feedingCount": 1,
                "sleepTotalMinutes": 90,
                "urineCount": 1,
                "stoolCount": 1,
                "lastFeedingAt": f"{today}T09:00:00+09:00",
                "lastSleepAt": f"{today}T11:30:00+09:00",
            },
        )

    def test_demo_seed_selects_latest_real_user_as_owner(self) -> None:
        latest = User(social_provider="google", social_user_id="latest-real-user", nickname="최근 사용자")
        self.db.add(latest)
        self.db.flush()

        owner = select_demo_owner(self.db)

        self.assertEqual(owner.id, latest.id)


if __name__ == "__main__":
    unittest.main()
