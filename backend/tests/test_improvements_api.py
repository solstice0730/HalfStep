"""보완 작업 테스트: 토큰 갱신, 댓글, 보호자 메모 upsert, 일기 생성 503."""

import unittest
from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import hash_token
from app.db.base import Base
from app.main import app
from app.models.baby import Baby
from app.models.community import CommunityCategory
from app.models.user import User
from app.services import ai as ai_service
from app.services.llm import LlmError


class ImprovementsApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(social_provider="google", social_user_id="imp-owner", nickname="하린맘")
        self.other = User(social_provider="google", social_user_id="imp-other", nickname="이웃")
        self.db.add_all([self.user, self.other, CommunityCategory(code="FREE", name="자유", sort_order=10, is_active=True)])
        self.db.flush()
        self.baby = Baby(owner_user_id=self.user.id, name="하린", birth_date=date(2026, 6, 5), gender="FEMALE")
        self.db.add(self.baby)
        self.db.commit()
        self.original_provider = settings.AI_PROVIDER
        settings.AI_PROVIDER = "none"
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        settings.AI_PROVIDER = self.original_provider
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    # --- 토큰 갱신 ------------------------------------------------------------------

    def test_refresh_rotates_tokens_and_rejects_reuse(self) -> None:
        app.dependency_overrides.pop(get_current_user)
        login = self.client.post("/api/auth/social", json={"provider": "google", "accessToken": "dev:google:refresh-user"})
        self.assertEqual(login.status_code, 200, login.text)
        first = login.json()["data"]

        refreshed = self.client.post("/api/auth/refresh", json={"refreshToken": first["refreshToken"]})
        self.assertEqual(refreshed.status_code, 200, refreshed.text)
        second = refreshed.json()["data"]
        self.assertNotEqual(second["refreshToken"], first["refreshToken"])
        self.assertTrue(second["accessToken"])
        self.assertEqual(second["user"]["id"], first["user"]["id"])

        # 회전된 이전 refresh token은 더 이상 쓸 수 없다.
        reused = self.client.post("/api/auth/refresh", json={"refreshToken": first["refreshToken"]})
        self.assertEqual(reused.status_code, 401)

        # 새 access token으로 보호된 API 호출이 된다.
        me = self.client.get("/api/users/me", headers={"Authorization": f"Bearer {second['accessToken']}"})
        self.assertEqual(me.status_code, 200, me.text)

    def test_refresh_rejects_expired_token(self) -> None:
        app.dependency_overrides.pop(get_current_user)
        self.user.refresh_token_hash = hash_token("old-token")
        self.user.refresh_token_expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        self.db.commit()

        response = self.client.post("/api/auth/refresh", json={"refreshToken": "old-token"})

        self.assertEqual(response.status_code, 401)
        self.db.refresh(self.user)
        self.assertIsNone(self.user.refresh_token_hash)

    # --- 댓글 ------------------------------------------------------------------------

    def test_comments_crud_and_counts(self) -> None:
        post_id = self.client.post(
            "/api/posts",
            json={"category": "FREE", "title": "오늘 처음 뒤집기에 성공했어요", "content": "가족들도 같이 축하해 줬어요.",
                  "imageUrls": [], "babyAgeMonths": 5, "isAnonymous": False},
        ).json()["data"]["id"]

        created = self.client.post(f"/api/posts/{post_id}/comments", json={"content": "축하해요!", "isAnonymous": False})
        self.assertEqual(created.status_code, 201, created.text)
        mine = created.json()["data"]
        self.assertTrue(mine["isMine"])
        self.assertEqual(mine["author"]["nickname"], "하린맘")

        app.dependency_overrides[get_current_user] = lambda: self.other
        anonymous = self.client.post(f"/api/posts/{post_id}/comments", json={"content": "우리 아기도 곧!", "isAnonymous": True}).json()["data"]
        self.assertEqual(anonymous["author"]["nickname"], "익명")
        self.assertIsNone(anonymous["author"]["userId"])
        # 남의 댓글은 지울 수 없다.
        self.assertEqual(self.client.delete(f"/api/posts/{post_id}/comments/{mine['id']}").status_code, 403)

        listed = self.client.get(f"/api/posts/{post_id}/comments").json()["data"]
        self.assertEqual([item["content"] for item in listed], ["축하해요!", "우리 아기도 곧!"])
        self.assertEqual([item["isMine"] for item in listed], [False, True])
        self.assertEqual(self.client.get("/api/posts").json()["data"][0]["commentCount"], 2)
        self.assertEqual(self.client.get(f"/api/posts/{post_id}").json()["data"]["commentCount"], 2)

        self.assertEqual(self.client.delete(f"/api/posts/{post_id}/comments/{anonymous['id']}").status_code, 200)
        self.assertEqual(self.client.get(f"/api/posts/{post_id}").json()["data"]["commentCount"], 1)
        self.assertEqual(self.client.post(f"/api/posts/{post_id}/comments", json={"content": "   "}).status_code, 422)
        self.assertEqual(self.client.post("/api/posts/999/comments", json={"content": "x"}).status_code, 404)

    # --- 게시글 수정·삭제 ---------------------------------------------------------------

    def test_post_update_and_delete_by_author_only(self) -> None:
        post_id = self.client.post(
            "/api/posts",
            json={"category": "FREE", "title": "처음 제목", "content": "처음 내용입니다.", "imageUrls": [],
                  "babyAgeMonths": 5, "isAnonymous": False},
        ).json()["data"]["id"]
        self.client.post(f"/api/posts/{post_id}/like")
        self.client.post(f"/api/posts/{post_id}/comments", json={"content": "댓글"})
        self.assertTrue(self.client.get(f"/api/posts/{post_id}").json()["data"]["isMine"])

        app.dependency_overrides[get_current_user] = lambda: self.other
        self.assertFalse(self.client.get(f"/api/posts/{post_id}").json()["data"]["isMine"])
        self.assertEqual(self.client.put(f"/api/posts/{post_id}", json={"title": "남이 수정"}).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/posts/{post_id}").status_code, 403)

        app.dependency_overrides[get_current_user] = lambda: self.user
        updated = self.client.put(
            f"/api/posts/{post_id}", json={"title": "고친 제목", "content": "고친 내용입니다.", "clearBabyAge": True, "isAnonymous": True}
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        data = updated.json()["data"]
        self.assertEqual((data["title"], data["content"], data["babyAgeMonths"]), ("고친 제목", "고친 내용입니다.", None))
        self.assertEqual(data["author"]["nickname"], "익명")
        self.assertEqual(data["likeCount"], 1)
        self.assertEqual(self.client.put(f"/api/posts/{post_id}", json={"category": "NOPE"}).status_code, 400)
        self.assertEqual(self.client.put(f"/api/posts/{post_id}", json={"title": "x"}).status_code, 422)

        self.assertEqual(self.client.delete(f"/api/posts/{post_id}").status_code, 200)
        self.assertEqual(self.client.get(f"/api/posts/{post_id}").status_code, 404)
        self.assertEqual(self.client.get("/api/posts").json()["data"], [])

    # --- 기록 삭제 ---------------------------------------------------------------------------

    def test_record_delete_by_owner_only(self) -> None:
        created = self.client.post(
            "/api/records/feeding",
            json={"babyId": self.baby.id, "occurredAt": "2026-10-01T09:00:00+09:00", "feedingType": "FORMULA", "amountMl": 120},
        ).json()["data"]
        app.dependency_overrides[get_current_user] = lambda: self.other
        self.assertEqual(self.client.delete(f"/api/records/{created['id']}").status_code, 404)
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.assertEqual(self.client.delete(f"/api/records/{created['id']}").status_code, 200)
        self.assertEqual(self.client.delete(f"/api/records/{created['id']}").status_code, 404)
        listed = self.client.get("/api/records", params={"babyId": self.baby.id, "date": "2026-10-01"}).json()["data"]
        self.assertEqual(listed, [])

    # --- 보호자 메모 ---------------------------------------------------------------------

    def test_memo_upsert_keeps_one_per_day_and_blank_deletes(self) -> None:
        body = {"babyId": self.baby.id, "date": "2026-10-01", "content": "오늘 눈맞춤이 길어졌다."}
        first = self.client.put("/api/diary/materials/memo", json=body)
        self.assertEqual(first.status_code, 200, first.text)
        second = self.client.put("/api/diary/materials/memo", json={**body, "content": "수정한 메모"})
        self.assertEqual(second.json()["data"]["id"], first.json()["data"]["id"])

        listed = self.client.get("/api/diary/materials", params={"babyId": self.baby.id, "date": "2026-10-01"}).json()["data"]
        self.assertEqual(listed["counts"], {"chat": 0, "memo": 1})
        self.assertEqual(listed["items"][0]["content"], "수정한 메모")

        cleared = self.client.put("/api/diary/materials/memo", json={**body, "content": "  "})
        self.assertIsNone(cleared.json()["data"])
        listed = self.client.get("/api/diary/materials", params={"babyId": self.baby.id, "date": "2026-10-01"}).json()["data"]
        self.assertEqual(listed["counts"]["memo"], 0)

        app.dependency_overrides[get_current_user] = lambda: self.other
        self.assertEqual(self.client.put("/api/diary/materials/memo", json=body).status_code, 404)

    # --- 일기 생성 장애 → 503 ------------------------------------------------------------

    def test_diary_generate_returns_503_when_model_fails(self) -> None:
        class BrokenLlm:
            provider = "fake"

            def complete(self, **kwargs):
                raise LlmError("quota")

        original = ai_service._get_llm_client
        ai_service._get_llm_client = lambda: BrokenLlm()
        try:
            response = self.client.post(
                "/api/ai/diary/generate",
                json={"baby": {"name": "하린"}, "date": "2026-10-01",
                      "records": {"feeding": [{"recordedAt": "2026-10-01T08:00:00", "amountMl": 120}]},
                      "photoDescriptions": [], "memo": "눈맞춤이 길어졌다.", "conversations": []},
            )
        finally:
            ai_service._get_llm_client = original

        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(response.json()["detail"], ai_service.DIARY_AI_BUSY_DETAIL)


if __name__ == "__main__":
    unittest.main()
