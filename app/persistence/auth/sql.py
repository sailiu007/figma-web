from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.persistence.auth.model import Permission, Role, RolePermission, User, UserRole


def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.scalar(select(User).where(User.id == user_id))


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == username))


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.created_at.desc())))


def list_roles(db: Session) -> list[Role]:
    return list(db.scalars(select(Role).order_by(Role.created_at.desc())))


def list_permissions(db: Session) -> list[Permission]:
    return list(db.scalars(select(Permission).order_by(Permission.created_at.desc())))


def get_role_by_code(db: Session, code: str) -> Role | None:
    return db.scalar(select(Role).where(Role.code == code))


def get_role_by_id(db: Session, role_id: str) -> Role | None:
    return db.scalar(select(Role).where(Role.id == role_id))


def get_permission_by_code(db: Session, code: str) -> Permission | None:
    return db.scalar(select(Permission).where(or_(Permission.code == code, Permission.name == code)))


def get_permission_by_id(db: Session, permission_id: str) -> Permission | None:
    return db.scalar(select(Permission).where(Permission.id == permission_id))


def get_user_role_link(db: Session, user_id: str, role_id: str) -> UserRole | None:
    return db.scalar(select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role_id))


def list_user_role_links(db: Session, user_id: str) -> list[UserRole]:
    return list(db.scalars(select(UserRole).where(UserRole.user_id == user_id)))


def get_role_permission_link(db: Session, role_id: str, permission_id: str) -> RolePermission | None:
    return db.scalar(
        select(RolePermission).where(RolePermission.role_id ==
                                     role_id, RolePermission.permission_id == permission_id)
    )


def list_role_permission_links(db: Session, role_id: str) -> list[RolePermission]:
    return list(db.scalars(select(RolePermission).where(RolePermission.role_id == role_id)))


def add_and_flush(db: Session, entity):
    db.add(entity)
    db.flush()
    return entity
