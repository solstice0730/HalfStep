from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import update_user_nickname


def update_profile(db: Session, *, user: User, nickname: str) -> User:
    return update_user_nickname(db, user=user, nickname=nickname)
