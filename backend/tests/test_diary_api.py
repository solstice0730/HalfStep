import unittest
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.db.base import Base
from app.main import app
from app.models.baby import Baby
from app.models.diary import Diary
from app.models.user import User


class DiaryApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.owner = User(
            social_provider="google",
            social_user_id="diary-owner",
            nickname="owner",
        )
        self.other = User(
            social_provider="google",
            social_user_id="diary-other",
            nickname="other",
        )
        self.db.add_all([self.owner, self.other])
        self.db.flush()
        self.baby = Baby(
            owner_user_id=self.owner.id,
            name="Baby",
            birth_date=date(2026, 6, 1),
            gender="UNKNOWN",
            is_active=True,
        )
        self.db.add(self.baby)
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.owner
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def _payload(self) -> dict:
        return {
            "babyId": self.baby.id,
            "date": "2026-07-20",
            "title": "Today",
            "content": "A calm day",
            "isAiGenerated": True,
            "highlights": ["sleep"],
            "imageUrls": ["https://example.test/photo.jpg"],
        }

    def test_owner_can_create_and_replace_same_day_diary(self) -> None:
        created = self.client.post("/api/diary", json=self._payload())
        updated_payload = self._payload() | {"title": "Updated"}
        updated = self.client.post("/api/diary", json=updated_payload)

        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(updated.status_code, 201, updated.text)
        self.assertEqual(created.json()["data"]["id"], updated.json()["data"]["id"])
        self.assertEqual(updated.json()["data"]["title"], "Updated")

    def test_other_user_cannot_create_diary_for_foreign_baby(self) -> None:
        app.dependency_overrides[get_current_user] = lambda: self.other

        response = self.client.post("/api/diary", json=self._payload())

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.db.query(Diary).count(), 0)

    def test_database_rejects_duplicate_baby_date(self) -> None:
        first = Diary(
            baby_id=self.baby.id,
            user_id=self.owner.id,
            diary_date=date(2026, 7, 20),
            title="First",
            content="First content",
            is_ai_generated=False,
        )
        second = Diary(
            baby_id=self.baby.id,
            user_id=self.owner.id,
            diary_date=date(2026, 7, 20),
            title="Second",
            content="Second content",
            is_ai_generated=False,
        )
        self.db.add_all([first, second])

        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()


if __name__ == "__main__":
    unittest.main()
