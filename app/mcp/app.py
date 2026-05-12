from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.service import AuthService
from app.db.init_db import init_db
from app.db.session import engine, get_db
from app.mcp.executor import McpExecutor
from app.mcp.server import McpServerAdapter
from app.schemas.common import RequestContext
from app.services.tool_service import ToolService
from app.repositories.execution_repository import ExecutionRepository
from app.tools.builtin import load_builtin_tools


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db(engine)
    load_builtin_tools()
    yield


app = FastAPI(title="Atlas MCP Service", lifespan=lifespan)


class McpToolCallRequest(BaseModel):
    tool_name: str
    input: dict = Field(default_factory=dict)
    credential_id: str | None = None


def get_tool_service(db: Session = Depends(get_db)) -> ToolService:
    return ToolService(ExecutionRepository(db))


def get_mcp_server(tool_service: ToolService = Depends(get_tool_service)) -> McpServerAdapter:
    return McpServerAdapter(McpExecutor(tool_service))


def get_mcp_context(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_request_id: str | None = Header(default=None, alias="X-Request-Id"),
    x_trace_id: str | None = Header(default=None, alias="X-Trace-Id"),
    db: Session = Depends(get_db),
) -> RequestContext:
    if authorization is None or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    user = AuthService(db).resolve_user(token)
    request_id = x_request_id or "mcp-request"
    trace_id = x_trace_id or request_id
    return RequestContext(user_id=user.id, tenant_id=user.tenant_id, request_id=request_id, trace_id=trace_id)


@app.get("/healthz")
def healthz() -> dict[str, bool]:
    return {"ok": True}


@app.get("/tools/list")
def tools_list(server: McpServerAdapter = Depends(get_mcp_server)) -> list[dict]:
    return server.tools_list()


@app.post("/tools/call")
def tools_call(
    payload: McpToolCallRequest,
    context: RequestContext = Depends(get_mcp_context),
    server: McpServerAdapter = Depends(get_mcp_server),
) -> dict:
    return server.tools_call(context, payload.tool_name, payload.input, payload.credential_id)
