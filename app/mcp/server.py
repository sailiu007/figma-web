from app.mcp.executor import McpExecutor


class McpServerAdapter:
    """Minimal MCP-facing adapter.

    This keeps the MCP service boundary explicit even before a dedicated MCP
    transport package is wired in.
    """

    def __init__(self, executor: McpExecutor) -> None:
        self._executor = executor

    def tools_list(self) -> list[dict]:
        return self._executor.list_tools()

    def tools_call(self, context, tool_name: str, input_payload: dict, credential_id: str | None = None) -> dict:
        return self._executor.call_tool(context, tool_name, input_payload, credential_id)
