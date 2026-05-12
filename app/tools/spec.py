from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Literal

ExecutionMode = Literal["sync", "async"]
ToolHandler = Callable[[dict[str, Any]], dict[str, Any]]


@dataclass(slots=True)
class ToolSpec:
    name: str
    description: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    execution_mode: ExecutionMode
    provider: str
    credential_provider: str | None = None
    required_permissions: list[str] = field(default_factory=list)
    timeout_seconds: int = 30
    tags: list[str] = field(default_factory=list)
    version: str = "1.0.0"
    handler: ToolHandler | None = None
