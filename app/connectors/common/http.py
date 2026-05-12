import base64
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def http_request(
    url: str,
    *,
    method: str,
    timeout: int,
    data: bytes | None = None,
    headers: dict[str, str] | None = None,
    auth: tuple[str, str] | None = None,
) -> tuple[int, str]:
    request_headers = dict(headers or {})
    if auth is not None:
        token = base64.b64encode(
            f"{auth[0]}:{auth[1]}".encode("utf-8")
        ).decode("ascii")
        request_headers["Authorization"] = f"Basic {token}"

    request = Request(url=url, data=data,
                      headers=request_headers, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return int(getattr(response, "status", 200)), body
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"request failed with status {exc.code}: {body[:400]}") from exc
    except URLError as exc:
        raise RuntimeError(f"request failed: {exc.reason}") from exc
