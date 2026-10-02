"""Add one clearly labeled stroller post to the local demo community.

Dry run by default. Existing posts are never changed.
"""

import argparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.community import CommunityCategory, CommunityPost
from app.models.user import User


TITLE = "[시연용] 생후 2개월 아기 유모차, 어떤 점을 보고 고르셨나요?"
CONTENT = (
    "생후 2개월 아기와 짧은 외출을 준비하며 유모차를 알아보고 있어요. "
    "직접 사용해 보신 분들은 접고 펴기, 무게, 보관 편의성 중 무엇이 가장 중요했나요? "
    "이 시기에 확인하면 좋았던 점이나 사용 경험을 나눠 주세요."
)


def seed(db: Session, *, expected_user_id: int, apply: bool) -> tuple[int | None, bool]:
    user = db.get(User, expected_user_id)
    if user is None or user.social_provider != "google":
        raise ValueError("예상한 시연 계정을 찾지 못해 게시글을 넣지 않았습니다.")
    category = db.scalar(select(CommunityCategory).where(
        CommunityCategory.code == "FREE", CommunityCategory.is_active.is_(True)
    ))
    if category is None:
        raise ValueError("자유 카테고리가 없어 게시글을 넣지 않았습니다.")
    existing = db.scalar(select(CommunityPost).where(
        CommunityPost.user_id == expected_user_id,
        CommunityPost.title == TITLE,
    ).limit(1))
    if existing is not None:
        return existing.id, False
    if not apply:
        return None, True
    post = CommunityPost(
        category=category,
        user_id=expected_user_id,
        title=TITLE,
        content=CONTENT,
        image_urls=[],
        baby_age_months=2,
        is_anonymous=True,
    )
    db.add(post)
    db.commit()
    return post.id, True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-user-id", type=int, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    db = SessionLocal()
    try:
        post_id, added = seed(db, expected_user_id=args.expected_user_id, apply=args.apply)
        print(f"mode={'apply' if args.apply else 'dry-run'} post_id={post_id} new_post={added}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
