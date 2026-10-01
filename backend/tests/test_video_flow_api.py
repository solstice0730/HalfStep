"""소개 영상 핵심 플로우 API 테스트: 홈 큐레이션, AI 대화 근거, 일기 재료, 사진 분석, 캘린더 카운트,
커뮤니티 공감·저장, 주간 리포트."""

import unittest
from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.db.base import Base
from app.main import app
from app.models.baby import Baby
from app.models.community import CommunityCategory
from app.models.user import User
from app.services import ai as ai_service
from app.services.llm import load_image
from app.services import records as records_service
from app.services import reports as reports_service

TODAY = date(2026, 9, 23)


class VideoFlowApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = User(social_provider="google", social_user_id="video-owner", nickname="하린맘")
        self.other = User(social_provider="google", social_user_id="video-other", nickname="다른 사용자")
        self.db.add_all(
            [
                self.user,
                self.other,
                CommunityCategory(code="SLEEP_DEVELOPMENT", name="수면·발달", sort_order=10, is_active=True),
            ]
        )
        self.db.flush()
        # 월령은 실제 오늘 기준으로 계산되므로(age_in_days) 생일을 실제 오늘에서 118일 전으로 둔다.
        real_today = datetime.now(timezone.utc).date()
        self.baby = Baby(owner_user_id=self.user.id, name="하린", birth_date=real_today - timedelta(days=118), gender="FEMALE")
        self.other_baby = Baby(owner_user_id=self.other.id, name="남의 아기", birth_date=TODAY, gender="UNKNOWN")
        self.db.add_all([self.baby, self.other_baby])
        self.db.commit()
        self.original_provider = settings.AI_PROVIDER
        settings.AI_PROVIDER = "none"
        self.original_current_date = records_service.current_date
        records_service.current_date = lambda: TODAY
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        settings.AI_PROVIDER = self.original_provider
        records_service.current_date = self.original_current_date
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    # --- helpers -----------------------------------------------------------------

    def feed(self, day: date, hour: int, ml: int, feeding_type: str = "FORMULA") -> None:
        response = self.client.post(
            "/api/records/feeding",
            json={
                "babyId": self.baby.id,
                "occurredAt": f"{day.isoformat()}T{hour:02d}:00:00+09:00",
                "feedingType": feeding_type,
                "amountMl": ml,
            },
        )
        self.assertEqual(response.status_code, 201, response.text)

    def sleep(self, day: date, start_hour: int, minutes: int) -> None:
        end_hour, end_minute = divmod(start_hour * 60 + minutes, 60)
        response = self.client.post(
            "/api/records/sleep",
            json={
                "babyId": self.baby.id,
                "startedAt": f"{day.isoformat()}T{start_hour:02d}:00:00+09:00",
                "endedAt": f"{day.isoformat()}T{end_hour:02d}:{end_minute:02d}:00+09:00",
            },
        )
        self.assertEqual(response.status_code, 201, response.text)

    def seed_today(self) -> None:
        for hour, ml in ((7, 140), (10, 150), (13, 150), (16, 160)):
            self.feed(TODAY, hour, ml)
        self.sleep(TODAY, 8, 95)
        self.client.post("/api/records/urine", json={"babyId": self.baby.id, "occurredAt": f"{TODAY}T11:20:00+09:00"})

    def seed_week(self, end: date, base_ml: int, hours=(7, 10, 13, 16)) -> None:
        for offset in range(7):
            day = end - timedelta(days=offset)
            for hour in hours:
                self.feed(day, hour, base_ml)

    # --- 02 빠른 기록 -------------------------------------------------------------

    def test_solid_feeding_type_is_accepted_and_summarized(self) -> None:
        self.feed(TODAY, 12, 80, feeding_type="SOLID")
        day = self.client.get("/api/calendar/daily", params={"babyId": self.baby.id, "date": TODAY.isoformat()})
        self.assertEqual(day.json()["data"]["timeline"][0]["summary"], "이유식 80ml")

    # --- 01 홈 큐레이션 -----------------------------------------------------------

    def test_dashboard_builds_curation_from_records(self) -> None:
        self.seed_week(TODAY - timedelta(days=1), 150)
        self.seed_today()

        response = self.client.get("/api/home/dashboard", params={"babyId": self.baby.id})

        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["todaySummary"]["feedingCount"], 4)
        self.assertEqual(data["todaySummary"]["feedingTotalMl"], 600)
        self.assertEqual(data["todaySummary"]["lastFeedingIntervalMinutes"], 180)
        self.assertEqual(data["todaySummary"]["photoCount"], 0)
        self.assertFalse(data["todaySummary"]["diarySaved"])
        curation = data["curation"]
        self.assertIn("600ml", curation["text"])
        self.assertIn("최근 7일 범위와 비슷", curation["text"])
        self.assertIn("약 3시간", curation["text"])
        self.assertEqual(curation["basis"][0], "생후 118일")
        self.assertEqual(curation["chips"], ["수유 신호", "낮잠 루틴", "배변 체크"])

    def test_dashboard_without_records_uses_default_curation(self) -> None:
        response = self.client.get("/api/home/dashboard", params={"babyId": self.baby.id})
        self.assertEqual(response.json()["data"]["curation"]["text"], "이 시기에는 수유 텀과 낮잠 리듬이 조금씩 달라져요. "
                         "오늘은 수유 간격, 낮잠 길이, 배변 변화를 같이 확인해보세요.")

    # --- 03 맞춤 대화 -------------------------------------------------------------

    def test_ask_returns_evidence_context_and_diary_suggestion(self) -> None:
        self.seed_week(TODAY - timedelta(days=1), 150)
        self.seed_today()

        response = self.client.post(
            "/api/ai/ask",
            json={"babyId": self.baby.id, "date": TODAY.isoformat(), "question": "오늘 수유량 괜찮아?"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["source"], "fallback")
        self.assertTrue(data["suggestDiaryLink"])
        self.assertEqual(data["evidence"][0], "생후 118일")
        self.assertIn("오늘 수유 4회 · 600ml", data["evidence"])
        self.assertEqual(data["context"]["todayFeedingTotalMl"], 600)
        self.assertEqual(data["context"]["weeklyAvgDailyMl"], 600)
        self.assertEqual(data["context"]["avgIntervalMinutes"], 180)
        self.assertTrue(data["answer"].startswith("하린이의 오늘 기록을 확인했어요."))
        self.assertIn("총 600ml", data["answer"])
        self.assertIn("약 3시간", data["answer"])

    def test_ask_without_records_does_not_suggest_diary(self) -> None:
        response = self.client.post(
            "/api/ai/ask", json={"babyId": self.baby.id, "date": TODAY.isoformat(), "question": "오늘 어땠어?"}
        )
        data = response.json()["data"]
        self.assertEqual(data["source"], "no_data")
        self.assertFalse(data["suggestDiaryLink"])
        self.assertEqual(data["context"]["todayFeedingCount"], 0)

    # --- 03→04 일기 재료 ------------------------------------------------------------

    def test_diary_materials_crud_and_owner_check(self) -> None:
        created = self.client.post(
            "/api/diary/materials",
            json={"babyId": self.baby.id, "date": TODAY.isoformat(), "source": "CHAT", "content": "Q: 수유량?\nA: 600ml예요."},
        )
        self.assertEqual(created.status_code, 201, created.text)
        material_id = created.json()["data"]["id"]

        listed = self.client.get("/api/diary/materials", params={"babyId": self.baby.id, "date": TODAY.isoformat()})
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertEqual(listed.json()["data"]["counts"], {"chat": 1, "memo": 0})
        self.assertEqual(listed.json()["data"]["items"][0]["source"], "CHAT")

        blank = self.client.post(
            "/api/diary/materials",
            json={"babyId": self.baby.id, "date": TODAY.isoformat(), "source": "CHAT", "content": "   "},
        )
        self.assertEqual(blank.status_code, 422)

        foreign = self.client.post(
            "/api/diary/materials",
            json={"babyId": self.other_baby.id, "date": TODAY.isoformat(), "source": "CHAT", "content": "x"},
        )
        self.assertEqual(foreign.status_code, 404)

        app.dependency_overrides[get_current_user] = lambda: self.other
        self.assertEqual(self.client.delete(f"/api/diary/materials/{material_id}").status_code, 404)
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.assertEqual(self.client.delete(f"/api/diary/materials/{material_id}").status_code, 200)
        self.assertEqual(self.client.delete(f"/api/diary/materials/{material_id}").status_code, 404)

    def test_diary_detail_route_still_resolves_numeric_id(self) -> None:
        self.assertEqual(self.client.get("/api/diary/999").status_code, 404)

    # --- 04 AI 육아일기 ------------------------------------------------------------

    def test_diary_generate_accepts_conversations_as_only_input(self) -> None:
        response = self.client.post(
            "/api/ai/diary/generate",
            json={
                "baby": {"name": "하린", "ageMonths": 3},
                "date": TODAY.isoformat(),
                "records": {},
                "photoDescriptions": [],
                "memo": None,
                "conversations": ["Q: 오늘 수유량 괜찮아?\nA: 분유 4회, 총 600ml로 안정적이에요."],
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()["data"]["generatedByAi"])

    def test_diary_prompt_includes_conversations(self) -> None:
        from app.schemas.ai import BabyInfo, DiaryGenerateRequest

        prompt = ai_service._build_diary_prompt(
            DiaryGenerateRequest(baby=BabyInfo(name="하린"), date=TODAY, conversations=["Q: a\nA: b"])
        )
        self.assertIn("대화 요약", prompt)
        self.assertIn("Q: a", prompt)

    def test_photo_analyze_falls_back_without_llm(self) -> None:
        response = self.client.post(
            "/api/ai/photos/analyze", json={"photoUrls": ["http://localhost:8000/uploads/a.jpg"]}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json()["data"]["items"],
            [{"url": "http://localhost:8000/uploads/a.jpg", "caption": None, "source": "fallback"}],
        )
        self.assertEqual(self.client.post("/api/ai/photos/analyze", json={"photoUrls": []}).status_code, 422)

    def test_photo_analyze_rejects_path_traversal(self) -> None:
        self.assertIsNone(load_image("http://x/uploads/../secret.txt"))
        self.assertIsNone(load_image("file:///etc/passwd"))

    # --- 05 캘린더 ------------------------------------------------------------------

    def test_calendar_day_counts_photos_and_chats(self) -> None:
        self.seed_today()
        self.client.post(
            "/api/diary/materials",
            json={"babyId": self.baby.id, "date": TODAY.isoformat(), "source": "CHAT", "content": "Q\nA"},
        )
        self.client.post(
            "/api/diary",
            json={
                "babyId": self.baby.id, "date": TODAY.isoformat(), "title": "눈맞춤이 길어진 하루",
                "content": "본문", "isAiGenerated": True, "highlights": [],
                "imageUrls": ["https://example.test/1.jpg", "https://example.test/2.jpg"],
            },
        )
        day = self.client.get("/api/calendar/daily", params={"babyId": self.baby.id, "date": TODAY.isoformat()})
        summary = day.json()["data"]["daySummary"]
        self.assertEqual(summary["chatCount"], 1)
        self.assertEqual(summary["photoCount"], 2)
        self.assertEqual(summary["feedingCount"], 4)

    # --- 06 커뮤니티 ----------------------------------------------------------------

    def test_like_and_bookmark_toggle_and_counts(self) -> None:
        created = self.client.post(
            "/api/posts",
            json={
                "category": "SLEEP_DEVELOPMENT", "title": "낮잠 루틴이 조금씩 잡히고 있어요",
                "content": "기상 시간을 비슷하게 맞추니 낮잠이 안정됐어요.", "imageUrls": [],
                "babyAgeMonths": 4, "isAnonymous": False,
            },
        )
        post_id = created.json()["data"]["id"]

        liked = self.client.post(f"/api/posts/{post_id}/like")
        self.assertEqual(liked.status_code, 200, liked.text)
        self.assertEqual(liked.json()["data"], {"likeCount": 1, "isLiked": True, "isBookmarked": False})
        # 멱등
        self.assertEqual(self.client.post(f"/api/posts/{post_id}/like").json()["data"]["likeCount"], 1)

        bookmarked = self.client.post(f"/api/posts/{post_id}/bookmark").json()["data"]
        self.assertTrue(bookmarked["isBookmarked"])

        app.dependency_overrides[get_current_user] = lambda: self.other
        other_view = self.client.get(f"/api/posts/{post_id}").json()["data"]
        self.assertEqual(other_view["likeCount"], 1)
        self.assertFalse(other_view["isLiked"])
        self.assertFalse(other_view["isBookmarked"])
        self.client.post(f"/api/posts/{post_id}/like")

        app.dependency_overrides[get_current_user] = lambda: self.user
        listed = self.client.get("/api/posts").json()["data"][0]
        self.assertEqual(listed["likeCount"], 2)
        self.assertTrue(listed["isLiked"])
        self.assertTrue(listed["isBookmarked"])

        unliked = self.client.delete(f"/api/posts/{post_id}/like").json()["data"]
        self.assertEqual(unliked, {"likeCount": 1, "isLiked": False, "isBookmarked": True})
        self.assertEqual(self.client.post("/api/posts/999/like").status_code, 404)

    # --- 07 주간 리포트 -------------------------------------------------------------

    def test_weekly_report_compares_with_previous_week(self) -> None:
        previous_end = TODAY - timedelta(days=7)
        # 지난주: 간격이 들쭉날쭉(6,9,13,18시), 이번 주: 3시간 간격 + 수유량 증가
        self.seed_week(previous_end, 130, hours=(6, 9, 13, 18))
        self.seed_week(TODAY, 150, hours=(7, 10, 13, 16))
        self.sleep(TODAY, 8, 95)
        self.sleep(previous_end, 8, 50)

        response = self.client.get(
            "/api/reports/weekly", params={"babyId": self.baby.id, "endDate": TODAY.isoformat()}
        )

        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["period"], {"start": (TODAY - timedelta(days=6)).isoformat(), "end": TODAY.isoformat()})
        self.assertEqual(data["baby"]["name"], "하린")
        self.assertEqual(len(data["feeding"]["daily"]), 7)
        self.assertEqual(data["feeding"]["daily"][-1]["totalMl"], 600)
        self.assertEqual(data["feeding"]["totalMl"], 4200)
        self.assertEqual(data["feeding"]["prevTotalMl"], 3640)
        self.assertEqual(data["feeding"]["changePercent"], 15)
        self.assertEqual(data["insight"]["headline"], "수유 리듬이 더 일정해졌어요")
        self.assertIn("3시간", data["insight"]["body"])
        self.assertEqual(data["sleep"]["changeMinutes"], 45)
        # 생후 118일(3~4개월): 수유 신호·수면 리듬·이유식 시작 안내가 매칭된다.
        self.assertEqual([item["title"] for item in data["curations"]][:2], ["수유 신호와 간격 확인", "월령별 수면 리듬 안내"])
        self.assertLessEqual(len(data["curations"]), 3)
        self.assertEqual(data["curations"][0]["source"], "질병관리청 국가건강정보포털")
        self.assertEqual(data["curations"][0]["reviewedAt"], reports_service.CURATION_REVIEWED_AT)
        self.assertEqual(data["nextWeekFocus"], ["저녁 수유", "낮잠 길이", "배변 변화"])

    def test_weekly_report_with_few_records_asks_for_more(self) -> None:
        self.feed(TODAY, 9, 100)
        data = self.client.get(
            "/api/reports/weekly", params={"babyId": self.baby.id, "endDate": TODAY.isoformat()}
        ).json()["data"]
        self.assertEqual(data["insight"]["headline"], "기록을 조금 더 모아볼까요")
        self.assertIsNone(data["feeding"]["changePercent"])

    def test_weekly_report_requires_owner(self) -> None:
        response = self.client.get("/api/reports/weekly", params={"babyId": self.other_baby.id})
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
