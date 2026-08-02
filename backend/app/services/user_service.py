from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import anonymize_user, update_user_nickname


def update_profile(db: Session, *, user: User, nickname: str) -> User:
    return update_user_nickname(db, user=user, nickname=nickname)


def delete_account(db: Session, *, user: User) -> None:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    anonymize_user(db, user=user)
