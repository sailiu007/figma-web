from datetime import datetime, UTC

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.security import decode_jwt, encode_jwt, hash_password, verify_password
from app.core.config import get_settings
from app.persistence.auth import sql as auth_sql
from app.persistence.auth.model import User


class AuthService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._settings = get_settings()

    def ensure_bootstrap_password(self, user: User) -> None:
        if user.password_hash:
            return
        user.password_hash = hash_password(
            self._settings.default_admin_password)
        self._db.add(user)
        self._db.commit()
        self._db.refresh(user)

    def authenticate(self, username: str, password: str) -> User:
        user = auth_sql.get_user_by_username(self._db, username)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")
        self.ensure_bootstrap_password(user)
        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")
        user.last_login_at = datetime.now(UTC)
        self._db.add(user)
        self._db.commit()
        self._db.refresh(user)
        return user

    def issue_tokens(self, user: User) -> dict[str, str | int]:
        access_ttl = self._settings.jwt_access_ttl_seconds
        refresh_ttl = self._settings.jwt_refresh_ttl_seconds
        access_token = encode_jwt(
            {"sub": user.id, "username": user.username, "typ": "access"}, access_ttl)
        refresh_token = encode_jwt(
            {"sub": user.id, "username": user.username, "typ": "refresh"}, refresh_ttl)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": access_ttl,
        }

    def refresh_tokens(self, refresh_token: str) -> dict[str, str | int]:
        payload = decode_jwt(refresh_token, expected_token_type="refresh")
        user = auth_sql.get_user_by_id(self._db, str(payload["sub"]))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="principal not found")
        return self.issue_tokens(user)

    def resolve_user(self, access_token: str) -> User:
        payload = decode_jwt(access_token, expected_token_type="access")
        user = auth_sql.get_user_by_id(self._db, str(payload["sub"]))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="principal not found")
        return user

    def get_me(self, user_id: str) -> User:
        user = auth_sql.get_user_by_id(self._db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="principal not found")
        return user
