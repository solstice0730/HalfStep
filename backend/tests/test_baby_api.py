import unittest
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.core.config import Settings
from app.db.base import Base
from app.main import app
from app.models.baby import Baby
from app.models.user import User


class BabyApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(
            social_provider="google",
            social_user_id="baby-owner",
            nickname="owner",
        )
        self.other = User(
            social_provider="google",
            social_user_id="other-owner",
            nickname="other",
        )
        self.db.add_all([self.user, self.other])
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def test_create_and_activate_baby(self) -> None:
        first = self.client.post(
            "/api/babies",
            json={"name": "First", "birthDate": "2026-06-01", "gender": "UNKNOWN"},
        )
        second = self.client.post(
            "/api/babies",
            json={"name": "Second", "birthDate": "2026-07-01", "gender": "FEMALE"},
        )

        self.assertEqual(first.status_code, 201, first.text)
        self.assertEqual(second.status_code, 201, second.text)
        babies = self.db.query(Baby).order_by(Baby.id).all()
        self.assertFalse(babies[0].is_active)
        self.assertTrue(babies[1].is_active)

        activated = self.client.patch(f"/api/babies/{babies[0].id}/activate")
        self.assertEqual(activated.status_code, 200, activated.text)
        self.db.refresh(babies[0])
        self.db.refresh(babies[1])
        self.assertTrue(babies[0].is_active)
        self.assertFalse(babies[1].is_active)

    def test_other_user_cannot_update_baby(self) -> None:
        baby = Baby(
            owner_user_id=self.user.id,
            name="Protected",
            birth_date=date(2026, 6, 1),
            gender="UNKNOWN",
            is_active=True,
        )
        self.db.add(baby)
        self.db.commit()
        app.dependency_overrides[get_current_user] = lambda: self.other

        response = self.client.patch(
            f"/api/babies/{baby.id}",
            json={"name": "Changed"},
        )

        self.assertEqual(response.status_code, 404)

    def test_settings_ignore_compose_helper_variables(self) -> None:
        settings = Settings(mysql_host="mysql", mysql_port=3306)

        self.assertFalse(hasattr(settings, "mysql_host"))
        self.assertFalse(hasattr(settings, "mysql_port"))


if __name__ == "__main__":
    unittest.main()
