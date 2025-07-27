import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.database import Base
from models import Task as TaskModel
from schemas import schemas
from main import app, get_db
import datetime

# ✅ Setup database di test (SQLite temporaneo)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"  # Usa `:memory:` se non vuoi un file

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)

# ✅ Crea tabelle nel database di test
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# ✅ Override della dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# 📌 Fixture di esempio
@pytest.fixture
def example_task():
    return {
        "title": "Test Task",
        "description": "Task di esempio",
        "deadline": (datetime.datetime.utcnow() + datetime.timedelta(days=3)).isoformat(),
        "priority": "High"
    }

# ✅ Test creazione task
def test_create_task(example_task):
    response = client.post("/tasks", json=example_task)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == example_task["title"]
    assert data["priority"] == example_task["priority"]

# ✅ Test lettura lista task
def test_read_tasks():
    response = client.get("/tasks")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# ✅ Test lettura singolo task
def test_read_single_task(example_task):
    response = client.post("/tasks", json=example_task)
    task_id = response.json()["id"]
    response = client.get(f"/tasks/{task_id}")
    assert response.status_code == 200
    assert response.json()["id"] == task_id

# ✅ Test aggiornamento task
def test_update_task(example_task):
    response = client.post("/tasks", json=example_task)
    task_id = response.json()["id"]
    updated = example_task.copy()
    updated["title"] = "Updated Title"
    response = client.put(f"/tasks/{task_id}", json=updated)
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"

# ✅ Test cancellazione task
def test_delete_task(example_task):
    response = client.post("/tasks", json=example_task)
    task_id = response.json()["id"]
    response = client.delete(f"/tasks/{task_id}")
    assert response.status_code == 200
    assert response.json()["detail"] == "Task deleted"

    # Verifica che il task non esista più
    response = client.get(f"/tasks/{task_id}")
    assert response.status_code == 404