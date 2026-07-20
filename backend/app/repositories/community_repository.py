from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.models.community import CommunityCategory, CommunityPost


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
