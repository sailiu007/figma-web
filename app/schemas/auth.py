from app.schemas.common import ORMModel


class MeResponse(ORMModel):
    user_id: str
    username: str
    display_name: str
