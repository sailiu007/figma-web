from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.persistence.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AsyncJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "async_jobs"

    tenant_id: Mapped[str | None] = mapped_column(
        String(32), nullable=True, index=True)
    invocation_id: Mapped[str | None] = mapped_column(
        String(32), nullable=True, unique=True)
    audit_log_id: Mapped[str | None] = mapped_column(
        ForeignKey("audit_logs.id"), nullable=True, index=True)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_type: Mapped[str] = mapped_column(
        String(32), default="async", nullable=False)
    tool_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True)
    queue_name: Mapped[str] = mapped_column(
        String(64), default="default", nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default="pending", nullable=False, index=True)
    retry_count: Mapped[int] = mapped_column(default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(default=3, nullable=False)
    worker_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    scheduled_for: Mapped[str | None] = mapped_column(
        String(64), nullable=True)
    payload_json: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False)
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    finished_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
