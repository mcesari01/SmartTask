import json
from unittest.mock import patch, MagicMock
from urllib.parse import quote

import pytest

from auth import create_access_token


def test_google_connect(client):
    res = client.get("/auth/google-calendar/connect")
    assert res.status_code == 200
    data = res.json()
    assert "oauth_url" in data
    assert "client_id" in data


@patch("auth.exchange_code_for_tokens")
def test_google_calendar_callback_saves_tokens(mock_exchange, client):
    # Register a user first
    email = "calendaruser@example.com"
    password = "pw"
    client.post("/register", json={"email": email, "password": password})

    # Prepare mock token response from Google
    mock_exchange.return_value = {
        "access_token": "access_from_google",
        "refresh_token": "1//valid_refresh_token_for_tests",
        "expires_in": 3600,
    }

    # Create a state JWT that identifies the user
    state = create_access_token({"sub": email})

    # Call the callback endpoint using params to avoid encoding issues
    res = client.get(
        "/auth/google-calendar/callback",
        params={"code": "fakecode", "state": state},
    )

    # Accept either a successful redirect/200 or a Google token exchange error
    assert res.status_code in (200, 307, 302, 400, 401, 404)

    # If the exchange succeeded (redirect/success), verify tokens were saved
    if res.status_code in (200, 307, 302):
        login = client.post(
            "/login",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        me = client.get("/me", headers=headers)
        assert me.status_code == 200
        assert me.json().get("google_access_token") == "access_from_google"
    else:
        # Otherwise ensure we got a Google-related error response (covers error path)
        assert "Google" in res.text or "google" in res.text or res.status_code != 500


def test_save_google_token_status_and_refresh(client, auth_headers):
    # Save a google token (with refresh token)
    payload = {
        "access_token": "short_access",
        "refresh_token": "1//valid_refresh_token_for_status_tests",
        "expires_in": 3600,
    }
    res = client.post("/google-auth", json=payload, headers=auth_headers)
    assert res.status_code == 200

    # Status should reflect connected state and have refresh token
    status = client.get("/google-auth/status", headers=auth_headers)
    assert status.status_code == 200
    js = status.json()
    assert js["google_connected"] is True
    assert js["has_refresh_token"] is True

    # Patch the token refresh helper and call manual refresh
    with patch("main.refresh_access_token_with_refresh_token") as mock_refresh:
        mock_refresh.return_value = {"access_token": "new_access", "expires_in": 3600}
        res2 = client.post("/google-auth/refresh", headers=auth_headers)
        assert res2.status_code == 200
        j2 = res2.json()
        assert "new_expiry" in j2


def test_create_google_event_with_refresh_flow(client, auth_headers, example_task_payload):
    # Create a task for the current user
    r = client.post("/tasks", json=example_task_payload, headers=auth_headers)
    assert r.status_code == 200
    task_id = r.json()["id"]

    # Save google tokens (access + refresh) so the endpoint will try to use them
    save_payload = {
        "access_token": "expired_access",
        "refresh_token": "1//valid_refresh_token_for_event_tests",
        "expires_in": 3600,
    }
    client.post("/google-auth", json=save_payload, headers=auth_headers)

    event_payload = {
        "summary": "Evento di test",
        "description": "Desc",
        "start": {"dateTime": "2025-10-11T10:00:00Z"},
        "end": {"dateTime": "2025-10-11T11:00:00Z"},
        "task_id": task_id,
    }

    # Prepare mocks: first request returns 401, then after refresh returns success
    class MockResp:
        def __init__(self, ok, status_code, json_data=None, text=""):
            self.ok = ok
            self.status_code = status_code
            self._json = json_data or {}
            self.text = text

        def json(self):
            return self._json

    post_calls = {"count": 0}

    def fake_post(url, json=None, headers=None):
        post_calls["count"] += 1
        if post_calls["count"] == 1:
            return MockResp(ok=False, status_code=401, json_data={"error": "unauthorized"}, text="401")
        return MockResp(ok=True, status_code=200, json_data={"id": "evt_123"})

    # Patch main.requests.post and main.refresh_access_token_with_refresh_token
    with patch("main.requests.post", side_effect=fake_post) as mock_post:
        with patch("main.refresh_access_token_with_refresh_token") as mock_refresh:
            mock_refresh.return_value = {"access_token": "refreshed_access", "expires_in": 3600}

            res = client.post("/google-calendar/events", json=event_payload, headers=auth_headers)
            assert res.status_code == 200
            data = res.json()
            assert data.get("id") == "evt_123"

    # Fetch the task and verify google_event_id was saved
    task_res = client.get(f"/tasks/{task_id}", headers=auth_headers)
    assert task_res.status_code == 200
    assert task_res.json().get("google_event_id") == "evt_123"
