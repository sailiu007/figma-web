from pydantic import BaseModel, ConfigDict


class RequestContext(BaseModel):
    user_id: str
    tenant_id: str | None = None
    request_id: str
    trace_id: str


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
