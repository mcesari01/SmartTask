import datetime
from pydantic import ValidationError
from schemas.schemas import TaskCreate


def test_task_schema_valid():
    payload = {
        "title": "Title",
        "description": None,
        "deadline": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1),
        "priority": "High",
    }
    task = TaskCreate(**payload)
    assert task.title == "Title"


def test_task_schema_invalid_deadline():
    payload = {"title": "X", "deadline": "not-a-date"}
    try:
        TaskCreate(**payload)
        assert False, "Expected ValidationError"
    except ValidationError:
        pass


def test_task_schema_default_priority():
    task = TaskCreate(title="A", description=None, deadline=datetime.datetime.now(datetime.timezone.utc))
    assert task.priority == "Medium"


