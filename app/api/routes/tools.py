from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_request_context, get_tool_service
from app.schemas.common import RequestContext
from app.schemas.response import ResponseSchemaModel, response_base
from app.schemas.tool import ToolExecuteRequest, ToolExecuteResponse, ToolRead
from app.services.tool_service import ToolService

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("", response_model=ResponseSchemaModel[list[ToolRead]])
def list_tools(service: ToolService = Depends(get_tool_service)) -> ResponseSchemaModel[list[ToolRead]]:
    return response_base.success(data=[service.to_tool_read(spec) for spec in service.list_tools()])


@router.get("/{tool_name}", response_model=ResponseSchemaModel[ToolRead])
def get_tool(tool_name: str, service: ToolService = Depends(get_tool_service)) -> ResponseSchemaModel[ToolRead]:
    try:
        return response_base.success(data=service.get_tool_read(tool_name))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{tool_name}/schema", response_model=ResponseSchemaModel[dict])
def get_tool_schema(tool_name: str, service: ToolService = Depends(get_tool_service)) -> ResponseSchemaModel[dict]:
    try:
        return response_base.success(data=service.get_tool_schema(tool_name))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{tool_name}:execute", response_model=ResponseSchemaModel[ToolExecuteResponse])
def execute_tool(
    tool_name: str,
    payload: ToolExecuteRequest,
    context: RequestContext = Depends(get_request_context),
    service: ToolService = Depends(get_tool_service),
) -> ResponseSchemaModel[ToolExecuteResponse]:
    try:
        invocation, job = service.execute(
            context=context,
            tool_name=tool_name,
            input_payload=payload.input,
            credential_id=payload.credential_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return response_base.success(
        data=ToolExecuteResponse(
            invocation_id=invocation.id,
            job_id=job.id if job else None,
            status=invocation.status,
            output=invocation.response_json,
            request_id=context.request_id,
        )
    )
