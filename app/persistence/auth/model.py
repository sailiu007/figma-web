from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True)
    username: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(
        String(255), nullable=True)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(
        String(8), nullable=True)
    title: Mapped[str | None] = mapped_column(String(128), nullable=True)
    team: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    global_status: Mapped[str] = mapped_column(
        String(32), default="active", nullable=False, index=True)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True)


class Role(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "roles"

    tenant_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default="active", nullable=False, index=True)
    created_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"), nullable=True)


class Permission(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "permissions"

    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    code: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(32), nullable=False)
    resource_pattern: Mapped[str | None] = mapped_column(
        String(255), nullable=True)
    resource_key: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False)


class UserRole(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint(
        "user_id", "role_id", name="uq_user_roles_user_role"),)

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True)
    role_id: Mapped[str] = mapped_column(
        ForeignKey("roles.id"), nullable=False, index=True)
    assigned_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"), nullable=True)


class RolePermission(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id",
                      name="uq_role_permissions_role_permission"),)

    role_id: Mapped[str] = mapped_column(
        ForeignKey("roles.id"), nullable=False, index=True)
    permission_id: Mapped[str] = mapped_column(
        ForeignKey("permissions.id"), nullable=False, index=True)
