from pydantic import BaseModel, Field


class SocialLoginRequest(BaseModel):
    provider: str = Field(pattern="^(kakao|naver|google)$")
    accessToken: str = Field(min_length=1)


class SocialCodeLoginRequest(BaseModel):
    provider: str = Field(pattern="^(kakao|naver|google)$")
    code: str = Field(min_length=1)
    redirectUri: str = Field(min_length=1)
    codeVerifier: str | None = None


class LogoutRequest(BaseModel):
    refreshToken: str = Field(min_length=1)


class AuthUserResponse(BaseModel):
    id: str
    nickname: str | None = None
    email: str | None = None
    provider: str


class SocialLoginResponse(BaseModel):
    accessToken: str
    refreshToken: str
    isNewUser: bool
    user: AuthUserResponse
