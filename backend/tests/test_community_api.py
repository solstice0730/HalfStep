import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.db.base import Base
from app.main import app
from app.models.community import CommunityCategory
from app.models.user import User


class CommunityApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(social_provider="google", social_user_id="api-test", nickname="동준")
        self.db.add_all(
            [
                self.user,
                CommunityCategory(code="NEWBORN", name="신생아", sort_order=10, is_active=True),
                CommunityCategory(code="SLEEP_DEVELOPMENT", name="수면·발달", sort_order=20, is_active=True),
            ]
        )
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def create_post(self, category: str = "NEWBORN", title: str = "생후 45일 수면 기록"):
        return self.client.post(
            "/api/posts",
            json={
                "category": category,
                "title": title,
                "content": "오늘은 평소보다 한 시간 더 오래 잤어요.",
                "imageUrls": [],
                "isAnonymous": False,
            },
        )

    def test_create_list_and_get_post(self) -> None:
        created = self.create_post()
        self.assertEqual(created.status_code, 201)
        post_id = created.json()["data"]["id"]

        listed = self.client.get("/api/posts", params={"category": "NEWBORN", "limit": 20})
        self.assertEqual(listed.status_code, 200)
        body = listed.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"][0]["id"], post_id)
        self.assertEqual(body["data"][0]["author"]["nickname"], "동준")

        detail = self.client.get(f"/api/posts/{post_id}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["data"]["content"], "오늘은 평소보다 한 시간 더 오래 잤어요.")

    def test_category_filter_and_cursor(self) -> None:
        self.create_post("NEWBORN", "신생아 게시글")
        self.create_post("SLEEP_DEVELOPMENT", "수면 발달 게시글")
        first = self.client.get("/api/posts", params={"limit": 1}).json()
        self.assertTrue(first["meta"]["hasNext"])
        second = self.client.get(
            "/api/posts", params={"limit": 1, "cursor": first["meta"]["cursor"]}
        ).json()
        self.assertNotEqual(first["data"][0]["id"], second["data"][0]["id"])
        filtered = self.client.get("/api/posts", params={"category": "NEWBORN"}).json()
        self.assertEqual(len(filtered["data"]), 1)
        self.assertEqual(filtered["data"][0]["category"], "NEWBORN")

    def test_validation_and_not_found_responses(self) -> None:
        invalid = self.create_post(category="UNKNOWN")
        self.assertEqual(invalid.status_code, 400)
        short_title = self.create_post(title="한")
        self.assertEqual(short_title.status_code, 422)
        self.assertEqual(self.client.get("/api/posts/999").status_code, 404)
        self.assertEqual(self.client.get("/api/posts", params={"cursor": "bad"}).status_code, 400)

    def test_authentication_is_required(self) -> None:
        app.dependency_overrides.pop(get_current_user)
        response = self.client.get("/api/posts")
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
