from app.tools.registry import registry


def load_builtin_tools() -> None:
    registry.discover("app.tools.builtin")
    registry.discover("app.providers")
