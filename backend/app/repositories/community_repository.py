from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.community import CommunityCategory, CommunityPost, CommunityPostReaction
from app.models.community_comment import CommunityComment


def get_category_by_code(db: Session, code: str) -> CommunityCategory | None:
    return db.scalar(
        select(CommunityCategory).where(
            CommunityCategory.code == code,
            CommunityCategory.is_active.is_(True),
        )
    )


def list_posts(
    db: Session,
    *,
    category_code: str | None,
    age_range: tuple[int, int] | None,
    age_independent: bool,
    before_id: int | None,
    limit: int,
) -> list[CommunityPost]:
    statement: Select[tuple[CommunityPost]] = (
        select(CommunityPost)
        .options(joinedload(CommunityPost.category), joinedload(CommunityPost.author))
        .order_by(CommunityPost.id.desc())
        .limit(limit)
    )
    if category_code:
        statement = statement.join(CommunityPost.category).where(
            CommunityCategory.code == category_code,
            CommunityCategory.is_active.is_(True),
        )
    if age_independent:
        statement = statement.where(CommunityPost.baby_age_months.is_(None))
    elif age_range:
        statement = statement.where(
            CommunityPost.baby_age_months >= age_range[0],
            CommunityPost.baby_age_months <= age_range[1],
        )
    if before_id is not None:
        statement = statement.where(CommunityPost.id < before_id)
    return list(db.scalars(statement).all())


def get_post(db: Session, post_id: int) -> CommunityPost | None:
    statement = (
        select(CommunityPost)
        .options(joinedload(CommunityPost.category), joinedload(CommunityPost.author))
        .where(CommunityPost.id == post_id)
    )
    return db.scalar(statement)


def create_post(
    db: Session,
    *,
    category: CommunityCategory,
    user_id: int,
    title: str,
    content: str,
    image_urls: list[str],
    baby_age_months: int | None,
    is_anonymous: bool,
) -> CommunityPost:
    post = CommunityPost(
        category=category,
        user_id=user_id,
        title=title,
        content=content,
        image_urls=image_urls,
        baby_age_months=baby_age_months,
        is_anonymous=is_anonymous,
    )
    db.add(post)
    db.flush()
    return post


def count_reactions(db: Session, *, post_ids: list[int], reaction_type: str) -> dict[int, int]:
    if not post_ids:
        return {}
    statement = (
        select(CommunityPostReaction.post_id, func.count(CommunityPostReaction.id))
        .where(
            CommunityPostReaction.post_id.in_(post_ids),
            CommunityPostReaction.reaction_type == reaction_type,
        )
        .group_by(CommunityPostReaction.post_id)
    )
    return {post_id: int(count) for post_id, count in db.execute(statement).all()}


def user_reactions(db: Session, *, post_ids: list[int], user_id: int) -> set[tuple[int, str]]:
    if not post_ids:
        return set()
    statement = select(CommunityPostReaction.post_id, CommunityPostReaction.reaction_type).where(
        CommunityPostReaction.post_id.in_(post_ids),
        CommunityPostReaction.user_id == user_id,
    )
    return {(post_id, reaction_type) for post_id, reaction_type in db.execute(statement).all()}


def get_reaction(db: Session, *, post_id: int, user_id: int, reaction_type: str) -> CommunityPostReaction | None:
    return db.scalar(
        select(CommunityPostReaction).where(
            CommunityPostReaction.post_id == post_id,
            CommunityPostReaction.user_id == user_id,
            CommunityPostReaction.reaction_type == reaction_type,
        )
    )


def add_reaction(db: Session, *, post_id: int, user_id: int, reaction_type: str) -> CommunityPostReaction:
    reaction = CommunityPostReaction(post_id=post_id, user_id=user_id, reaction_type=reaction_type)
    db.add(reaction)
    db.flush()
    return reaction


def remove_reaction(db: Session, reaction: CommunityPostReaction) -> None:
    db.delete(reaction)
    db.flush()


def count_comments(db: Session, *, post_ids: list[int]) -> dict[int, int]:
    if not post_ids:
        return {}
    statement = (
        select(CommunityComment.post_id, func.count(CommunityComment.id))
        .where(CommunityComment.post_id.in_(post_ids))
        .group_by(CommunityComment.post_id)
    )
    return {post_id: int(count) for post_id, count in db.execute(statement).all()}


def list_comments(db: Session, *, post_id: int) -> list[CommunityComment]:
    statement = (
        select(CommunityComment)
        .options(joinedload(CommunityComment.author))
        .where(CommunityComment.post_id == post_id)
        .order_by(CommunityComment.created_at, CommunityComment.id)
    )
    return list(db.scalars(statement).all())


def create_comment(
    db: Session, *, post_id: int, user_id: int, content: str, is_anonymous: bool
) -> CommunityComment:
    comment = CommunityComment(post_id=post_id, user_id=user_id, content=content, is_anonymous=is_anonymous)
    db.add(comment)
    db.flush()
    return comment


def get_comment(db: Session, comment_id: int) -> CommunityComment | None:
    return db.get(CommunityComment, comment_id)


def delete_comment(db: Session, comment: CommunityComment) -> None:
    db.delete(comment)
    db.flush()
