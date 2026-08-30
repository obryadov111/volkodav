from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Hardening API"
    API_PREFIX: str = "/api"

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    TOTP_ISSUER: str = "Hardening"
    TOTP_SECRET_ENCRYPTION_KEY: str

    FIRST_ADMIN_EMAIL: str | None = None
    FIRST_ADMIN_PASSWORD: str | None = None
    FIRST_ADMIN_NAME: str | None = None

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost,http://192.168.0.147:5173,http://10.8.0.1:5173"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()