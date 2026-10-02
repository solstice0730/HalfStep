import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.community import CommunityCategory, CommunityPost
from app.models.user import User
from scripts.seed_stroller_demo_post import TITLE, seed


class SeedStrollerDemoPostTest(unittest.TestCase):
    def test_dry_run_apply_and_repeat_are_idempotent(self) -> None:
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            db.add_all([
                User(id=5, social_provider="google", social_user_id="demo", nickname="시연 계정"),
                CommunityCategory(code="FREE", name="자유", is_active=True),
            ])
            db.commit()
            self.assertEqual(seed(db, expected_user_id=5, apply=False), (None, True))
            self.assertEqual(db.query(CommunityPost).count(), 0)
            post_id, added = seed(db, expected_user_id=5, apply=True)
            self.assertTrue(added)
            self.assertEqual(db.get(CommunityPost, post_id).title, TITLE)
            self.assertTrue(db.get(CommunityPost, post_id).is_anonymous)
            self.assertEqual(seed(db, expected_user_id=5, apply=True), (post_id, False))
            self.assertEqual(db.query(CommunityPost).count(), 1)
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
