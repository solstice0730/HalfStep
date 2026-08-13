import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


@pytest.mark.parametrize("provider", ["google", "kakao", "naver"])
def test_oauth_callback_returns_authorization_result_to_the_app(provider):
    response = client.get(
        f"/api/auth/{provider}/callback",
        params={"code": "auth-code", "state": "csrf-state"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"] == (
        "halfstep://login?code=auth-code&state=csrf-state"
    )
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("provider", ["google", "kakao", "naver"])
def test_oauth_callback_returns_provider_error_to_the_app(provider):
    response = client.get(
        f"/api/auth/{provider}/callback",
        params={
            "error": "access_denied",
            "error_description": "User denied access",
            "state": "csrf-state",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"] == (
        "halfstep://login?error=access_denied"
        "&error_description=User+denied+access&state=csrf-state"
    )


def test_oauth_callback_rejects_missing_result():
    response = client.get(
        "/api/auth/google/callback",
        params={"state": "csrf-state"},
        follow_redirects=False,
    )
    assert response.status_code == 400


def test_oauth_callback_rejects_unknown_provider():
    response = client.get(
        "/api/auth/unknown/callback",
        params={"code": "auth-code", "state": "csrf-state"},
        follow_redirects=False,
    )
    assert response.status_code == 422
