import base64
import binascii

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.community import CommunityPost
from app.models.user import User
from app.repositories import community_repository
from app.schemas.community import CommunityPostCreate

AGE_GROUPS = {
    "M0_2": (0, 2),
    "M3_5": (3, 5),
    "M6_8": (6, 8),
    "M9_11": (9, 11),
    "M12_17": (12, 17),
    "M18_24": (18, 24),
}


def list_community_posts(
    db: Session,
    *,
    category: str | None,
    age_group: str | None,
    cursor: str | None,
    limit: int,
) -> tuple[list[CommunityPost], str | None, bool]:
    category_code = category.strip().upper() if category else None
    if category_code and community_repository.get_category_by_code(db, category_code) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category.")

    normalized_age_group = age_group.strip().upper() if age_group else None
    if normalized_age_group and normalized_age_group not in {*AGE_GROUPS, "ALL_AGES"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid age group.")

    before_id = _decode_cursor(cursor) if cursor else None
    posts = community_repository.list_posts(
        db,
        category_code=category_code,
        age_range=AGE_GROUPS.get(normalized_age_group),
        age_independent=normalized_age_group == "ALL_AGES",
        before_id=before_id,
        limit=limit + 1,
    )
    has_next = len(posts) > limit
    page = posts[:limit]
    next_cursor = _encode_cursor(page[-1].id) if has_next and page else None
    return page, next_cursor, has_next


def get_community_post(db: Session, post_id: int) -> CommunityPost:
    post = community_repository.get_post(db, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    return post


def create_community_post(
    db: Session,
    *,
    payload: CommunityPostCreate,
    current_user: User,
) -> CommunityPost:
    category = community_repository.get_category_by_code(db, payload.category)
    if category is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category.")
    post = community_repository.create_post(
        db,
        category=category,
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        image_urls=payload.imageUrls,
        baby_age_months=payload.babyAgeMonths,
        is_anonymous=payload.isAnonymous,
    )
    db.commit()
    return post


def serialize_author(post: CommunityPost, *, include_user_id: bool = False) -> dict:
    anonymous = post.is_anonymous
    return {
        "userId": str(post.user_id) if include_user_id and not anonymous else None,
        "nickname": "익명" if anonymous else (post.author.nickname or "사용자"),
        "isAnonymous": anonymous,
    }


def serialize_list_item(post: CommunityPost) -> dict:
    preview = post.content[:100] + ("..." if len(post.content) > 100 else "")
    return {
        "id": str(post.id), "category": post.category.code, "title": post.title,
        "preview": preview, "author": serialize_author(post), "likeCount": 0,
        "babyAgeMonths": post.baby_age_months, "commentCount": 0,
        "imageCount": len(post.image_urls or []), "createdAt": post.created_at,
    }


def _encode_cursor(post_id: int) -> str:
    return base64.urlsafe_b64encode(f"post:{post_id}".encode()).decode().rstrip("=")


def _decode_cursor(cursor: str) -> int:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        value = base64.urlsafe_b64decode(padded).decode()
        prefix, raw_id = value.split(":", 1)
        if prefix != "post" or int(raw_id) < 1:
            raise ValueError
        return int(raw_id)
    except (ValueError, UnicodeDecodeError, binascii.Error) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid cursor.") from exc
