from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.router import root_router
from app.core.config import get_settings
from app.db.init_db import init_db
from app.db.session import engine
from app.schemas.response import response_base
from app.tools.builtin import load_builtin_tools

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db(engine)
    load_builtin_tools()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    payload = response_base.fail(code=exc.status_code, msg=str(exc.detail))
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    payload = response_base.fail(
        code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        msg="Validation Error",
        data={"errors": exc.errors()},
    )
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=payload.model_dump())


@app.exception_handler(Exception)
async def generic_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    payload = response_base.fail(
        code=status.HTTP_500_INTERNAL_SERVER_ERROR, msg=str(exc))
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=payload.model_dump())

app.include_router(root_router)
