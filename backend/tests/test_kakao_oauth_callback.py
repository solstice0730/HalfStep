from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_kakao_callback_returns_authorization_result_to_the_app():
    response = client.get(
        "/api/auth/kakao/callback",
        params={"code": "auth-code", "state": "csrf-state"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"] == "halfstep://login?code=auth-code&state=csrf-state"


def test_kakao_callback_returns_provider_error_to_the_app():
    response = client.get(
        "/api/auth/kakao/callback",
        params={
            "error": "access_denied",
            "error_description": "User denied access",
            "state": "csrf-state",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"] == (
        "halfstep://login?error=access_denied&error_description=User+denied+access&state=csrf-state"
    )
