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


def test_sort_and_filter_completion_and_insertion_order(client, auth_headers):
    now = datetime.datetime.now(datetime.timezone.utc)
    # Create 3 tasks
    ids = []
    for title in ["T1", "T2", "T3"]:
        res = client.post(
            "/tasks",
            json={
                "title": title,
                "description": None,
                "deadline": (now + datetime.timedelta(hours=1)).isoformat(),
                "priority": "Medium",
            },
            headers=auth_headers,
        )
        ids.append(res.json()["id"])  # insertion order

    # Mark T2 as completed
    client.patch(f"/tasks/{ids[1]}/completed", json={"completed": True}, headers=auth_headers)

    # Filter only completed
    res_completed = client.get("/tasks", headers=auth_headers, params={"completed": "true"})
    assert res_completed.status_code == 200
    data_completed = res_completed.json()
    assert len(data_completed) == 1 and data_completed[0]["id"] == ids[1]

    # Filter only active
    res_active = client.get("/tasks", headers=auth_headers, params={"completed": "false"})
    assert res_active.status_code == 200
    data_active = res_active.json()
    assert [t["id"] for t in data_active] == [ids[0], ids[2]]

    # Sort insertion desc
    res_desc = client.get("/tasks", headers=auth_headers, params={"sort_by": "insertion", "sort_order": "desc"})
    assert res_desc.status_code == 200
    data_desc = res_desc.json()
    assert [t["id"] for t in data_desc] == list(reversed(ids))

    # Sort by deadline asc
    res_deadline = client.get("/tasks", headers=auth_headers, params={"sort_by": "deadline", "sort_order": "asc"})
    assert res_deadline.status_code == 200
    data_deadline = res_deadline.json()
    assert all(data_deadline[i]["deadline"] <= data_deadline[i+1]["deadline"] for i in range(len(data_deadline)-1))


