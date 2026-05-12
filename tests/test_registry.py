from app.tools.builtin import load_builtin_tools
from app.tools.registry import registry


def test_builtin_tools_are_discovered() -> None:
    load_builtin_tools()
    tool_names = [tool.name for tool in registry.list()]
    assert "system.echo" in tool_names
    assert "system.sleep_echo" in tool_names
    assert "prometheus.pushgateway_push_metrics" in tool_names
    assert "kubernetes.pod_diagnostics" in tool_names
    assert "jenkins.pipeline_diagnostics" in tool_names
