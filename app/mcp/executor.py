from app.schemas.common import RequestContext
from app.services.tool_service import ToolService


class McpExecutor:
    def __init__(self, tool_service: ToolService) -> None:
        self._tool_service = tool_service

    def list_tools(self) -> list[dict]:
        return [self._tool_service.to_tool_read(spec).model_dump() for spec in self._tool_service.list_tools()]

    def call_tool(self, context: RequestContext, tool_name: str, input_payload: dict, credential_id: str | None = None) -> dict:
        invocation, job = self._tool_service.execute(
            context, tool_name, input_payload, credential_id)
        return {
            "audit_log_id": invocation.id,
            "job_id": job.id if job else None,
            "status": invocation.status,
            "output": invocation.response_json,
        }
