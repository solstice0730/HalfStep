from datetime import datetime, timedelta, timezone
from typing import Literal

from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, hash_token
from app.models.user import User
from app.repositories.user_repository import (
    create_social_user,
    get_user_by_refresh_token_hash,
    get_user_by_social_identity,
    update_refresh_token,
)
from app.schemas.auth import LogoutRequest, SocialCodeLoginRequest, SocialLoginRequest, SocialLoginResponse
from app.services.oauth import exchange_oauth_code_for_profile, verify_oauth_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/{provider}/callback", status_code=status.HTTP_302_FOUND)
def oauth_callback(
    provider: Literal["google", "kakao", "naver"],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
) -> RedirectResponse:
    if code is None and error is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth callback is missing a result.",
        )
    params = {
        key: value
        for key, value in {
            "code": code,
            "error": error,
            "error_description": error_description,
            "state": state,
        }.items()
        if value is not None
    }
    return RedirectResponse(
        url=f"halfstep://login?{urlencode(params)}",
        status_code=status.HTTP_302_FOUND,
    )


@router.post("/social", status_code=status.HTTP_200_OK)
def social_login(payload: SocialLoginRequest, db: Session = Depends(get_db)) -> dict:
    profile = verify_oauth_access_token(payload.provider, payload.accessToken)
    return _issue_session(profile, db)


@router.post("/social/code", status_code=status.HTTP_200_OK)
def social_code_login(payload: SocialCodeLoginRequest, db: Session = Depends(get_db)) -> dict:
    profile = exchange_oauth_code_for_profile(
        provider=payload.provider,
        code=payload.code,
        redirect_uri=payload.redirectUri,
        code_verifier=payload.codeVerifier,
    )
    return _issue_session(profile, db)


def _issue_session(profile, db: Session) -> dict:
    user = get_user_by_social_identity(
        db,
        provider=profile.provider,
        social_user_id=profile.provider_user_id,
    )
    is_new_user = user is None

    if user is None:
        user = create_social_user(
            db,
            provider=profile.provider,
            social_user_id=profile.provider_user_id,
            email=profile.email,
            nickname=profile.nickname,
            profile_image_url=profile.profile_image_url,
        )

    refresh_token = create_refresh_token()
    refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    update_refresh_token(
        db,
        user=user,
        refresh_token_hash=hash_token(refresh_token),
        refresh_token_expires_at=refresh_token_expires_at,
    )
    db.commit()
    db.refresh(user)

    response = SocialLoginResponse(
        accessToken=create_access_token(str(user.id)),
        refreshToken=refresh_token,
        isNewUser=is_new_user,
        user={
            "id": str(user.id),
            "nickname": user.nickname,
            "email": user.email,
            "provider": user.social_provider,
        },
    )
    return {"success": True, "data": response.model_dump()}


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    payload: LogoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    user = get_user_by_refresh_token_hash(
        db,
        refresh_token_hash=hash_token(payload.refreshToken),
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )

    if user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Refresh token does not belong to the authenticated user.",
        )

    if _is_refresh_token_expired(user.refresh_token_expires_at):
        update_refresh_token(
            db,
            user=user,
            refresh_token_hash=None,
            refresh_token_expires_at=None,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired.",
        )

    update_refresh_token(
        db,
        user=user,
        refresh_token_hash=None,
        refresh_token_expires_at=None,
    )
    db.commit()
    return {"success": True, "data": None}


def _is_refresh_token_expired(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return False

    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        return expires_at < now.replace(tzinfo=None)
    return expires_at < now
