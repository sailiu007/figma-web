from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class CredentialCreate(BaseModel):
    provider: str
    auth_type: str
    name: str
    secret: dict[str, Any] = Field(default_factory=dict)
    config: dict[str, Any] = Field(default_factory=dict)


class CredentialRead(ORMModel):
    id: str
    provider: str
    auth_type: str
    name: str
    config_json: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime
