import re
from typing import Any

DEFAULT_ANOMALY_PATTERNS = [
    r"\berror\b",
    r"\bexception\b",
    r"\bpanic\b",
    r"\bfailed?\b",
    r"\btraceback\b",
    r"crashloopbackoff",
    r"oomkilled",
    r"back[- ]off",
    r"timed?\s+out",
    r"connection refused",
]


def compile_patterns(custom_patterns: list[str] | None) -> list[re.Pattern[str]]:
    patterns = custom_patterns or DEFAULT_ANOMALY_PATTERNS
    return [re.compile(pattern, re.IGNORECASE) for pattern in patterns]


def extract_abnormal_lines(
    log_text: str,
    patterns: list[re.Pattern[str]],
    max_lines: int,
) -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    for line_number, line in enumerate(log_text.splitlines(), start=1):
        if any(pattern.search(line) for pattern in patterns):
            matches.append({"line_number": line_number, "content": line})
        if len(matches) >= max_lines:
            break
    return matches
