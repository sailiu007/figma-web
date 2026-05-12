from typing import Any

from app.core.config import get_settings
from app.connectors.jenkins.client import fetch_pipeline_diagnostics
from app.tools.registry import tool
from app.tools.spec import ToolSpec


@tool(
    ToolSpec(
        name="jenkins.pipeline_diagnostics",
        description="Fetch Jenkins pipeline console logs and extract abnormal lines.",
        input_schema={
            "type": "object",
            "properties": {
                "build_url": {"type": "string"},
                "console_url": {"type": "string"},
                "username": {"type": "string"},
                "api_token": {"type": "string"},
                "timeout_seconds": {"type": "integer", "default": 20},
                "max_log_lines": {"type": "integer", "default": 80},
                "log_patterns": {"type": "array", "items": {"type": "string"}},
            },
        },
        output_schema={
            "type": "object",
            "properties": {
                "console_url": {"type": "string"},
                "status_code": {"type": "integer"},
                "anomaly_count": {"type": "integer"},
                "anomaly_lines": {"type": "array"},
            },
        },
        execution_mode="sync",
        provider="jenkins",
        required_permissions=["tool:jenkins.pipeline_diagnostics:execute"],
        tags=["jenkins", "pipeline", "logs"],
        timeout_seconds=60,
    )
)
def jenkins_pipeline_diagnostics_tool(payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    return fetch_pipeline_diagnostics(
        build_url=payload.get("build_url"),
        console_url=payload.get("console_url"),
        base_url=settings.jenkins_base_url,
        username=payload.get("username") or settings.jenkins_username,
        api_token=payload.get("api_token") or settings.jenkins_api_token,
        timeout_seconds=int(payload.get("timeout_seconds") or 20),
        max_log_lines=int(payload.get("max_log_lines") or 80),
        log_patterns=payload.get("log_patterns"),
    )
