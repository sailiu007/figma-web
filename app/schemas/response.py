from enum import IntEnum
from http import HTTPStatus
from typing import Any, Generic, TypeVar, overload

from pydantic import BaseModel, Field

SchemaT = TypeVar("SchemaT")


class ResponseCode(IntEnum):
    SUCCESS = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    INTERNAL_SERVER_ERROR = 500


class ResponseModel(BaseModel):
    code: int = Field(default=ResponseCode.SUCCESS, description="业务状态码")
    msg: str = Field(default=HTTPStatus.OK.phrase, description="返回信息")
    data: Any | None = Field(default=None, description="返回数据")


class ResponseSchemaModel(ResponseModel, Generic[SchemaT]):
    data: SchemaT


class ResponseBase:
    @staticmethod
    def _build(*, code: int, msg: str, data: Any | None) -> ResponseModel | ResponseSchemaModel[Any]:
        if data is None:
            return ResponseModel(code=code, msg=msg, data=None)
        return ResponseSchemaModel[Any](code=code, msg=msg, data=data)

    @overload
    def success(self, *, code: int = int(ResponseCode.SUCCESS),
                msg: str = HTTPStatus.OK.phrase, data: None = None) -> ResponseModel: ...

    @overload
    def success(self, *, code: int = int(ResponseCode.SUCCESS),
                msg: str = HTTPStatus.OK.phrase, data: SchemaT) -> ResponseSchemaModel[SchemaT]: ...

    def success(
        self,
        *,
        code: int = int(ResponseCode.SUCCESS),
        msg: str = HTTPStatus.OK.phrase,
        data: Any | None = None,
    ) -> ResponseModel | ResponseSchemaModel[Any]:
        return self._build(code=code, msg=msg, data=data)

    def fail(self, *, code: int, msg: str, data: Any | None = None) -> ResponseModel | ResponseSchemaModel[Any]:
        return self._build(code=code, msg=msg, data=data)


response_base = ResponseBase()
