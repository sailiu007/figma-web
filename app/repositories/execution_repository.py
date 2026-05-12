from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AsyncJob, AuditLog


class ExecutionRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list_invocations(self) -> list[AuditLog]:
        stmt = select(AuditLog).where(AuditLog.event_type ==
                                      "tool_execution").order_by(AuditLog.created_at.desc())
        return list(self._db.scalars(stmt))

    def get_invocation(self, invocation_id: str) -> AuditLog | None:
        stmt = select(AuditLog).where(AuditLog.id == invocation_id,
                                      AuditLog.event_type == "tool_execution")
        return self._db.scalar(stmt)

    def create_invocation(self, invocation: AuditLog) -> AuditLog:
        self._db.add(invocation)
        self._db.flush()
        return invocation

    def save_invocation(self, invocation: AuditLog) -> AuditLog:
        self._db.add(invocation)
        self._db.commit()
        self._db.refresh(invocation)
        return invocation

    def list_jobs(self) -> list[AsyncJob]:
        stmt = select(AsyncJob).order_by(AsyncJob.created_at.desc())
        return list(self._db.scalars(stmt))

    def get_job(self, job_id: str) -> AsyncJob | None:
        stmt = select(AsyncJob).where(AsyncJob.id == job_id)
        return self._db.scalar(stmt)

    def create_job(self, job: AsyncJob) -> AsyncJob:
        self._db.add(job)
        self._db.commit()
        self._db.refresh(job)
        return job

    def save_job(self, job: AsyncJob) -> AsyncJob:
        self._db.add(job)
        self._db.commit()
        self._db.refresh(job)
        return job

    def commit(self) -> None:
        self._db.commit()
