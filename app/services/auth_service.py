from fastapi import HTTPException, status

from app.repositories import ContextRepository
from app.schemas.auth import MeResponse
from app.schemas.common import RequestContext


class AuthService:
    def __init__(self, repository: ContextRepository) -> None:
        self._repository = repository

    def get_me(self, context: RequestContext) -> MeResponse:
        user = self._repository.get_user_by_id(context.user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="principal not found")
        return MeResponse(user_id=user.id, username=user.username, display_name=user.display_name)
