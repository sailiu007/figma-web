from types import SimpleNamespace

from app.connectors.jenkins import client as jenkins_client
from app.connectors.jenkins import tools as jenkins_tools
from app.connectors.kubernetes import client as kubernetes_client
from app.connectors.kubernetes import tools as kubernetes_tools
from app.connectors.prometheus import client as prometheus_client
from app.connectors.prometheus import tools as prometheus_tools


def test_pushgateway_tool_pushes_metrics(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_push_to_gateway(gateway: str, *, job: str, registry, grouping_key, timeout, handler):
        captured["gateway"] = gateway
        captured["job"] = job
        captured["grouping_key"] = grouping_key
        captured["timeout"] = timeout
        captured["samples"] = [
            sample
            for metric_family in registry.collect()
            for sample in metric_family.samples
            if sample.name == "atlas_tool_invocations_total"
        ]
        handler(gateway, "PUT", timeout, [], b"")()

    monkeypatch.setattr(prometheus_client,
                        "push_to_gateway", fake_push_to_gateway)
    monkeypatch.setattr(
        prometheus_tools,
        "get_settings",
        lambda: SimpleNamespace(pushgateway_url="http://pushgateway:9091"),
    )

    result = prometheus_tools.pushgateway_push_metrics_tool(
        {
            "job": "atlas_sync",
            "grouping_key": {"instance": "atlas-1"},
            "metrics": [
                {
                    "name": "atlas_tool_invocations_total",
                    "value": 3,
                    "type": "counter",
                    "labels": {"tool": "prometheus.pushgateway_push_metrics"},
                }
            ],
        }
    )

    assert result["status_code"] == 202
    assert result["pushed_count"] == 1
    assert captured["gateway"] == "http://pushgateway:9091"
    assert captured["job"] == "atlas_sync"
    assert captured["grouping_key"] == {"instance": "atlas-1"}
    assert captured["samples"][0].labels == {
        "tool": "prometheus.pushgateway_push_metrics"}
    assert captured["samples"][0].value == 3


def test_jenkins_tool_extracts_anomaly_lines(monkeypatch) -> None:
    class FakeJenkins:
        def __init__(self, url: str, username=None, password=None, timeout=None):
            assert url == "http://jenkins"
            assert username is None
            assert password is None
            assert timeout == 20

        def get_build_console_output(self, name: str, number: int):
            assert name == "demo"
            assert number == 18
            return "ok\nERROR build failed\nall done\njava.lang.Exception: boom"

    monkeypatch.setattr(jenkins_client.jenkins, "Jenkins", FakeJenkins)
    monkeypatch.setattr(
        jenkins_tools,
        "get_settings",
        lambda: SimpleNamespace(
            jenkins_base_url="http://jenkins",
            jenkins_username=None,
            jenkins_api_token=None,
        ),
    )

    result = jenkins_tools.jenkins_pipeline_diagnostics_tool(
        {"build_url": "http://jenkins/job/demo/18"}
    )

    assert result["status_code"] == 200
    assert result["anomaly_count"] == 2
    assert result["anomaly_lines"][0]["content"] == "ERROR build failed"


def test_k8s_tool_collects_pod_status_and_logs(monkeypatch) -> None:
    pod = SimpleNamespace(
        metadata=SimpleNamespace(name="atlas-api"),
        spec=SimpleNamespace(node_name="node-a"),
        status=SimpleNamespace(
            phase="Running",
            pod_ip="10.0.0.12",
            conditions=[SimpleNamespace(
                type="Ready", status="False", reason="ContainersNotReady", message="not ready")],
            container_statuses=[
                SimpleNamespace(
                    name="app",
                    ready=False,
                    restart_count=2,
                    state=SimpleNamespace(
                        running=None,
                        waiting=SimpleNamespace(
                            reason="CrashLoopBackOff", message="back-off restarting failed container"),
                        terminated=None,
                    ),
                )
            ],
        ),
    )

    class FakeCoreV1Api:
        def list_namespaced_pod(self, namespace: str, label_selector=None):
            assert namespace == "atlas"
            return SimpleNamespace(items=[pod])

        def read_namespaced_pod_log(self, **kwargs):
            return "INFO started\nERROR failed to connect db\nTraceback: sample"

    monkeypatch.setattr(kubernetes_tools, "build_core_v1_api",
                        lambda **kwargs: FakeCoreV1Api())

    result = kubernetes_tools.k8s_pod_diagnostics_tool(
        {"namespace": "atlas", "label_selector": "app=atlas-api"})

    assert result["pod_count"] == 1
    assert result["pods"][0]["abnormal"] is True
    assert result["pods"][0]["container_statuses"][0]["reason"] == "CrashLoopBackOff"
    assert result["pods"][0]["abnormal_logs"][0]["lines"][0]["content"] == "ERROR failed to connect db"
