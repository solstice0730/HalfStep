import os
import unittest
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.community import CommunityPost
from app.models.user import User


@unittest.skipUnless(os.getenv("COMMUNITY_MYSQL_TEST_URL"), "MySQL test URL is not configured")
class CommunityMySqlIntegrationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(os.environ["COMMUNITY_MYSQL_TEST_URL"], pool_pre_ping=True)
        self.db = Session(self.engine)
        identity = f"community-mysql-{uuid.uuid4()}"
        self.user = User(social_provider="google", social_user_id=identity, nickname="MySQL 테스터")
        self.db.add(self.user)
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.db.execute(delete(CommunityPost).where(CommunityPost.user_id == self.user.id))
        self.db.delete(self.user)
        self.db.commit()
        self.db.close()
        self.engine.dispose()

    def test_mysql_create_list_and_detail(self) -> None:
        created = self.client.post(
            "/api/posts",
            json={
                "category": "NEWBORN",
                "title": "MySQL 통합 테스트 게시글",
                "content": "실제 MySQL에 저장하고 다시 조회합니다.",
                "imageUrls": [],
                "isAnonymous": False,
            },
        )
        self.assertEqual(created.status_code, 201)
        post_id = created.json()["data"]["id"]

        listed = self.client.get("/api/posts", params={"category": "NEWBORN"})
        self.assertEqual(listed.status_code, 200)
        self.assertIn(post_id, [post["id"] for post in listed.json()["data"]])

        detail = self.client.get(f"/api/posts/{post_id}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["data"]["author"]["nickname"], "MySQL 테스터")

    def test_mysql_endpoint_requires_authentication(self) -> None:
        app.dependency_overrides.pop(get_current_user)
        self.assertEqual(self.client.get("/api/posts").status_code, 401)


if __name__ == "__main__":
    unittest.main()
