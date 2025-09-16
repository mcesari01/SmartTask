def test_register_and_login_flow(client, user_credentials):
    res = client.post("/register", json=user_credentials)
    assert res.status_code == 200
    assert res.json()["email"] == user_credentials["email"]

    res_dup = client.post("/register", json=user_credentials)
    assert res_dup.status_code == 400

    res_login = client.post(
        "/login",
        data={"username": user_credentials["email"], "password": user_credentials["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res_login.status_code == 200
    data = res_login.json()
    assert "access_token" in data and data["token_type"] == "bearer"


def test_access_protected_without_token(client):
    res = client.get("/tasks")
    assert res.status_code == 401


