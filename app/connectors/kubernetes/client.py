from typing import Any

from app.connectors.common.logs import compile_patterns, extract_abnormal_lines


def collect_pod_diagnostics(
    *,
    namespace: str,
    core_v1_api: Any,
    pod_name: str | None = None,
    label_selector: str | None = None,
    tail_lines: int = 200,
    since_seconds: int | None = None,
    max_log_lines: int = 50,
    log_patterns: list[str] | None = None,
) -> dict[str, Any]:
    if not namespace.strip():
        raise ValueError("namespace is required")

    patterns = compile_patterns(log_patterns)
    if pod_name:
        pods = [core_v1_api.read_namespaced_pod(
            name=pod_name, namespace=namespace)]
    else:
        pods = core_v1_api.list_namespaced_pod(
            namespace=namespace, label_selector=label_selector).items

    diagnostics = []
    for pod in pods:
        statuses = []
        abnormal_logs = []
        pod_abnormal = getattr(pod.status, "phase", None) not in {
            "Running", "Succeeded"}

        for container_status in list(getattr(pod.status, "container_statuses", None) or []):
            state, reason, message = describe_container_state(container_status)
            restart_count = int(
                getattr(container_status, "restart_count", 0) or 0)
            if state != "running" or restart_count > 0:
                pod_abnormal = True

            statuses.append(
                {
                    "name": container_status.name,
                    "ready": bool(getattr(container_status, "ready", False)),
                    "restart_count": restart_count,
                    "state": state,
                    "reason": reason,
                    "message": message,
                }
            )

            try:
                log_text = core_v1_api.read_namespaced_pod_log(
                    name=pod.metadata.name,
                    namespace=namespace,
                    container=container_status.name,
                    tail_lines=tail_lines,
                    since_seconds=since_seconds,
                    timestamps=True,
                )
            except Exception as exc:  # noqa: BLE001
                log_text = f"failed to read logs: {exc}"

            matches = extract_abnormal_lines(log_text, patterns, max_log_lines)
            if matches:
                abnormal_logs.append(
                    {"container": container_status.name, "lines": matches})

        diagnostics.append(
            {
                "name": pod.metadata.name,
                "phase": getattr(pod.status, "phase", None),
                "node_name": getattr(pod.spec, "node_name", None),
                "pod_ip": getattr(pod.status, "pod_ip", None),
                "abnormal": pod_abnormal,
                "conditions": [
                    {
                        "type": condition.type,
                        "status": condition.status,
                        "reason": getattr(condition, "reason", None),
                        "message": getattr(condition, "message", None),
                    }
                    for condition in list(getattr(pod.status, "conditions", None) or [])
                ],
                "container_statuses": statuses,
                "abnormal_logs": abnormal_logs,
            }
        )

    return {"namespace": namespace, "pod_count": len(diagnostics), "pods": diagnostics}


def build_core_v1_api(*, kubeconfig_path: str | None = None, context: str | None = None):
    try:
        from kubernetes import client as kubernetes_client
        from kubernetes import config as kubernetes_config
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "kubernetes package is required for pod diagnostics") from exc

    try:
        if kubeconfig_path or context:
            kubernetes_config.load_kube_config(
                config_file=kubeconfig_path, context=context)
        else:
            try:
                kubernetes_config.load_incluster_config()
            except Exception:  # noqa: BLE001
                kubernetes_config.load_kube_config()
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"failed to load kubernetes config: {exc}") from exc

    return kubernetes_client.CoreV1Api()


def describe_container_state(container_status: Any) -> tuple[str, str | None, str | None]:
    state = getattr(container_status, "state", None)
    if state is None:
        return "unknown", None, None
    if getattr(state, "running", None) is not None:
        return "running", None, None
    if getattr(state, "waiting", None) is not None:
        waiting = state.waiting
        return "waiting", getattr(waiting, "reason", None), getattr(waiting, "message", None)
    if getattr(state, "terminated", None) is not None:
        terminated = state.terminated
        return "terminated", getattr(terminated, "reason", None), getattr(terminated, "message", None)
    return "unknown", None, None
