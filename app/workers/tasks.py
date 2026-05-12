from datetime import UTC, datetime
from time import perf_counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import AsyncJob, AuditLog
from app.tools.builtin import load_builtin_tools
from app.tools.registry import registry
from app.workers.celery_app import celery_app


@celery_app.task(name="atlas.execute_tool")
def execute_tool_task(job_id: str) -> dict:
    load_builtin_tools()

    with Session(engine) as db:
        job = db.scalar(select(AsyncJob).where(AsyncJob.id == job_id))
        if job is None:
            return {"job_id": job_id, "status": "missing"}

        invocation = None
        if job.audit_log_id is not None:
            invocation = db.scalar(select(AuditLog).where(
                AuditLog.id == job.audit_log_id))
        if invocation is None:
            job.status = "failed"
            job.error_message = "audit log not found"
            db.commit()
            return {"job_id": job_id, "status": "failed"}

        spec = registry.get(job.tool_name)
        if spec is None or spec.handler is None:
            job.status = "failed"
            job.error_message = f"tool not found: {job.tool_name}"
            invocation.status = "failed"
            invocation.error_message = job.error_message
            db.commit()
            return {"job_id": job_id, "status": "failed"}

        job.status = "running"
        job.started_at = datetime.now(UTC).isoformat()
        invocation.status = "running"
        invocation.metadata_json = {
            **invocation.metadata_json, "started_at": job.started_at}
        db.commit()

        started = perf_counter()
        try:
            result = spec.handler(job.payload_json)
            duration_ms = int((perf_counter() - started) * 1000)
            finished_at = datetime.now(UTC).isoformat()

            job.status = "succeeded"
            job.finished_at = finished_at
            job.result_json = result

            invocation.status = "succeeded"
            invocation.response_json = result
            invocation.metadata_json = {
                **invocation.metadata_json, "finished_at": finished_at}
            invocation.latency_ms = duration_ms
            db.commit()
            return {"job_id": job_id, "status": "succeeded", "result": result}
        except Exception as exc:  # noqa: BLE001
            finished_at = datetime.now(UTC).isoformat()
            job.status = "failed"
            job.finished_at = finished_at
            job.error_message = str(exc)
            invocation.status = "failed"
            invocation.error_message = str(exc)
            invocation.metadata_json = {
                **invocation.metadata_json, "finished_at": finished_at}
            db.commit()
            raise
