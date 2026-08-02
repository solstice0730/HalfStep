from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_social_identity(
    db: Session,
    *,
    provider: str,
    social_user_id: str,
) -> User | None:
    statement = select(User).where(
        User.social_provider == provider,
        User.social_user_id == social_user_id,
    )
    return db.scalar(statement)


def get_user_by_refresh_token_hash(
    db: Session,
    *,
    refresh_token_hash: str,
) -> User | None:
    statement = select(User).where(User.refresh_token_hash == refresh_token_hash)
    return db.scalar(statement)


def create_social_user(
    db: Session,
    *,
    provider: str,
    social_user_id: str,
    email: str | None,
    nickname: str | None,
    profile_image_url: str | None,
) -> User:
    user = User(
        social_provider=provider,
        social_user_id=social_user_id,
        email=email,
        nickname=nickname,
        profile_image_url=profile_image_url,
    )
    db.add(user)
    db.flush()
    return user


def update_user_nickname(
    db: Session,
    *,
    user: User,
    nickname: str,
) -> User:
    user.nickname = nickname
    db.add(user)
    db.flush()
    return user


def anonymize_user(
    db: Session,
    *,
    user: User,
) -> User:
    user.nickname = None
    user.email = None
    user.profile_image_url = None
    user.refresh_token_hash = None
    user.refresh_token_expires_at = None
    db.add(user)
    db.flush()
    return user


def update_refresh_token(
    db: Session,
    *,
    user: User,
    refresh_token_hash: str | None,
    refresh_token_expires_at: datetime | None,
) -> User:
    user.refresh_token_hash = refresh_token_hash
    user.refresh_token_expires_at = refresh_token_expires_at
    db.add(user)
    db.flush()
    return user
