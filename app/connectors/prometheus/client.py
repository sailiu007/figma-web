from typing import Any
from urllib.parse import quote

from prometheus_client import CollectorRegistry
from prometheus_client import Counter
from prometheus_client import Gauge
from prometheus_client import Histogram
from prometheus_client import Summary
from prometheus_client import push_to_gateway


def push_metrics(
    *,
    pushgateway_url: str,
    job: str,
    metrics: list[dict[str, Any]],
    grouping_key: dict[str, Any] | None = None,
    timeout_seconds: int = 10,
) -> dict[str, Any]:
    if not pushgateway_url.strip():
        raise ValueError("pushgateway_url is required")
    if not job.strip():
        raise ValueError("job is required")
    if not metrics:
        raise ValueError("metrics must not be empty")

    endpoint = build_pushgateway_endpoint(
        pushgateway_url, job, grouping_key or {})
    registry = build_registry(metrics)
    status_code_holder: dict[str, int] = {"status_code": 202}
    push_to_gateway(
        pushgateway_url,
        job=job,
        registry=registry,
        grouping_key=grouping_key or {},
        timeout=timeout_seconds,
        handler=build_status_handler(status_code_holder),
    )
    return {
        "endpoint": endpoint,
        "job": job,
        "pushed_count": len(metrics),
        "status_code": status_code_holder["status_code"],
    }


def build_registry(metrics: list[dict[str, Any]]) -> CollectorRegistry:
    registry = CollectorRegistry()
    for metric in metrics:
        register_metric(registry, metric)
    return registry


def register_metric(registry: CollectorRegistry, metric: dict[str, Any]) -> None:
    name = str(metric.get("name") or "").strip()
    if not name:
        raise ValueError("metric.name is required")

    metric_type = str(metric.get("type") or "gauge").strip().lower()
    metric_help = str(metric.get("help") or name)
    labels = {str(key): str(value)
              for key, value in dict(metric.get("labels") or {}).items()}
    label_names = list(labels.keys())
    value = metric.get("value")

    if metric_type == "counter":
        collector = Counter(name, metric_help,
                            labelnames=label_names, registry=registry)
        collector.labels(**labels).inc(float(value)
                                       ) if labels else collector.inc(float(value))
        return

    if metric_type == "gauge":
        collector = Gauge(name, metric_help,
                          labelnames=label_names, registry=registry)
        collector.labels(**labels).set(float(value)
                                       ) if labels else collector.set(float(value))
        return

    if metric_type == "summary":
        collector = Summary(name, metric_help,
                            labelnames=label_names, registry=registry)
        collector.labels(**labels).observe(float(value)
                                           ) if labels else collector.observe(float(value))
        return

    if metric_type == "histogram":
        collector = Histogram(
            name, metric_help, labelnames=label_names, registry=registry)
        collector.labels(**labels).observe(float(value)
                                           ) if labels else collector.observe(float(value))
        return

    raise ValueError(f"unsupported metric type: {metric_type}")


def build_status_handler(status_code_holder: dict[str, int]):
    def handler(url: str, method: str, timeout: float | None, headers, data: bytes):
        def push() -> None:
            status_code_holder["status_code"] = 202

        return push

    return handler


def build_pushgateway_endpoint(pushgateway_url: str, job: str, grouping_key: dict[str, Any]) -> str:
    parts = [pushgateway_url.rstrip(
        "/"), "metrics", "job", quote(str(job), safe="")]
    for key, value in sorted(grouping_key.items()):
        parts.extend([quote(str(key), safe=""), quote(str(value), safe="")])
    return "/".join(parts)


def render_prometheus_metrics(metrics: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    emitted_meta: set[str] = set()
    for metric in metrics:
        name = str(metric.get("name") or "").strip()
        if not name:
            raise ValueError("metric.name is required")

        metric_type = str(metric.get("type") or "gauge")
        metric_help = metric.get("help")
        if name not in emitted_meta:
            if metric_help:
                lines.append(f"# HELP {name} {metric_help}")
            lines.append(f"# TYPE {name} {metric_type}")
            emitted_meta.add(name)
        lines.append(
            f"{name}{format_prometheus_labels(metric.get('labels') or {})} {metric['value']}"
        )
    return "\n".join(lines) + "\n"


def format_prometheus_labels(labels: dict[str, Any]) -> str:
    if not labels:
        return ""
    pairs = []
    for key, value in sorted(labels.items()):
        escaped = str(value).replace('\\', r'\\').replace('"', r'\"')
        pairs.append(f'{key}="{escaped}"')
    return "{" + ",".join(pairs) + "}"
