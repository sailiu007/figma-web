import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import get_settings


def _urlsafe_b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _urlsafe_b64decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode((raw + padding).encode("ascii"))


def hash_password(password: str) -> str:
    secret = get_settings().secret_key.encode("utf-8")
    return hashlib.sha256(secret + password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        return False
    return hmac.compare_digest(hash_password(password), password_hash)


def encode_jwt(payload: dict[str, Any], expires_in_seconds: int) -> str:
    now = datetime.now(UTC)
    full_payload = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in_seconds)).timestamp()),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    header_part = _urlsafe_b64encode(json.dumps(
        header, separators=(",", ":")).encode("utf-8"))
    payload_part = _urlsafe_b64encode(json.dumps(
        full_payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    signature = hmac.new(get_settings().secret_key.encode(
        "utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_part}.{payload_part}.{_urlsafe_b64encode(signature)}"


def decode_jwt(token: str, expected_token_type: str | None = None) -> dict[str, Any]:
    try:
        header_part, payload_part, signature_part = token.split(".", 2)
    except ValueError as exc:
        raise ValueError("invalid token format") from exc

    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    expected_signature = hmac.new(
        get_settings().secret_key.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()
    if not hmac.compare_digest(expected_signature, _urlsafe_b64decode(signature_part)):
        raise ValueError("invalid token signature")

    payload = json.loads(_urlsafe_b64decode(payload_part).decode("utf-8"))
    now = int(datetime.now(UTC).timestamp())
    if int(payload.get("exp", 0)) < now:
        raise ValueError("token expired")
    if expected_token_type and payload.get("typ") != expected_token_type:
        raise ValueError("invalid token type")
    return payload
