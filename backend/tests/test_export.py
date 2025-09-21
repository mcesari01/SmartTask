"""Tests for export functionality."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models import Task, User
from main import app
from auth import create_access_token


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


def test_export_csv_unauthorized(client):
    """Test CSV export without authentication."""
    response = client.get("/tasks/export/csv")
    assert response.status_code == 401


def test_export_csv_success(client):
    """Test successful CSV export."""
    import uuid
    unique_email = f"csv_{uuid.uuid4().hex[:8]}@example.com"
    
    # Register and login user
    response = client.post("/register", json={
        "email": unique_email,
        "password": "testpassword"
    })
    assert response.status_code == 200
    
    login_response = client.post("/login", data={
        "username": unique_email,
        "password": "testpassword"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Create some tasks
    task_data = {
        "title": "Test Task 1",
        "description": "Test Description",
        "deadline": "2024-12-31T23:59:59",
        "priority": "High"
    }
    
    create_response = client.post(
        "/tasks",
        json=task_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert create_response.status_code == 200
    
    # Test CSV export
    response = client.get(
        "/tasks/export/csv",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "attachment; filename=tasks.csv" in response.headers["content-disposition"]
    
    # Check CSV content
    csv_content = response.content.decode('utf-8')
    lines = csv_content.strip().split('\n')
    assert len(lines) == 2  # Header + 1 task
    assert "ID,Title,Description,Deadline,Priority,Completed" in lines[0]
    assert "Test Task 1" in csv_content


def test_export_excel_unauthorized(client):
    """Test Excel export without authentication."""
    response = client.get("/tasks/export/excel")
    assert response.status_code == 401


def test_export_excel_success(client):
    """Test successful Excel export."""
    import uuid
    unique_email = f"excel_{uuid.uuid4().hex[:8]}@example.com"
    
    # Register and login user
    response = client.post("/register", json={
        "email": unique_email,
        "password": "testpassword"
    })
    assert response.status_code == 200
    
    login_response = client.post("/login", data={
        "username": unique_email,
        "password": "testpassword"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Test Excel export
    response = client.get(
        "/tasks/export/excel",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers["content-type"]
    assert "attachment; filename=tasks.xlsx" in response.headers["content-disposition"]
    assert len(response.content) > 0  # Should have some content


def test_export_pdf_unauthorized(client):
    """Test PDF export without authentication."""
    response = client.get("/tasks/export/pdf")
    assert response.status_code == 401


def test_export_pdf_success(client):
    """Test successful PDF export."""
    import uuid
    unique_email = f"pdf_{uuid.uuid4().hex[:8]}@example.com"
    
    # Register and login user
    response = client.post("/register", json={
        "email": unique_email,
        "password": "testpassword"
    })
    assert response.status_code == 200
    
    login_response = client.post("/login", data={
        "username": unique_email,
        "password": "testpassword"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Test PDF export
    response = client.get(
        "/tasks/export/pdf",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=tasks.pdf" in response.headers["content-disposition"]
    assert len(response.content) > 0  # Should have some content


def test_export_empty_tasks(client):
    """Test export when user has no tasks."""
    import uuid
    unique_email = f"empty_{uuid.uuid4().hex[:8]}@example.com"
    
    # Register and login user
    response = client.post("/register", json={
        "email": unique_email,
        "password": "testpassword"
    })
    assert response.status_code == 200
    
    login_response = client.post("/login", data={
        "username": unique_email,
        "password": "testpassword"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Test CSV export with no tasks
    response = client.get(
        "/tasks/export/csv",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    csv_content = response.content.decode('utf-8')
    lines = csv_content.strip().split('\n')
    assert len(lines) == 1  # Only header
    assert "ID,Title,Description,Deadline,Priority,Completed" in lines[0]
