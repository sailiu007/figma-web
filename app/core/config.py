from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_prefix="ATLAS_", extra="ignore")

    app_name: str = "Atlas"
    env: str = "dev"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://root:ci1234@localhost:5432/atlas"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    secret_key: str = "change-this-with-a-32-byte-random-value"
    default_admin_password: str = "admin123"
    jwt_access_ttl_seconds: int = 3600
    jwt_refresh_ttl_seconds: int = 604800
    task_always_eager: bool = False
    default_tenant_slug: str = "atlas"
    default_admin_username: str = "admin"
    pushgateway_url: str | None = None
    kubeconfig_path: str | None = None
    kubernetes_context: str | None = None
    jenkins_base_url: str | None = None
    jenkins_username: str | None = None
    jenkins_api_token: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
