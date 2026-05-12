from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


class ContextRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_user_by_id(self, user_id: str) -> User | None:
        return self._db.scalar(select(User).where(User.id == user_id))

    def get_user_by_username(self, username: str) -> User | None:
        return self._db.scalar(select(User).where(User.username == username))
