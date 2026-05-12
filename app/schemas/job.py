from datetime import datetime
from typing import Any

from app.schemas.common import ORMModel


class AsyncJobRead(ORMModel):
    id: str
    audit_log_id: str | None
    task_name: str
    tool_name: str | None = None
    status: str
    retry_count: int
    result_json: dict[str, Any] | None = None
    error_message: str | None = None
    created_at: datetime
