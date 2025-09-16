import time
import datetime
from jose import jwt
from auth import SECRET_KEY, ALGORITHM


def test_invalid_token_is_rejected(client):
    headers = {"Authorization": "Bearer invalid.token.value"}
    res = client.get("/tasks", headers=headers)
    assert res.status_code == 401


def test_expired_token_is_rejected(client, user_credentials):
    payload = {"sub": user_credentials["email"], "exp": int(time.time()) - 10}
    expired = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    res = client.get("/tasks", headers={"Authorization": f"Bearer {expired}"})
    assert res.status_code == 401


def test_rate_simple_performance(client, auth_headers):
    start = time.time()
    for _ in range(10):
        res = client.get("/tasks", headers=auth_headers)
        assert res.status_code == 200
    elapsed = time.time() - start
    assert elapsed < 2.0


def test_payload_size_limits(client, auth_headers):
    long_title = "T" * 1000
    long_desc = "D" * 5000
    payload = {
        "title": long_title,
        "description": long_desc,
        "deadline": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat(),
        "priority": "Low",
    }
    res = client.post("/tasks", json=payload, headers=auth_headers)
    assert res.status_code in (200, 422)
