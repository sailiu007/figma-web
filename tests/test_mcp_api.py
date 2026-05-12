from fastapi.testclient import TestClient

from app.mcp.app import app as mcp_app


def _login(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


def test_mcp_tools_list_and_call(monkeypatch) -> None:
    from app.workers.tasks import execute_tool_task

    monkeypatch.setattr(execute_tool_task, "delay",
                        lambda *_args, **_kwargs: None)

    with TestClient(mcp_app) as client:
        from fastapi.testclient import TestClient as ApiClient
        from app.main import app as api_app

        with ApiClient(api_app) as api_client:
            token = _login(api_client)

        list_response = client.get("/tools/list")
        call_response = client.post(
            "/tools/call",
            headers={"Authorization": f"Bearer {token}"},
            json={"tool_name": "system.echo",
                  "input": {"message": "hello mcp"}},
        )

    assert list_response.status_code == 200
    tool_names = {item["name"] for item in list_response.json()}
    assert "system.echo" in tool_names
    assert call_response.status_code == 200
    assert call_response.json()["status"] == "succeeded"
    assert call_response.json()["output"] == {"message": "hello mcp"}
