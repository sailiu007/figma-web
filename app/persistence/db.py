from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.auth.security import hash_password
from app.core.config import get_settings
from app.persistence import Base, Permission, Role, RolePermission, User, UserRole
from app.persistence.auth import sql as auth_sql

settings = get_settings()

engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, future=True)

DEFAULT_PERMISSIONS = [
    ("menu:system.settings:read", "menu",
     "system.settings", "read", "system", "系统设置菜单读取"),
    ("api:/api/v1/credentials:read", "api",
     "/api/v1/credentials", "read", "credential", "读取凭证"),
    ("api:/api/v1/credentials:write", "api",
     "/api/v1/credentials", "write", "credential", "写入凭证"),
    ("api:/api/v1/tools:read", "api", "/api/v1/tools", "read", "tool", "读取工具目录"),
    ("tool:system.echo:execute", "tool",
     "system.echo", "execute", "tool", "执行 echo 工具"),
    ("tool:system.sleep_echo:execute", "tool",
     "system.sleep_echo", "execute", "tool", "执行 sleep_echo 工具"),
]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _timestamp_type() -> str:
    if engine.dialect.name == "postgresql":
        return "TIMESTAMPTZ"
    return "TIMESTAMP"


def _ensure_column(connection, table_name: str, column_name: str, ddl: str) -> None:
    columns = {column["name"]
               for column in inspect(connection).get_columns(table_name)}
    if column_name in columns:
        return
    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def _ensure_schema_compatibility() -> None:
    timestamp_type = _timestamp_type()
    with engine.begin() as connection:
        inspector = inspect(connection)

        if inspector.has_table("users"):
            _ensure_column(connection, "users", "display_name",
                           "display_name VARCHAR(128)")
            _ensure_column(connection, "users", "phone", "phone VARCHAR(32)")
            _ensure_column(connection, "users",
                           "avatar_url", "avatar_url TEXT")
            _ensure_column(connection, "users", "preferred_language",
                           "preferred_language VARCHAR(8)")
            _ensure_column(connection, "users", "title", "title VARCHAR(128)")
            _ensure_column(connection, "users", "team", "team VARCHAR(128)")
            _ensure_column(connection, "users", "global_status",
                           "global_status VARCHAR(32)")
            _ensure_column(connection, "users", "last_login_at",
                           f"last_login_at {timestamp_type}")
            connection.execute(
                text(
                    "UPDATE users SET display_name = COALESCE(display_name, username), "
                    "global_status = COALESCE(global_status, status, 'active')"
                )
            )

        if inspector.has_table("roles"):
            _ensure_column(connection, "roles", "code", "code VARCHAR(64)")
            _ensure_column(connection, "roles", "is_system",
                           "is_system BOOLEAN DEFAULT FALSE")
            _ensure_column(connection, "roles", "status", "status VARCHAR(32)")
            _ensure_column(connection, "roles", "created_by",
                           "created_by VARCHAR(32)")
            connection.execute(text(
                "UPDATE roles SET code = COALESCE(code, name), status = COALESCE(status, 'active')"))

        if inspector.has_table("permissions"):
            _ensure_column(connection, "permissions",
                           "code", "code VARCHAR(128)")
            _ensure_column(connection, "permissions",
                           "resource_key", "resource_key VARCHAR(255)")
            _ensure_column(connection, "permissions",
                           "category", "category VARCHAR(64)")
            _ensure_column(connection, "permissions", "is_system",
                           "is_system BOOLEAN DEFAULT FALSE")
            connection.execute(
                text(
                    "UPDATE permissions SET code = COALESCE(code, name), "
                    "resource_key = COALESCE(resource_key, resource_pattern), "
                    "category = COALESCE(category, resource_type)"
                )
            )

        if inspector.has_table("user_roles"):
            _ensure_column(connection, "user_roles",
                           "assigned_by", "assigned_by VARCHAR(32)")

        if inspector.has_table("credentials"):
            _ensure_column(connection, "credentials",
                           "scopes_json", "scopes_json JSON")
            _ensure_column(connection, "credentials",
                           "expires_at", "expires_at VARCHAR(64)")

        if inspector.has_table("async_jobs"):
            _ensure_column(connection, "async_jobs",
                           "audit_log_id", "audit_log_id VARCHAR(32)")
            _ensure_column(connection, "async_jobs",
                           "task_name", "task_name VARCHAR(255)")
            _ensure_column(connection, "async_jobs",
                           "job_type", "job_type VARCHAR(32)")
            _ensure_column(connection, "async_jobs",
                           "scheduled_for", "scheduled_for VARCHAR(64)")
            if engine.dialect.name == "postgresql":
                connection.execute(
                    text("ALTER TABLE async_jobs ALTER COLUMN invocation_id DROP NOT NULL"))
            connection.execute(
                text(
                    "UPDATE async_jobs SET task_name = COALESCE(task_name, 'atlas.execute_tool'), "
                    "job_type = COALESCE(job_type, 'async')"
                )
            )

        if inspector.has_table("audit_logs"):
            _ensure_column(connection, "audit_logs",
                           "actor_user_id", "actor_user_id VARCHAR(32)")
            _ensure_column(connection, "audit_logs",
                           "actor_type", "actor_type VARCHAR(32)")
            _ensure_column(connection, "audit_logs",
                           "event_type", "event_type VARCHAR(32)")
            _ensure_column(connection, "audit_logs",
                           "source", "source VARCHAR(32)")
            _ensure_column(connection, "audit_logs",
                           "tool_name", "tool_name VARCHAR(255)")
            _ensure_column(connection, "audit_logs",
                           "status", "status VARCHAR(32)")
            _ensure_column(connection, "audit_logs",
                           "request_json", "request_json JSON")
            _ensure_column(connection, "audit_logs",
                           "response_json", "response_json JSON")
            _ensure_column(connection, "audit_logs",
                           "before_json", "before_json JSON")
            _ensure_column(connection, "audit_logs",
                           "after_json", "after_json JSON")
            _ensure_column(connection, "audit_logs",
                           "error_message", "error_message TEXT")
            _ensure_column(connection, "audit_logs",
                           "latency_ms", "latency_ms INTEGER")
            connection.execute(
                text(
                    "UPDATE audit_logs SET actor_user_id = COALESCE(actor_user_id, user_id), "
                    "actor_type = COALESCE(actor_type, 'user'), "
                    "event_type = COALESCE(event_type, 'admin_action'), "
                    "source = COALESCE(source, 'api')"
                )
            )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_schema_compatibility()

    with Session(engine) as db:
        user = auth_sql.get_user_by_username(
            db, settings.default_admin_username)
        if user is None:
            user = auth_sql.add_and_flush(
                db,
                User(
                    tenant_id=None,
                    username=settings.default_admin_username,
                    email="admin@atlas.local",
                    display_name="Atlas Admin",
                    password_hash=hash_password(
                        settings.default_admin_password),
                    preferred_language="zh-CN",
                    status="active",
                    global_status="active",
                ),
            )
        elif not user.password_hash:
            user.password_hash = hash_password(settings.default_admin_password)
            db.add(user)
            db.flush()

        role = auth_sql.get_role_by_code(db, "platform_admin")
        if role is None:
            role = auth_sql.add_and_flush(
                db,
                Role(
                    tenant_id=user.tenant_id,
                    code="platform_admin",
                    name="Platform Admin",
                    description="Bootstrap administrator role",
                    is_system=True,
                    status="active",
                    created_by=user.id,
                ),
            )

        for code, resource_type, resource_key, action, category, description in DEFAULT_PERMISSIONS:
            permission = auth_sql.get_permission_by_code(db, code)
            if permission is None:
                permission = auth_sql.add_and_flush(
                    db,
                    Permission(
                        name=code,
                        code=code,
                        resource_type=resource_type,
                        resource_pattern=resource_key,
                        resource_key=resource_key,
                        action=action,
                        category=category,
                        description=description,
                        is_system=True,
                    ),
                )
            if auth_sql.get_role_permission_link(db, role.id, permission.id) is None:
                db.add(RolePermission(role_id=role.id,
                       permission_id=permission.id))

        if auth_sql.get_user_role_link(db, user.id, role.id) is None:
            db.add(UserRole(user_id=user.id, role_id=role.id, assigned_by=user.id))

        db.commit()
