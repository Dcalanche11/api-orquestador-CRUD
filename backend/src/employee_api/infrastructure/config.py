from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: SecretStr
    jwt_secret: SecretStr
    jwt_issuer: str = "employee-api"
    jwt_audience: str = "employee-web"
    access_token_minutes: int = Field(default=30, ge=1, le=120)
    cors_origins: list[str] = ["http://localhost:5173"]
    rate_limit_storage_uri: str = "memory://"
    request_rate_limit: str = "100/minute"
    login_rate_limit: str = "5/minute"

    @field_validator("jwt_secret")
    @classmethod
    def strong_secret(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("JWT_SECRET requiere al menos 32 caracteres aleatorios.")
        return value

    @field_validator("cors_origins")
    @classmethod
    def explicit_origins(cls, value: list[str]) -> list[str]:
        if "*" in value:
            raise ValueError("Configure orígenes CORS explícitos.")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
