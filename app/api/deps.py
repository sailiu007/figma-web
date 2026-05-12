from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.auth.service import AuthService
from app.db.session import get_db
from app.repositories import ContextRepository, CredentialRepository, ExecutionRepository
from app.schemas.common import RequestContext
from app.services.context_service import ContextService
from app.services.credential_service import CredentialService
from app.services.execution_service import ExecutionService
from app.services.tool_service import ToolService


DbSession = Session


def get_context_repository(db: Session = Depends(get_db)) -> ContextRepository:
    return ContextRepository(db)


def get_credential_repository(db: Session = Depends(get_db)) -> CredentialRepository:
    return CredentialRepository(db)


def get_execution_repository(db: Session = Depends(get_db)) -> ExecutionRepository:
    return ExecutionRepository(db)


def get_context_service(repository: ContextRepository = Depends(get_context_repository)) -> ContextService:
    return ContextService(repository)


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


def get_credential_service(repository: CredentialRepository = Depends(get_credential_repository)) -> CredentialService:
    return CredentialService(repository)


def get_execution_service(repository: ExecutionRepository = Depends(get_execution_repository)) -> ExecutionService:
    return ExecutionService(repository)


def get_tool_service(repository: ExecutionRepository = Depends(get_execution_repository)) -> ToolService:
    return ToolService(repository)


def get_request_context(
    request: Request,
    context_service: ContextService = Depends(get_context_service),
    auth_service: AuthService = Depends(get_auth_service),
    atlas_user_id: str | None = Header(default=None, alias="X-Atlas-User-Id"),
) -> RequestContext:
    authorization = request.headers.get("Authorization")
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        user = auth_service.resolve_user(token)
        request_id = request.headers.get("X-Request-Id") or ""
        trace_id = request.headers.get("X-Trace-Id") or request_id
        return RequestContext(user_id=user.id, tenant_id=user.tenant_id, request_id=request_id, trace_id=trace_id)
    return context_service.build_request_context(request, atlas_user_id)
