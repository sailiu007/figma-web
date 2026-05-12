from uuid import uuid4

from fastapi import HTTPException, Request, status

from app.core.config import get_settings
from app.repositories import ContextRepository
from app.schemas.common import RequestContext


class ContextService:
    def __init__(self, repository: ContextRepository) -> None:
        self._repository = repository

    def build_request_context(
        self,
        request: Request,
        atlas_user_id: str | None,
        _: str | None = None,
    ) -> RequestContext:
        settings = get_settings()

        if atlas_user_id:
            user = self._repository.get_user_by_id(atlas_user_id)
        else:
            user = self._repository.get_user_by_username(
                settings.default_admin_username)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found")

        request_id = request.headers.get("X-Request-Id") or uuid4().hex
        trace_id = request.headers.get("X-Trace-Id") or request_id
        return RequestContext(user_id=user.id, tenant_id=user.tenant_id, request_id=request_id, trace_id=trace_id)
