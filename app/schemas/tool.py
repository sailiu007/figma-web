from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ToolRead(BaseModel):
    name: str
    description: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    execution_mode: Literal["sync", "async"]
    provider: str
    credential_provider: str | None = None
    required_permissions: list[str] = Field(default_factory=list)
    timeout_seconds: int
    tags: list[str] = Field(default_factory=list)
    version: str


class ToolExecuteRequest(BaseModel):
    credential_id: str | None = None
    input: dict[str, Any] = Field(default_factory=dict)


class ToolExecuteResponse(BaseModel):
    invocation_id: str
    job_id: str | None = None
    status: str
    output: dict[str, Any] | None = None
    request_id: str


class InvocationRead(ORMModel):
    id: str
    tool_name: str | None = None
    status: str | None = None
    request_json: dict[str, Any] | None = None
    response_json: dict[str, Any] | None = None
    error_message: str | None = None
    latency_ms: int | None = None
    created_at: datetime
