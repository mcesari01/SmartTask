import sys
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.database import Base
from models import Task as TaskModel
from schemas import schemas
from main import app, get_db
import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_headers():
    email = "testuser@example.com"
    password = "testpassword"
    client.post("/register", json={"email": email, "password": password})
    res = client.post(
        "/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def example_task():
    return {
        "title": "Test Task",
        "description": "Task di esempio",
        "deadline": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3)).isoformat(),
        "priority": "High"
    }

def test_create_task(example_task, auth_headers):
    response = client.post("/tasks", json=example_task, headers=auth_headers)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["title"] == example_task["title"]
    assert data["priority"] == example_task["priority"]

def test_read_tasks(auth_headers):
    response = client.get("/tasks", headers=auth_headers)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)

def test_read_single_task(example_task, auth_headers):
    response = client.post("/tasks", json=example_task, headers=auth_headers)
    assert response.status_code == 200, response.text
    task_id = response.json()["id"]
    response = client.get(f"/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 200, response.text
    assert response.json()["id"] == task_id

def test_update_task(example_task, auth_headers):
    response = client.post("/tasks", json=example_task, headers=auth_headers)
    assert response.status_code == 200, response.text
    task_id = response.json()["id"]
    updated = example_task.copy()
    updated["title"] = "Updated Title"
    response = client.put(f"/tasks/{task_id}", json=updated, headers=auth_headers)
    assert response.status_code == 200, response.text
    assert response.json()["title"] == "Updated Title"

def test_delete_task(example_task, auth_headers):
    response = client.post("/tasks", json=example_task, headers=auth_headers)
    assert response.status_code == 200, response.text
    task_id = response.json()["id"]
    response = client.delete(f"/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 200, response.text
    assert response.json()["detail"] == "Task deleted"

    response = client.get(f"/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 404



@pytest.fixture(scope="module")
def second_user_auth_headers():
    email = "seconduser@example.com"
    password = "secondpassword"
    client.post("/register", json={"email": email, "password": password})
    res = client.post(
        "/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_register_existing_email(auth_headers):
    res = client.post("/register", json={"email": "testuser@example.com", "password": "any"})
    assert res.status_code == 400
    assert "already registered" in res.json().get("detail", "").lower()

def test_login_wrong_credentials():
    res = client.post(
        "/login",
        data={"username": "nonexistent@example.com", "password": "wrong"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res.status_code == 401

    res2 = client.post(
        "/login",
        data={"username": "testuser@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert res2.status_code == 401

def test_access_tasks_without_token():
    res = client.get("/tasks")
    assert res.status_code == 401

def test_create_task_invalid_data(auth_headers):
    invalid_task = {
        "description": "No title",
        "deadline": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat(),
        "priority": "High"
    }
    res = client.post("/tasks", json=invalid_task, headers=auth_headers)
    assert res.status_code == 422

    invalid_task2 = {
        "title": "Task con deadline errata",
        "description": "desc",
        "deadline": "not-a-date",
        "priority": "Medium"
    }
    res2 = client.post("/tasks", json=invalid_task2, headers=auth_headers)
    assert res2.status_code == 422

def test_update_nonexistent_task(auth_headers):
    res = client.put("/tasks/9999999", json={
        "title": "New title",
        "description": "desc",
        "deadline": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat(),
        "priority": "Low"
    }, headers=auth_headers)
    assert res.status_code == 404

def test_delete_nonexistent_task(auth_headers):
    res = client.delete("/tasks/9999999", headers=auth_headers)
    assert res.status_code == 404

def test_user_cannot_access_others_task(auth_headers, second_user_auth_headers, example_task):
    res1 = client.post("/tasks", json=example_task, headers=auth_headers)
    assert res1.status_code == 200
    task_id = res1.json()["id"]

    res2 = client.get(f"/tasks/{task_id}", headers=second_user_auth_headers)
    assert res2.status_code == 404

    updated = example_task.copy()
    updated["title"] = "Hack attempt"
    res3 = client.put(f"/tasks/{task_id}", json=updated, headers=second_user_auth_headers)
    assert res3.status_code == 404

    res4 = client.delete(f"/tasks/{task_id}", headers=second_user_auth_headers)
    assert res4.status_code == 404