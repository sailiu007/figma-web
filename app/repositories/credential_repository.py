from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Credential


class CredentialRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list_by_user(self, user_id: str) -> list[Credential]:
        stmt = select(Credential).where(Credential.owner_user_id ==
                                        user_id).order_by(Credential.created_at.desc())
        return list(self._db.scalars(stmt))

    def get_by_user(self, user_id: str, credential_id: str) -> Credential | None:
        stmt = select(Credential).where(Credential.owner_user_id ==
                                        user_id, Credential.id == credential_id)
        return self._db.scalar(stmt)

    def create(self, credential: Credential) -> Credential:
        self._db.add(credential)
        self._db.commit()
        self._db.refresh(credential)
        return credential

    def delete(self, credential: Credential) -> None:
        self._db.delete(credential)
        self._db.commit()
