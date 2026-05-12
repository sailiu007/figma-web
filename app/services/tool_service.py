from dataclasses import asdict
from datetime import UTC, datetime
from time import perf_counter

from app.models import AsyncJob, AuditLog
from app.repositories import ExecutionRepository
from app.schemas.common import RequestContext
from app.schemas.tool import ToolRead
from app.tools.builtin import load_builtin_tools
from app.tools.registry import registry
from app.tools.spec import ToolSpec
from app.workers.tasks import execute_tool_task


class ToolService:
    def __init__(self, repository: ExecutionRepository) -> None:
        self._repository = repository
        load_builtin_tools()

    def list_tools(self) -> list[ToolSpec]:
        return registry.list()

    def get_tool(self, tool_name: str) -> ToolSpec | None:
        return registry.get(tool_name)

    def get_tool_read(self, tool_name: str) -> ToolRead:
        spec = self.get_required_tool(tool_name)
        return self.to_tool_read(spec)

    def get_tool_schema(self, tool_name: str) -> dict:
        spec = self.get_required_tool(tool_name)
        return {"input_schema": spec.input_schema, "output_schema": spec.output_schema}

    def execute(
        self,
        context: RequestContext,
        tool_name: str,
        input_payload: dict,
        credential_id: str | None,
    ) -> tuple[AuditLog, AsyncJob | None]:
        spec = self.get_required_tool(tool_name)

        invocation = AuditLog(
            tenant_id=context.tenant_id,
            user_id=context.user_id,
            actor_user_id=context.user_id,
            actor_type="user",
            event_type="tool_execution",
            source="api",
            action="tool.execute",
            resource_type="tool",
            resource_id=tool_name,
            tool_name=tool_name,
            status="accepted",
            request_id=context.request_id,
            trace_id=context.trace_id,
            request_json=input_payload,
            metadata_json={"credential_id": credential_id,
                           "execution_mode": spec.execution_mode},
        )
        self._repository.create_invocation(invocation)

        if spec.execution_mode == "sync":
            started = perf_counter()
            invocation.status = "running"
            try:
                output = spec.handler(input_payload)
                invocation.response_json = output
                invocation.status = "succeeded"
                invocation.latency_ms = int((perf_counter() - started) * 1000)
                invocation.metadata_json = {
                    **invocation.metadata_json,
                    "finished_at": datetime.now(UTC).isoformat(),
                }
                self._repository.save_invocation(invocation)
                return invocation, None
            except Exception as exc:
                invocation.status = "failed"
                invocation.error_message = str(exc)
                invocation.metadata_json = {
                    **invocation.metadata_json,
                    "finished_at": datetime.now(UTC).isoformat(),
                }
                self._repository.save_invocation(invocation)
                raise

        job = AsyncJob(
            tenant_id=context.tenant_id,
            audit_log_id=invocation.id,
            task_name="atlas.execute_tool",
            job_type="async",
            tool_name=tool_name,
            payload_json=input_payload,
            status="pending",
        )
        self._repository.create_job(job)
        execute_tool_task.delay(job.id)
        return invocation, job

    @staticmethod
    def to_tool_read(spec: ToolSpec) -> ToolRead:
        data = asdict(spec)
        data.pop("handler", None)
        return ToolRead(**data)

    def get_required_tool(self, tool_name: str) -> ToolSpec:
        spec = self.get_tool(tool_name)
        if spec is None or spec.handler is None:
            raise ValueError(f"tool not found: {tool_name}")
        return spec
