import base64
import hashlib
import json

from cryptography.fernet import Fernet

from app.core.config import get_settings
from app.models import Credential
from app.repositories import CredentialRepository
from app.schemas.credential import CredentialCreate


def _build_fernet() -> Fernet:
    secret = get_settings().secret_key.encode("utf-8")
    digest = hashlib.sha256(secret).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


class CredentialService:
    def __init__(self, repository: CredentialRepository) -> None:
        self._repository = repository
        self._fernet = _build_fernet()

    def encrypt_secret(self, secret_payload: dict) -> str:
        return self._fernet.encrypt(json.dumps(secret_payload).encode("utf-8")).decode("utf-8")

    def decrypt_secret(self, encrypted_secret: str) -> dict:
        raw = self._fernet.decrypt(
            encrypted_secret.encode("utf-8")).decode("utf-8")
        return json.loads(raw)

    def list_credentials(self, user_id: str) -> list[Credential]:
        return self._repository.list_by_user(user_id)

    def get_credential(self, user_id: str, credential_id: str) -> Credential | None:
        return self._repository.get_by_user(user_id, credential_id)

    def create_credential(self, tenant_id: str | None, user_id: str, payload: CredentialCreate) -> Credential:
        credential = Credential(
            tenant_id=tenant_id,
            owner_user_id=user_id,
            provider=payload.provider,
            auth_type=payload.auth_type,
            name=payload.name,
            encrypted_secret=self.encrypt_secret(payload.secret),
            config_json=payload.config,
        )
        return self._repository.create(credential)

    def delete_credential(self, user_id: str, credential_id: str) -> bool:
        credential = self.get_credential(user_id, credential_id)
        if credential is None:
            return False
        self._repository.delete(credential)
        return True

    def test_credential(self, user_id: str, credential_id: str) -> dict:
        credential = self.get_credential(user_id, credential_id)
        if credential is None:
            raise ValueError("credential not found")
        secret = self.decrypt_secret(credential.encrypted_secret)
        return {
            "ok": True,
            "provider": credential.provider,
            "auth_type": credential.auth_type,
            "secret_keys": sorted(secret.keys()),
        }
