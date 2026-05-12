from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_credential_service, get_request_context
from app.schemas.common import RequestContext
from app.schemas.credential import CredentialCreate, CredentialRead
from app.schemas.response import ResponseSchemaModel, response_base
from app.services.credential_service import CredentialService

router = APIRouter(prefix="/credentials", tags=["credentials"])


@router.get("", response_model=ResponseSchemaModel[list[CredentialRead]])
def list_credentials(
    context: RequestContext = Depends(get_request_context),
    service: CredentialService = Depends(get_credential_service),
) -> ResponseSchemaModel[list[CredentialRead]]:
    return response_base.success(data=service.list_credentials(context.user_id))


@router.post("", response_model=ResponseSchemaModel[CredentialRead], status_code=status.HTTP_201_CREATED)
def create_credential(
    payload: CredentialCreate,
    context: RequestContext = Depends(get_request_context),
    service: CredentialService = Depends(get_credential_service),
) -> ResponseSchemaModel[CredentialRead]:
    credential = service.create_credential(
        context.tenant_id, context.user_id, payload)
    return response_base.success(code=status.HTTP_201_CREATED, msg="Created", data=credential)


@router.get("/{credential_id}", response_model=ResponseSchemaModel[CredentialRead])
def get_credential(
    credential_id: str,
    context: RequestContext = Depends(get_request_context),
    service: CredentialService = Depends(get_credential_service),
) -> ResponseSchemaModel[CredentialRead]:
    credential = service.get_credential(context.user_id, credential_id)
    if credential is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="credential not found")
    return response_base.success(data=credential)


@router.delete("/{credential_id}")
def delete_credential(
    credential_id: str,
    context: RequestContext = Depends(get_request_context),
    service: CredentialService = Depends(get_credential_service),
) -> dict[str, bool]:
    if not service.delete_credential(context.user_id, credential_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="credential not found")
    return {"ok": True}


@router.post("/{credential_id}/test", response_model=ResponseSchemaModel[dict])
def test_credential(
    credential_id: str,
    context: RequestContext = Depends(get_request_context),
    service: CredentialService = Depends(get_credential_service),
) -> ResponseSchemaModel[dict]:
    try:
        result = service.test_credential(context.user_id, credential_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return response_base.success(data=result)
