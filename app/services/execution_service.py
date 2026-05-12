from fastapi import HTTPException, status

from app.models import AsyncJob, AuditLog
from app.repositories import ExecutionRepository


class ExecutionService:
    def __init__(self, repository: ExecutionRepository) -> None:
        self._repository = repository

    def list_invocations(self) -> list[AuditLog]:
        return self._repository.list_invocations()

    def get_invocation(self, invocation_id: str) -> AuditLog:
        invocation = self._repository.get_invocation(invocation_id)
        if invocation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="invocation not found")
        return invocation

    def list_jobs(self) -> list[AsyncJob]:
        return self._repository.list_jobs()

    def get_job(self, job_id: str) -> AsyncJob:
        job = self._repository.get_job(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="job not found")
        return job

    def cancel_job(self, job_id: str) -> AsyncJob:
        job = self.get_job(job_id)
        if job.status in {"succeeded", "failed", "canceled"}:
            return job
        job.status = "canceled"
        return self._repository.save_job(job)
