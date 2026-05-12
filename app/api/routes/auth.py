from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.api.deps import get_auth_service, get_request_context
from app.auth.service import AuthService
from app.schemas.common import RequestContext
from app.schemas.response import ResponseSchemaModel, response_base

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


class MeResponse(BaseModel):
    user_id: str
    username: str
    display_name: str


@router.post("/login", response_model=ResponseSchemaModel[TokenResponse])
def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)) -> ResponseSchemaModel[TokenResponse]:
    user = service.authenticate(payload.username, payload.password)
    return response_base.success(data=TokenResponse(**service.issue_tokens(user)))


@router.post("/refresh", response_model=ResponseSchemaModel[TokenResponse])
def refresh(payload: RefreshRequest, service: AuthService = Depends(get_auth_service)) -> ResponseSchemaModel[TokenResponse]:
    return response_base.success(data=TokenResponse(**service.refresh_tokens(payload.refresh_token)))


@router.post("/logout")
def logout() -> dict[str, bool]:
    return {"ok": True}


@router.get("/me", response_model=ResponseSchemaModel[MeResponse])
def me(
    context: RequestContext = Depends(get_request_context),
    service: AuthService = Depends(get_auth_service),
) -> ResponseSchemaModel[MeResponse]:
    user = service.get_me(context.user_id)
    return response_base.success(data=MeResponse(user_id=user.id, username=user.username, display_name=user.display_name))
