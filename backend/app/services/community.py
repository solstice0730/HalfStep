import base64
import binascii

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.community import CommunityPost
from app.models.community_comment import CommunityComment
from app.models.user import User
from app.repositories import community_repository
from app.schemas.community import CommunityPostCreate, CommunityPostUpdate

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
    query: str | None = None,
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
        search_term=query.strip() if query else None,
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


def serialize_list_item(
    post: CommunityPost,
    *,
    like_count: int = 0,
    is_liked: bool = False,
    is_bookmarked: bool = False,
    comment_count: int = 0,
    is_mine: bool = False,
) -> dict:
    preview = post.content[:100] + ("..." if len(post.content) > 100 else "")
    return {
        "id": str(post.id), "category": post.category.code, "title": post.title,
        "preview": preview, "author": serialize_author(post), "likeCount": like_count,
        "isLiked": is_liked, "isBookmarked": is_bookmarked, "isMine": is_mine,
        "babyAgeMonths": post.baby_age_months, "commentCount": comment_count,
        "imageCount": len(post.image_urls or []), "createdAt": post.created_at,
    }


REACTION_TYPES = {"LIKE", "BOOKMARK"}


def reaction_state(db: Session, *, posts: list[CommunityPost], user_id: int) -> dict[int, dict]:
    """게시글 목록에 대한 공감 수와 현재 사용자의 공감·저장 여부를 한 번에 조회한다."""
    post_ids = [post.id for post in posts]
    like_counts = community_repository.count_reactions(db, post_ids=post_ids, reaction_type="LIKE")
    comment_counts = community_repository.count_comments(db, post_ids=post_ids)
    mine = community_repository.user_reactions(db, post_ids=post_ids, user_id=user_id)
    return {
        post.id: {
            "like_count": like_counts.get(post.id, 0),
            "is_liked": (post.id, "LIKE") in mine,
            "is_bookmarked": (post.id, "BOOKMARK") in mine,
            "comment_count": comment_counts.get(post.id, 0),
            "is_mine": post.user_id == user_id,
        }
        for post in posts
    }


def set_reaction(
    db: Session, *, post_id: int, user_id: int, reaction_type: str, active: bool
) -> dict:
    """공감·저장을 켜거나 끈다. 이미 같은 상태면 그대로 두어 멱등하게 동작한다."""
    if reaction_type not in REACTION_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reaction type.")
    get_community_post(db, post_id)
    existing = community_repository.get_reaction(db, post_id=post_id, user_id=user_id, reaction_type=reaction_type)
    if active and existing is None:
        community_repository.add_reaction(db, post_id=post_id, user_id=user_id, reaction_type=reaction_type)
    elif not active and existing is not None:
        community_repository.remove_reaction(db, existing)
    db.commit()
    state = reaction_state(db, posts=[get_community_post(db, post_id)], user_id=user_id)[post_id]
    return {
        "likeCount": state["like_count"],
        "isLiked": state["is_liked"],
        "isBookmarked": state["is_bookmarked"],
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


def list_comments(db: Session, *, post_id: int, user_id: int) -> list[dict]:
    get_community_post(db, post_id)
    comments = community_repository.list_comments(db, post_id=post_id)
    return [serialize_comment(comment, user_id=user_id) for comment in comments]


def add_comment(db: Session, *, post_id: int, user: User, content: str, is_anonymous: bool) -> dict:
    get_community_post(db, post_id)
    comment = community_repository.create_comment(
        db, post_id=post_id, user_id=user.id, content=content, is_anonymous=is_anonymous
    )
    db.commit()
    db.refresh(comment)
    return serialize_comment(comment, user_id=user.id)


def remove_comment(db: Session, *, post_id: int, comment_id: int, user_id: int) -> None:
    comment = community_repository.get_comment(db, comment_id)
    if comment is None or comment.post_id != post_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")
    if comment.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can delete this comment.")
    community_repository.delete_comment(db, comment)
    db.commit()


def serialize_comment(comment: CommunityComment, *, user_id: int) -> dict:
    anonymous = comment.is_anonymous
    return {
        "id": str(comment.id),
        "postId": str(comment.post_id),
        "content": comment.content,
        "author": {
            "userId": None if anonymous else str(comment.user_id),
            "nickname": "익명" if anonymous else (comment.author.nickname or "사용자"),
            "isAnonymous": anonymous,
        },
        "isMine": comment.user_id == user_id,
        "createdAt": comment.created_at,
    }


def _get_owned_post(db: Session, *, post_id: int, user_id: int) -> CommunityPost:
    post = get_community_post(db, post_id)
    if post.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can change this post.")
    return post


def update_community_post(db: Session, *, post_id: int, user: User, payload: CommunityPostUpdate) -> CommunityPost:
    post = _get_owned_post(db, post_id=post_id, user_id=user.id)
    if payload.category is not None:
        category = community_repository.get_category_by_code(db, payload.category)
        if category is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category.")
        post.category = category
    if payload.title is not None:
        post.title = payload.title
    if payload.content is not None:
        post.content = payload.content
    if payload.imageUrls is not None:
        post.image_urls = payload.imageUrls
    if payload.clearBabyAge:
        post.baby_age_months = None
    elif payload.babyAgeMonths is not None:
        post.baby_age_months = payload.babyAgeMonths
    if payload.isAnonymous is not None:
        post.is_anonymous = payload.isAnonymous
    db.commit()
    db.refresh(post)
    return post


def delete_community_post(db: Session, *, post_id: int, user: User) -> None:
    post = _get_owned_post(db, post_id=post_id, user_id=user.id)
    community_repository.delete_post(db, post)
    db.commit()
