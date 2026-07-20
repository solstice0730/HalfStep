import unittest
from datetime import date, datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.db.base import Base
from app.main import app
from app.models.baby import Baby
from app.models.records import CareLog
from app.models.user import User


class AiRecordsIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(social_provider="google", social_user_id="ai-owner", nickname="AI owner")
        self.other = User(social_provider="google", social_user_id="ai-other", nickname="AI other")
        self.db.add_all([self.user, self.other])
        self.db.flush()
        self.baby = Baby(
            owner_user_id=self.user.id,
            name="Haru",
            birth_date=date(2026, 3, 1),
            gender="UNKNOWN",
        )
        self.other_baby = Baby(
            owner_user_id=self.other.id,
            name="Other",
            birth_date=date(2026, 3, 1),
            gender="UNKNOWN",
        )
        self.db.add_all([self.baby, self.other_baby])
        self.db.flush()
        self.db.add(
            CareLog(
                baby_id=self.baby.id,
                user_id=self.user.id,
                log_type="FEEDING",
                occurred_at=datetime(2026, 7, 14, 8, 30, tzinfo=timezone.utc),
                amount_ml=120,
                feeding_type="FORMULA",
                extra_data={},
            )
        )
        self.db.commit()
        self.original_api_key = settings.OPENAI_API_KEY
        settings.OPENAI_API_KEY = ""
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        settings.OPENAI_API_KEY = self.original_api_key
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def test_daily_summary_reads_persisted_care_logs(self) -> None:
        response = self.client.post(
            "/api/ai/daily-summary",
            json={"babyId": self.baby.id, "date": "2026-07-14"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["recordCount"], 1)
        self.assertEqual(response.json()["data"]["highlights"], ["수유 1회"])

    def test_summary_and_question_reject_unowned_baby(self) -> None:
        requests = [
            ("/api/ai/daily-summary", {"babyId": self.other_baby.id, "date": "2026-07-14"}),
            (
                "/api/ai/ask",
                {
                    "babyId": self.other_baby.id,
                    "date": "2026-07-14",
                    "question": "오늘 기록을 알려줘",
                },
            ),
        ]

        for path, payload in requests:
            with self.subTest(path=path):
                response = self.client.post(path, json=payload)
                self.assertEqual(response.status_code, 404, response.text)


if __name__ == "__main__":
    unittest.main()
