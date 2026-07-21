import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services.oauth import exchange_oauth_code


def test_kakao_code_exchange_requires_client_secret(monkeypatch):
    monkeypatch.setattr(settings, 'KAKAO_CLIENT_SECRET', '')

    with pytest.raises(HTTPException) as exc_info:
        exchange_oauth_code(
            provider='kakao',
            code='authorization-code',
            redirect_uri='http://localhost:8081/login',
            code_verifier='verifier',
        )

    assert exc_info.value.status_code == 503
    assert 'KAKAO_CLIENT_SECRET' in exc_info.value.detail
