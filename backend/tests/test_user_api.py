import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.db.base import Base
from app.main import app
from app.models.user import User


class UserApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(
            social_provider="kakao",
            social_user_id="test-user",
            nickname="원래닉네임",
            email="test@test.com",
        )
        self.db.add(self.user)
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def test_get_me_returns_user_info(self) -> None:
        response = self.client.get("/api/users/me")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["nickname"], "원래닉네임")
        self.assertEqual(data["email"], "test@test.com")
        self.assertEqual(data["provider"], "kakao")
        self.assertIn("babies", data)

    def test_patch_me_updates_nickname(self) -> None:
        response = self.client.patch(
            "/api/users/me",
            json={"nickname": "새닉네임"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["nickname"], "새닉네임")

    def test_patch_me_reflects_in_get_me(self) -> None:
        self.client.patch("/api/users/me", json={"nickname": "변경된닉네임"})
        response = self.client.get("/api/users/me")
        self.assertEqual(response.json()["data"]["nickname"], "변경된닉네임")

    def test_patch_me_requires_nickname(self) -> None:
        response = self.client.patch("/api/users/me", json={})
        self.assertEqual(response.status_code, 422)

    def test_patch_me_trims_nickname(self) -> None:
        response = self.client.patch(
            "/api/users/me",
            json={"nickname": "  새닉네임  "},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["nickname"], "새닉네임")

    def test_patch_me_rejects_blank_nickname(self) -> None:
        response = self.client.patch("/api/users/me", json={"nickname": "   "})
        self.assertEqual(response.status_code, 422)

    def test_patch_me_rejects_nickname_over_100_characters(self) -> None:
        response = self.client.patch("/api/users/me", json={"nickname": "a" * 101})
        self.assertEqual(response.status_code, 422)

    def test_patch_me_unauthenticated(self) -> None:
        app.dependency_overrides.clear()
        app.dependency_overrides[get_db] = lambda: self.db
        client = TestClient(app)
        response = client.patch("/api/users/me", json={"nickname": "닉네임"})
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
