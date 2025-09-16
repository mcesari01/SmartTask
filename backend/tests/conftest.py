import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app, get_db  # type: ignore
from database.database import Base  # type: ignore


TEST_DB_URL = "sqlite:///./test_suite.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_tasks():
    """Clear tasks from the database before each test to prevent test interference."""
    db = TestingSessionLocal()
    try:
        # Only clear tasks, not users (users are needed for auth)
        from models import Task
        db.query(Task).delete()
        db.commit()
    finally:
        db.close()


@pytest.fixture()
def user_credentials():
    return {"email": "testuser@example.com", "password": "testpassword"}


@pytest.fixture()
def second_user_credentials():
    return {"email": "second@example.com", "password": "secondpass"}


@pytest.fixture()
def auth_headers(client, user_credentials):
    client.post("/register", json=user_credentials)
    res = client.post(
        "/login",
        data={"username": user_credentials["email"], "password": user_credentials["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def second_user_auth_headers(client, second_user_credentials):
    client.post("/register", json=second_user_credentials)
    res = client.post(
        "/login",
        data={"username": second_user_credentials["email"], "password": second_user_credentials["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def example_task_payload():
    import datetime
    return {
        "title": "Task di esempio",
        "description": "Descrizione",
        "deadline": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)).isoformat(),
        "priority": "Medium",
    }


