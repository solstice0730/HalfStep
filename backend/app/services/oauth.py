from dataclasses import dataclass
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

from app.core.config import settings


@dataclass(frozen=True)
class OAuthProfile:
    provider: str
    provider_user_id: str
    email: str | None
    nickname: str | None
    profile_image_url: str | None = None


def verify_oauth_access_token(provider: str, access_token: str) -> OAuthProfile:
    if settings.OAUTH_DEV_TOKENS_ENABLED and access_token.startswith("dev:"):
        return _parse_dev_token(provider, access_token)

    if provider == "kakao":
        return _fetch_kakao_profile(access_token)
    if provider == "naver":
        return _fetch_naver_profile(access_token)
    if provider == "google":
        return _fetch_google_profile(access_token)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported OAuth provider.",
    )


def exchange_oauth_code_for_profile(
    *,
    provider: str,
    code: str,
    redirect_uri: str,
    code_verifier: str | None,
) -> OAuthProfile:
    access_token = exchange_oauth_code(
        provider=provider,
        code=code,
        redirect_uri=redirect_uri,
        code_verifier=code_verifier,
    )
    return verify_oauth_access_token(provider, access_token)


def exchange_oauth_code(
    *,
    provider: str,
    code: str,
    redirect_uri: str,
    code_verifier: str | None,
) -> str:
    if provider == 'kakao' and not settings.KAKAO_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Kakao Login requires KAKAO_CLIENT_SECRET on the backend.',
        )

    if provider == "google":
        return _exchange_code(
            token_url="https://oauth2.googleapis.com/token",
            form={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "code_verifier": code_verifier,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
    if provider == "kakao":
        return _exchange_code(
            token_url="https://kauth.kakao.com/oauth/token",
            form={
                "client_id": settings.KAKAO_REST_API_KEY,
                "client_secret": settings.KAKAO_CLIENT_SECRET,
                "code": code,
                "code_verifier": code_verifier,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
    if provider == "naver":
        return _exchange_code(
            token_url="https://nid.naver.com/oauth2.0/token",
            form={
                "client_id": settings.NAVER_CLIENT_ID,
                "client_secret": settings.NAVER_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported OAuth provider.",
    )


def _parse_dev_token(provider: str, access_token: str) -> OAuthProfile:
    parts = access_token.split(":", 3)
    if len(parts) < 3 or parts[1] != provider:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid development OAuth token.",
        )

    provider_user_id = parts[2]
    email = parts[3] if len(parts) == 4 and parts[3] else f"{provider_user_id}@example.test"
    return OAuthProfile(
        provider=provider,
        provider_user_id=provider_user_id,
        email=email,
        nickname=f"{provider_user_id}",
    )


def _get_json(url: str, access_token: str) -> dict:
    request = Request(url, headers={"Authorization": f"Bearer {access_token}"})
    try:
        with urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OAuth access token verification failed.",
        ) from exc


def _exchange_code(token_url: str, form: dict[str, str | None]) -> str:
    body = urlencode({key: value for key, value in form.items() if value}).encode("utf-8")
    request = Request(
        token_url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OAuth authorization code exchange failed.",
        ) from exc

    access_token = payload.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OAuth token response is missing access_token.",
        )
    return str(access_token)


def _fetch_kakao_profile(access_token: str) -> OAuthProfile:
    payload = _get_json("https://kapi.kakao.com/v2/user/me", access_token)
    account = payload.get("kakao_account") or {}
    profile = account.get("profile") or {}
    provider_user_id = payload.get("id")
    if provider_user_id is None:
        raise _invalid_profile()

    return OAuthProfile(
        provider="kakao",
        provider_user_id=str(provider_user_id),
        email=account.get("email"),
        nickname=profile.get("nickname"),
        profile_image_url=profile.get("profile_image_url"),
    )


def _fetch_naver_profile(access_token: str) -> OAuthProfile:
    payload = _get_json("https://openapi.naver.com/v1/nid/me", access_token)
    response = payload.get("response") or {}
    provider_user_id = response.get("id")
    if provider_user_id is None:
        raise _invalid_profile()

    return OAuthProfile(
        provider="naver",
        provider_user_id=str(provider_user_id),
        email=response.get("email"),
        nickname=response.get("nickname") or response.get("name"),
        profile_image_url=response.get("profile_image"),
    )


def _fetch_google_profile(access_token: str) -> OAuthProfile:
    payload = _get_json("https://www.googleapis.com/oauth2/v3/userinfo", access_token)
    provider_user_id = payload.get("sub")
    if provider_user_id is None:
        raise _invalid_profile()

    return OAuthProfile(
        provider="google",
        provider_user_id=str(provider_user_id),
        email=payload.get("email"),
        nickname=payload.get("name"),
        profile_image_url=payload.get("picture"),
    )


def _invalid_profile() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="OAuth profile response is invalid.",
    )
