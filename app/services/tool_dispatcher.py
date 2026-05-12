from datetime import UTC, datetime
from time import perf_counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AsyncJob, ToolInvocation
from app.schemas.common import RequestContext
from app.tools.builtin import load_builtin_tools
from app.tools.registry import registry
from app.workers.tasks import execute_tool_task


class ToolDispatcher:
    def __init__(self) -> None:
        load_builtin_tools()

    def list_tools(self):
        return registry.list()

    def get_tool(self, tool_name: str):
        return registry.get(tool_name)

    def execute(
        self,
        db: Session,
        context: RequestContext,
        tool_name: str,
        input_payload: dict,
        credential_id: str | None,
    ) -> tuple[ToolInvocation, AsyncJob | None]:
        spec = registry.get(tool_name)
        if spec is None or spec.handler is None:
            raise ValueError(f"tool not found: {tool_name}")

        invocation = ToolInvocation(
            tenant_id=context.tenant_id,
            user_id=context.user_id,
            tool_name=tool_name,
            credential_id=credential_id,
            execution_mode=spec.execution_mode,
            request_id=context.request_id,
            trace_id=context.trace_id,
            input_json=input_payload,
            status="accepted",
        )
        db.add(invocation)
        db.flush()

        if spec.execution_mode == "sync":
            started = perf_counter()
            started_at = datetime.now(UTC).isoformat()
            invocation.started_at = started_at
            invocation.status = "running"
            db.flush()
            try:
                output = spec.handler(input_payload)
                invocation.output_json = output
                invocation.status = "succeeded"
                invocation.latency_ms = int((perf_counter() - started) * 1000)
                invocation.finished_at = datetime.now(UTC).isoformat()
                db.commit()
                db.refresh(invocation)
                return invocation, None
            except Exception as exc:  # noqa: BLE001
                invocation.status = "failed"
                invocation.error_message = str(exc)
                invocation.finished_at = datetime.now(UTC).isoformat()
                db.commit()
                raise

        job = AsyncJob(
            tenant_id=context.tenant_id,
            invocation_id=invocation.id,
            tool_name=tool_name,
            payload_json=input_payload,
            status="pending",
        )
        db.add(job)
        db.commit()
        db.refresh(invocation)
        db.refresh(job)
        execute_tool_task.delay(job.id)
        return invocation, job


tool_dispatcher = ToolDispatcher()
