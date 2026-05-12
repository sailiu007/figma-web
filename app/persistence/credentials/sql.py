from sqlalchemy import select
from sqlalchemy.orm import Session

from app.persistence.credentials.model import Credential


def list_credentials(db: Session) -> list[Credential]:
    return list(db.scalars(select(Credential).order_by(Credential.created_at.desc())))


def list_credentials_by_user(db: Session, user_id: str) -> list[Credential]:
    return list(
        db.scalars(select(Credential).where(Credential.owner_user_id ==
                   user_id).order_by(Credential.created_at.desc()))
    )


def get_credential(db: Session, credential_id: str) -> Credential | None:
    return db.scalar(select(Credential).where(Credential.id == credential_id))


def add_credential(db: Session, credential: Credential) -> Credential:
    db.add(credential)
    db.commit()
    db.refresh(credential)
    return credential
