import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.community import CommunityCategory
from app.models.user import User
from app.schemas.community import CommunityPostCreate
from app.services.community import create_community_post, get_community_post, list_community_posts


class CommunityServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(social_provider="google", social_user_id="community-test", nickname="테스터")
        self.category = CommunityCategory(code="NEWBORN", name="신생아", sort_order=10, is_active=True)
        self.db.add_all([self.user, self.category])
        self.db.commit()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def create_post(self, title: str = "수면 패턴을 공유해요"):
        return create_community_post(
            self.db,
            payload=CommunityPostCreate(
                category="newborn", title=title, content="오늘은 조금 더 오래 잤어요."
            ),
            current_user=self.user,
        )

    def test_create_and_get_post(self) -> None:
        created = self.create_post()
        post = get_community_post(self.db, created.id)
        self.assertEqual(post.title, "수면 패턴을 공유해요")
        self.assertEqual(post.category.code, "NEWBORN")

    def test_list_posts_uses_cursor(self) -> None:
        self.create_post("첫 번째 게시글")
        self.create_post("두 번째 게시글")
        posts, cursor, has_next = list_community_posts(
            self.db, category="NEWBORN", cursor=None, limit=1
        )
        self.assertTrue(has_next)
        self.assertIsNotNone(cursor)
        self.assertEqual(posts[0].title, "두 번째 게시글")
        next_posts, _, next_has_next = list_community_posts(
            self.db, category="NEWBORN", cursor=cursor, limit=1
        )
        self.assertFalse(next_has_next)
        self.assertEqual(next_posts[0].title, "첫 번째 게시글")

    def test_rejects_invalid_category_and_cursor(self) -> None:
        with self.assertRaises(HTTPException) as category_error:
            list_community_posts(self.db, category="UNKNOWN", cursor=None, limit=20)
        self.assertEqual(category_error.exception.status_code, 400)
        with self.assertRaises(HTTPException) as cursor_error:
            list_community_posts(self.db, category=None, cursor="invalid", limit=20)
        self.assertEqual(cursor_error.exception.status_code, 400)

    def test_missing_post_returns_not_found(self) -> None:
        with self.assertRaises(HTTPException) as error:
            get_community_post(self.db, 999)
        self.assertEqual(error.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
