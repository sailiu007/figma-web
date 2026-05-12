from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import get_request_context
from app.db.session import get_db
from app.models import AuditLog, Permission, Role, RolePermission, User, UserRole
from app.persistence.auth import sql as auth_sql
from app.schemas.common import RequestContext
from app.schemas.response import ResponseSchemaModel, response_base

router = APIRouter(tags=["rbac"])


class RolePayload(BaseModel):
    code: str
    name: str
    description: str | None = None


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    description: str | None = None
    is_system: bool
    status: str
    created_at: datetime
    updated_at: datetime


class PermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    resource_type: str
    resource_key: str
    action: str
    category: str
    description: str | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    display_name: str
    email: str | None = None
    global_status: str


class RoleAssignmentPayload(BaseModel):
    role_ids: list[str] = Field(default_factory=list)


class PermissionAssignmentPayload(BaseModel):
    permission_ids: list[str] = Field(default_factory=list)


def _write_audit_log(db: Session, context: RequestContext, action: str, resource_type: str, resource_id: str, after_json=None):
    db.add(
        AuditLog(
            tenant_id=context.tenant_id,
            user_id=context.user_id,
            actor_user_id=context.user_id,
            actor_type="user",
            event_type="admin_action",
            source="api",
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            status="succeeded",
            request_id=context.request_id,
            trace_id=context.trace_id,
            after_json=after_json,
            metadata_json={},
        )
    )


@router.get("/users", response_model=ResponseSchemaModel[list[UserRead]])
def list_users(
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[list[UserRead]]:
    return response_base.success(data=auth_sql.list_users(db))


@router.get("/roles", response_model=ResponseSchemaModel[list[RoleRead]])
def list_roles(
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[list[RoleRead]]:
    return response_base.success(data=auth_sql.list_roles(db))


@router.post("/roles", response_model=ResponseSchemaModel[RoleRead], status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RolePayload,
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[RoleRead]:
    if auth_sql.get_role_by_code(db, payload.code) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="role code already exists")
    role = Role(
        tenant_id=context.tenant_id,
        code=payload.code,
        name=payload.name,
        description=payload.description,
        status="active",
        created_by=context.user_id,
    )
    db.add(role)
    db.flush()
    _write_audit_log(db, context, "role.create", "role",
                     role.id, after_json={"code": role.code})
    db.commit()
    db.refresh(role)
    return response_base.success(code=status.HTTP_201_CREATED, msg="Created", data=role)


@router.patch("/roles/{role_id}", response_model=ResponseSchemaModel[RoleRead])
def update_role(
    role_id: str,
    payload: RolePayload,
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[RoleRead]:
    role = auth_sql.get_role_by_id(db, role_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="role not found")
    role.code = payload.code
    role.name = payload.name
    role.description = payload.description
    db.add(role)
    _write_audit_log(db, context, "role.update", "role",
                     role.id, after_json={"code": role.code})
    db.commit()
    db.refresh(role)
    return response_base.success(data=role)


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: str,
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    role = auth_sql.get_role_by_id(db, role_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="role not found")
    db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
    db.execute(delete(UserRole).where(UserRole.role_id == role_id))
    _write_audit_log(db, context, "role.delete", "role", role.id)
    db.delete(role)
    db.commit()
    return {"ok": True}


@router.get("/users/{user_id}/roles", response_model=ResponseSchemaModel[list[RoleRead]])
def list_user_roles(
    user_id: str,
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[list[RoleRead]]:
    roles: list[Role] = []
    for link in auth_sql.list_user_role_links(db, user_id):
        role = auth_sql.get_role_by_id(db, link.role_id)
        if role is not None:
            roles.append(role)
    return response_base.success(data=roles)


@router.post("/users/{user_id}/roles", response_model=ResponseSchemaModel[list[RoleRead]])
def assign_user_roles(
    user_id: str,
    payload: RoleAssignmentPayload,
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[list[RoleRead]]:
    user = auth_sql.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    existing = {
        link.role_id: link for link in auth_sql.list_user_role_links(db, user_id)}
    desired = set(payload.role_ids)
    for role_id, link in existing.items():
        if role_id not in desired:
            db.delete(link)
    for role_id in desired:
        if role_id not in existing:
            db.add(UserRole(user_id=user_id, role_id=role_id,
                   assigned_by=context.user_id))
    _write_audit_log(db, context, "user_roles.update", "user",
                     user_id, after_json={"role_ids": payload.role_ids})
    db.commit()
    roles = [auth_sql.get_role_by_id(db, role_id) for role_id in desired]
    return response_base.success(data=[role for role in roles if role is not None])


@router.get("/policies", response_model=ResponseSchemaModel[list[PermissionRead]])
def list_policies(
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[list[PermissionRead]]:
    return response_base.success(data=auth_sql.list_permissions(db))


@router.get("/roles/{role_id}/policies", response_model=ResponseSchemaModel[list[PermissionRead]])
def list_role_policies(
    role_id: str,
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[list[PermissionRead]]:
    permissions: list[Permission] = []
    for link in auth_sql.list_role_permission_links(db, role_id):
        permission = auth_sql.get_permission_by_id(db, link.permission_id)
        if permission is not None:
            permissions.append(permission)
    return response_base.success(data=permissions)


@router.post("/roles/{role_id}/policies", response_model=ResponseSchemaModel[list[PermissionRead]])
def assign_role_policies(
    role_id: str,
    payload: PermissionAssignmentPayload,
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[list[PermissionRead]]:
    role = auth_sql.get_role_by_id(db, role_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="role not found")
    existing = {
        link.permission_id: link for link in auth_sql.list_role_permission_links(db, role_id)}
    desired = set(payload.permission_ids)
    for permission_id, link in existing.items():
        if permission_id not in desired:
            db.delete(link)
    for permission_id in desired:
        if permission_id not in existing:
            db.add(RolePermission(role_id=role_id, permission_id=permission_id))
    _write_audit_log(db, context, "role_policies.update", "role",
                     role_id, after_json={"permission_ids": payload.permission_ids})
    db.commit()
    permissions = [auth_sql.get_permission_by_id(
        db, permission_id) for permission_id in desired]
    return response_base.success(data=[permission for permission in permissions if permission is not None])
