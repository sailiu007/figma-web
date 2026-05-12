from sqlalchemy import select
from sqlalchemy.orm import Session

from app.persistence.async_jobs.model import AsyncJob


def list_jobs(db: Session) -> list[AsyncJob]:
    return list(db.scalars(select(AsyncJob).order_by(AsyncJob.created_at.desc())))


def get_job(db: Session, job_id: str) -> AsyncJob | None:
    return db.scalar(select(AsyncJob).where(AsyncJob.id == job_id))


def add_job(db: Session, job: AsyncJob) -> AsyncJob:
    db.add(job)
    db.commit()
    db.refresh(job)
    return job
