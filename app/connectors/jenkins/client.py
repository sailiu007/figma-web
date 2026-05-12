from typing import Any
from urllib.parse import urljoin
from urllib.parse import urlparse

import jenkins

from app.connectors.common.logs import compile_patterns, extract_abnormal_lines


def fetch_pipeline_diagnostics(
    *,
    build_url: str | None,
    console_url: str | None,
    base_url: str | None,
    username: str | None,
    api_token: str | None,
    timeout_seconds: int = 20,
    max_log_lines: int = 80,
    log_patterns: list[str] | None = None,
) -> dict[str, Any]:
    resolved_console_url = resolve_console_url(
        build_url=build_url, console_url=console_url, base_url=base_url)
    server_url, job_name, build_number = parse_build_reference(
        build_url=build_url,
        console_url=resolved_console_url,
        base_url=base_url,
    )
    client = jenkins.Jenkins(
        server_url,
        username=username,
        password=api_token,
        timeout=timeout_seconds,
    )
    body = client.get_build_console_output(job_name, build_number)
    anomaly_lines = extract_abnormal_lines(
        body, compile_patterns(log_patterns), max_log_lines)
    return {
        "console_url": resolved_console_url,
        "status_code": 200,
        "anomaly_count": len(anomaly_lines),
        "anomaly_lines": anomaly_lines,
    }


def resolve_console_url(*, build_url: str | None, console_url: str | None, base_url: str | None) -> str:
    if console_url and console_url.strip():
        console_url = console_url.strip()
        if console_url.startswith(("http://", "https://")):
            return console_url
        if base_url and base_url.strip():
            return urljoin(base_url.rstrip("/") + "/", console_url.lstrip("/"))
        raise ValueError(
            "console_url must be absolute when jenkins base url is not configured")
    if build_url and build_url.strip():
        normalized_build_url = build_url.strip()
        if not normalized_build_url.startswith(("http://", "https://")):
            if not base_url or not base_url.strip():
                raise ValueError(
                    "build_url must be absolute when jenkins base url is not configured")
            normalized_build_url = urljoin(base_url.rstrip(
                "/") + "/", normalized_build_url.lstrip("/"))
        return urljoin(normalized_build_url.rstrip("/") + "/", "consoleText")
    raise ValueError("console_url or build_url is required")


def parse_build_reference(
    *,
    build_url: str | None,
    console_url: str | None,
    base_url: str | None,
) -> tuple[str, str, int]:
    source_url = resolve_build_url(
        build_url=build_url, console_url=console_url, base_url=base_url)
    parsed = urlparse(source_url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("jenkins build url must be absolute")

    segments = [segment for segment in parsed.path.split("/") if segment]
    if segments and segments[-1] == "consoleText":
        segments.pop()
    if not segments:
        raise ValueError("unable to resolve jenkins build number")

    try:
        build_number = int(segments[-1])
    except ValueError as exc:
        raise ValueError("unable to resolve jenkins build number") from exc

    job_segments = segments[:-1]
    if len(job_segments) < 2 or "job" not in job_segments:
        raise ValueError("unable to resolve jenkins job name")

    job_name = "/".join(
        job_segments[index + 1]
        for index, segment in enumerate(job_segments)
        if segment == "job" and index + 1 < len(job_segments)
    )
    if not job_name:
        raise ValueError("unable to resolve jenkins job name")

    server_url = f"{parsed.scheme}://{parsed.netloc}"
    return server_url, job_name, build_number


def resolve_build_url(*, build_url: str | None, console_url: str | None, base_url: str | None) -> str:
    if build_url and build_url.strip():
        normalized_build_url = build_url.strip()
        if normalized_build_url.startswith(("http://", "https://")):
            return normalized_build_url
        if base_url and base_url.strip():
            return urljoin(base_url.rstrip("/") + "/", normalized_build_url.lstrip("/"))
        raise ValueError(
            "build_url must be absolute when jenkins base url is not configured")

    if console_url and console_url.strip():
        normalized_console_url = resolve_console_url(
            build_url=None,
            console_url=console_url,
            base_url=base_url,
        )
        return normalized_console_url.removesuffix("/consoleText")

    raise ValueError("console_url or build_url is required")
