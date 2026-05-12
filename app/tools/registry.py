import importlib
import pkgutil
from collections.abc import Iterable
from threading import Lock

from app.tools.spec import ToolSpec


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}
        self._loaded_packages: set[str] = set()
        self._lock = Lock()

    def register(self, spec: ToolSpec) -> None:
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec | None:
        return self._tools.get(name)

    def list(self) -> list[ToolSpec]:
        return sorted(self._tools.values(), key=lambda item: item.name)

    def discover(self, package_name: str) -> None:
        with self._lock:
            if package_name in self._loaded_packages:
                return
            package = importlib.import_module(package_name)
            modules: Iterable[pkgutil.ModuleInfo] = pkgutil.walk_packages(
                package.__path__, package.__name__ + ".")
            for module in modules:
                importlib.import_module(module.name)
            self._loaded_packages.add(package_name)


registry = ToolRegistry()


def tool(spec: ToolSpec):
    def decorator(func):
        spec.handler = func
        registry.register(spec)
        return func

    return decorator
