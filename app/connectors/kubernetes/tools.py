from typing import Any

from app.core.config import get_settings
from app.connectors.kubernetes.client import build_core_v1_api, collect_pod_diagnostics
from app.tools.registry import tool
from app.tools.spec import ToolSpec


@tool(
    ToolSpec(
        name="kubernetes.pod_diagnostics",
        description="Inspect Kubernetes pod status and extract abnormal log lines.",
        input_schema={
            "type": "object",
            "properties": {
                "namespace": {"type": "string"},
                "pod_name": {"type": "string"},
                "label_selector": {"type": "string"},
                "tail_lines": {"type": "integer", "default": 200},
                "since_seconds": {"type": "integer"},
                "max_log_lines": {"type": "integer", "default": 50},
                "log_patterns": {"type": "array", "items": {"type": "string"}},
                "kubeconfig_path": {"type": "string"},
                "context": {"type": "string"},
            },
            "required": ["namespace"],
        },
        output_schema={
            "type": "object",
            "properties": {
                "namespace": {"type": "string"},
                "pod_count": {"type": "integer"},
                "pods": {"type": "array"},
            },
        },
        execution_mode="sync",
        provider="kubernetes",
        required_permissions=["tool:kubernetes.pod_diagnostics:execute"],
        tags=["kubernetes", "logs", "diagnostics"],
        timeout_seconds=60,
    )
)
def k8s_pod_diagnostics_tool(payload: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    core_v1_api = build_core_v1_api(
        kubeconfig_path=payload.get(
            "kubeconfig_path") or settings.kubeconfig_path,
        context=payload.get("context") or settings.kubernetes_context,
    )
    return collect_pod_diagnostics(
        namespace=str(payload.get("namespace") or "").strip(),
        core_v1_api=core_v1_api,
        pod_name=payload.get("pod_name"),
        label_selector=payload.get("label_selector"),
        tail_lines=int(payload.get("tail_lines") or 200),
        since_seconds=payload.get("since_seconds"),
        max_log_lines=int(payload.get("max_log_lines") or 50),
        log_patterns=payload.get("log_patterns"),
    )
