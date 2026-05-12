import time
from app.tools.registry import tool
from app.tools.spec import ToolSpec


@tool(
    ToolSpec(
        name="system.echo",
        description="Echo the provided payload back to the caller.",
        input_schema={"type": "object", "properties": {
            "message": {"type": "string"}}, "required": ["message"]},
        output_schema={"type": "object", "properties": {
            "message": {"type": "string"}}},
        execution_mode="sync",
        provider="system",
        required_permissions=["tool:system.echo:execute"],
    )
)
def echo_tool(payload: dict) -> dict:
    return {"message": str(payload.get("message", ""))}


@tool(
    ToolSpec(
        name="system.sleep_echo",
        description="Wait briefly and echo the payload, useful to test async jobs.",
        input_schema={
            "type": "object",
            "properties": {
                "message": {"type": "string"},
                "delay_seconds": {"type": "number", "default": 2},
            },
            "required": ["message"],
        },
        output_schema={"type": "object", "properties": {"message": {
            "type": "string"}, "delay_seconds": {"type": "number"}}},
        execution_mode="async",
        provider="system",
        required_permissions=["tool:system.sleep_echo:execute"],
    )
)
def sleep_echo_tool(payload: dict) -> dict:
    delay_seconds = float(payload.get("delay_seconds", 2))
    time.sleep(delay_seconds)
    return {"message": str(payload.get("message", "")), "delay_seconds": delay_seconds}
