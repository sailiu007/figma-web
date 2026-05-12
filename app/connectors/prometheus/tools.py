from typing import Any

from app.core.config import get_settings
from app.connectors.prometheus.client import push_metrics
from app.tools.registry import tool
from app.tools.spec import ToolSpec


@tool(
    ToolSpec(
        name="prometheus.pushgateway_push_metrics",
        description="Push metrics to a Prometheus Pushgateway endpoint.",
        input_schema={
            "type": "object",
            "properties": {
                "pushgateway_url": {"type": "string"},
                "job": {"type": "string"},
                "grouping_key": {
                    "type": "object",
                    "additionalProperties": {"type": "string"},
                },
                "metrics": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "value": {"type": "number"},
                            "type": {"type": "string", "default": "gauge"},
                            "help": {"type": "string"},
                            "labels": {
                                "type": "object",
                                "additionalProperties": {"type": "string"},
                            },
                        },
                        "required": ["name", "value"],
                    },
                },
                "timeout_seconds": {"type": "integer", "default": 10},
            },
            "required": ["job", "metrics"],
        },
        output_schema={
            "type": "object",
            "properties": {
                "endpoint": {"type": "string"},
                "job": {"type": "string"},
                "pushed_count": {"type": "integer"},
                "status_code": {"type": "integer"},
            },
        },
        execution_mode="sync",
        provider="prometheus",
        required_permissions=[
            "tool:prometheus.pushgateway_push_metrics:execute"],
        tags=["observability", "prometheus", "pushgateway"],
        timeout_seconds=30,
    )
)
def pushgateway_push_metrics_tool(payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    pushgateway_url = str(payload.get("pushgateway_url")
                          or settings.pushgateway_url or "").strip()
    return push_metrics(
        pushgateway_url=pushgateway_url,
        job=str(payload.get("job") or "").strip(),
        metrics=list(payload.get("metrics") or []),
        grouping_key=dict(payload.get("grouping_key") or {}),
        timeout_seconds=int(payload.get("timeout_seconds") or 10),
    )
