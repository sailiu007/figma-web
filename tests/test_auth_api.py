from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def _login(client: TestClient) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["token_type"] == "bearer"
    return body["data"]["access_token"]


def test_login_and_me() -> None:
    with TestClient(app) as client:
        access_token = _login(client)
        response = client.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["username"] == "admin"
    assert body["data"]["display_name"]


def test_refresh_token() -> None:
    with TestClient(app) as client:
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        refresh_token = login_response.json()["data"]["refresh_token"]
        response = client.post("/api/v1/auth/refresh",
                               json={"refresh_token": refresh_token})

    assert response.status_code == 200
    assert response.json()["data"]["access_token"]
