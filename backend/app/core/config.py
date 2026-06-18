from functools import cached_property

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "HalfStep API"
    ENVIRONMENT: str = "local"
    API_PREFIX: str = "/api"

    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8081"

    DATABASE_URL: str = "mysql+pymysql://halfstep:halfstep@localhost:3306/halfstep"

    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("API_PREFIX")
    @classmethod
    def api_prefix_must_start_with_slash(cls, value: str) -> str:
        if not value.startswith("/"):
            return f"/{value}"
        return value

    @cached_property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()

