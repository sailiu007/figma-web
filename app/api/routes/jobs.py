from fastapi import APIRouter, Depends

from app.api.deps import get_execution_service, get_request_context
from app.schemas.common import RequestContext
from app.schemas.job import AsyncJobRead
from app.schemas.response import ResponseSchemaModel, response_base
from app.schemas.tool import InvocationRead
from app.services.execution_service import ExecutionService

router = APIRouter(tags=["execution"])


@router.get("/invocations", response_model=ResponseSchemaModel[list[InvocationRead]])
def list_invocations(
    context: RequestContext = Depends(get_request_context),
    service: ExecutionService = Depends(get_execution_service),
) -> ResponseSchemaModel[list[InvocationRead]]:
    return response_base.success(data=service.list_invocations())


@router.get("/invocations/{invocation_id}", response_model=ResponseSchemaModel[InvocationRead])
def get_invocation(
    invocation_id: str,
    context: RequestContext = Depends(get_request_context),
    service: ExecutionService = Depends(get_execution_service),
) -> ResponseSchemaModel[InvocationRead]:
    return response_base.success(data=service.get_invocation(invocation_id))


@router.get("/jobs", response_model=ResponseSchemaModel[list[AsyncJobRead]])
def list_jobs(
    context: RequestContext = Depends(get_request_context),
    service: ExecutionService = Depends(get_execution_service),
) -> ResponseSchemaModel[list[AsyncJobRead]]:
    return response_base.success(data=service.list_jobs())


@router.get("/jobs/{job_id}", response_model=ResponseSchemaModel[AsyncJobRead])
def get_job(
    job_id: str,
    context: RequestContext = Depends(get_request_context),
    service: ExecutionService = Depends(get_execution_service),
) -> ResponseSchemaModel[AsyncJobRead]:
    return response_base.success(data=service.get_job(job_id))


@router.post("/jobs/{job_id}:cancel", response_model=ResponseSchemaModel[AsyncJobRead])
def cancel_job(
    job_id: str,
    context: RequestContext = Depends(get_request_context),
    service: ExecutionService = Depends(get_execution_service),
) -> ResponseSchemaModel[AsyncJobRead]:
    return response_base.success(data=service.cancel_job(job_id))


@router.get("/jobs/{job_id}/result", response_model=ResponseSchemaModel[dict | None])
def get_job_result(
    job_id: str,
    context: RequestContext = Depends(get_request_context),
    service: ExecutionService = Depends(get_execution_service),
) -> ResponseSchemaModel[dict | None]:
    return response_base.success(data=service.get_job(job_id).result_json)
