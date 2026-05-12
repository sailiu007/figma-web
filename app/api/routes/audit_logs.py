from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.api.deps import get_request_context
from app.db.session import get_db
from app.persistence.audit_logs.sql import get_audit_log, list_audit_logs
from app.schemas.common import RequestContext
from app.schemas.response import ResponseSchemaModel, response_base

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actor_user_id: str | None = None
    actor_type: str
    event_type: str
    source: str
    action: str
    resource_type: str
    resource_id: str | None = None
    tool_name: str | None = None
    status: str | None = None
    request_id: str | None = None
    trace_id: str | None = None
    request_json: dict[str, Any] | None = None
    response_json: dict[str, Any] | None = None
    error_message: str | None = None
    latency_ms: int | None = None
    metadata_json: dict[str, Any]
    created_at: datetime


@router.get("", response_model=ResponseSchemaModel[list[AuditLogRead]])
def get_audit_logs(
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[list[AuditLogRead]]:
    return response_base.success(data=list_audit_logs(db))


@router.get("/{audit_log_id}", response_model=ResponseSchemaModel[AuditLogRead])
def get_audit_log_detail(
    audit_log_id: str,
    context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
) -> ResponseSchemaModel[AuditLogRead]:
    audit_log = get_audit_log(db, audit_log_id)
    if audit_log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="audit log not found")
    return response_base.success(data=audit_log)
