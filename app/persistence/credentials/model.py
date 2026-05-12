from sqlalchemy import Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Credential(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "credentials"

    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    owner_user_id: Mapped[str] = mapped_column(
        String(32), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False)
    auth_type: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    encrypted_secret: Mapped[str] = mapped_column(Text, nullable=False)
    secret_version: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False)
    config_json: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False)
    scopes_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), default="active", nullable=False, index=True)
    last_verified_at: Mapped[str | None] = mapped_column(
        String(64), nullable=True)
    expires_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
