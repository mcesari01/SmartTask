import datetime


def test_crud_task_flow(client, auth_headers):
    payload = {
        "title": "Task 1",
        "description": "desc",
        "deadline": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=2)).isoformat(),
        "priority": "High",
    }
    res = client.post("/tasks", json=payload, headers=auth_headers)
    assert res.status_code == 200
    task_id = res.json()["id"]

    res_list = client.get("/tasks", headers=auth_headers)
    assert res_list.status_code == 200
    assert any(t["id"] == task_id for t in res_list.json())

    res_single = client.get(f"/tasks/{task_id}", headers=auth_headers)
    assert res_single.status_code == 200

    updated = payload.copy()
    updated["title"] = "Task 1 updated"
    res_upd = client.put(f"/tasks/{task_id}", json=updated, headers=auth_headers)
    assert res_upd.status_code == 200
    assert res_upd.json()["title"] == "Task 1 updated"

    res_del = client.delete(f"/tasks/{task_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json()["detail"] == "Task deleted"


def test_sort_by_priority_then_deadline(client, auth_headers):
    now = datetime.datetime.now(datetime.timezone.utc)
    tasks = [
        {"title": "A", "description": None, "deadline": (now + datetime.timedelta(hours=3)).isoformat(), "priority": "Medium"},
        {"title": "B", "description": None, "deadline": (now + datetime.timedelta(hours=1)).isoformat(), "priority": "High"},
        {"title": "C", "description": None, "deadline": (now + datetime.timedelta(hours=2)).isoformat(), "priority": "High"},
    ]
    for t in tasks:
        client.post("/tasks", json=t, headers=auth_headers)

    res = client.get("/tasks", headers=auth_headers, params={"sort_by": "priority", "sort_order": "asc"})
    assert res.status_code == 200
    data = res.json()
    assert data[0]["priority"] == "High"
    assert data[1]["priority"] == "High"
    assert data[2]["priority"] == "Medium"
    assert data[0]["deadline"] <= data[1]["deadline"]


