from fastapi.testclient import TestClient

from app.main import app


def _auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_execute_tool_creates_audit_log_and_job(monkeypatch) -> None:
    from app.workers.tasks import execute_tool_task

    monkeypatch.setattr(execute_tool_task, "delay",
                        lambda *_args, **_kwargs: None)

    with TestClient(app) as client:
        headers = _auth_headers(client)

        sync_response = client.post(
            "/api/v1/tools/system.echo:execute",
            headers=headers,
            json={"input": {"message": "sync message"}},
        )
        async_response = client.post(
            "/api/v1/tools/system.sleep_echo:execute",
            headers=headers,
            json={"input": {"message": "async message", "delay_seconds": 0}},
        )
        audit_logs_response = client.get("/api/v1/audit-logs", headers=headers)
        jobs_response = client.get("/api/v1/jobs", headers=headers)

    assert sync_response.status_code == 200
    assert sync_response.json()["data"]["status"] == "succeeded"
    assert sync_response.json()["data"]["output"] == {
        "message": "sync message"}

    assert async_response.status_code == 200
    assert async_response.json()["data"]["job_id"] is not None

    assert audit_logs_response.status_code == 200
    tool_names = {entry["tool_name"] for entry in audit_logs_response.json()[
        "data"] if entry["tool_name"]}
    assert "system.echo" in tool_names
    assert "system.sleep_echo" in tool_names

    assert jobs_response.status_code == 200
    job_ids = {entry["id"] for entry in jobs_response.json()["data"]}
    assert async_response.json()["data"]["job_id"] in job_ids
