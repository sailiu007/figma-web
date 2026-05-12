from fastapi import APIRouter

from app.api.routes import audit_logs, auth, credentials, health, jobs, rbac, tools
from app.core.config import get_settings

settings = get_settings()

api_router = APIRouter(prefix=settings.api_prefix)
api_router.include_router(auth.router)
api_router.include_router(credentials.router)
api_router.include_router(tools.router)
api_router.include_router(jobs.router)
api_router.include_router(audit_logs.router)
api_router.include_router(rbac.router)

root_router = APIRouter()
root_router.include_router(health.router)
root_router.include_router(api_router)
