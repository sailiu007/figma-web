from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def _auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_credentials_crud_and_test() -> None:
    unique_name = f"cred-{uuid4().hex[:8]}"
    with TestClient(app) as client:
        headers = _auth_headers(client)
        create_response = client.post(
            "/api/v1/credentials",
            headers=headers,
            json={
                "provider": "jenkins",
                "auth_type": "token",
                "name": unique_name,
                "secret": {"token": "secret-value"},
                "config": {"base_url": "https://jenkins.example.local"},
            },
        )
        assert create_response.status_code == 201
        credential_id = create_response.json()["data"]["id"]

        test_response = client.post(
            f"/api/v1/credentials/{credential_id}/test", headers=headers)
        delete_response = client.delete(
            f"/api/v1/credentials/{credential_id}", headers=headers)

    assert test_response.status_code == 200
    assert test_response.json()["data"]["ok"] is True
    assert delete_response.status_code == 200
    assert delete_response.json() == {"ok": True}


def test_rbac_role_and_policy_management() -> None:
    unique_code = f"role_{uuid4().hex[:8]}"
    with TestClient(app) as client:
        headers = _auth_headers(client)
        users_response = client.get("/api/v1/users", headers=headers)
        policies_response = client.get("/api/v1/policies", headers=headers)
        assert users_response.status_code == 200
        assert policies_response.status_code == 200

        user_id = users_response.json()["data"][0]["id"]
        permission_id = policies_response.json()["data"][0]["id"]

        create_role_response = client.post(
            "/api/v1/roles",
            headers=headers,
            json={"code": unique_code, "name": unique_code,
                  "description": "test role"},
        )
        assert create_role_response.status_code == 201
        role_id = create_role_response.json()["data"]["id"]

        assign_policy_response = client.post(
            f"/api/v1/roles/{role_id}/policies",
            headers=headers,
            json={"permission_ids": [permission_id]},
        )
        assign_role_response = client.post(
            f"/api/v1/users/{user_id}/roles",
            headers=headers,
            json={"role_ids": [role_id]},
        )
        delete_role_response = client.delete(
            f"/api/v1/roles/{role_id}", headers=headers)

    assert assign_policy_response.status_code == 200
    assert len(assign_policy_response.json()["data"]) == 1
    assert assign_role_response.status_code == 200
    assert len(assign_role_response.json()["data"]) == 1
    assert delete_role_response.status_code == 200
    assert delete_role_response.json() == {"ok": True}
