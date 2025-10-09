"""Schemas for users, authentication tokens, and tasks."""

from datetime import datetime
from typing import Optional, Dict, Any

from pydantic import BaseModel, EmailStr, ConfigDict


# User Schemas
class UserCreate(BaseModel):
    """Schema for user creation."""
    email: EmailStr
    password: str


class UserRead(BaseModel):
    """Schema for reading user data."""
    id: int
    email: EmailStr
    # Expose the google_access_token for frontend checks (you can change to boolean if desired)
    google_access_token: Optional[str] = None
    google_connected: bool = False

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Schema for authentication tokens."""
    access_token: str
    token_type: str


# Task Schemas
class TaskBase(BaseModel):
    """Base schema for tasks."""
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = "Medium"
    completed: Optional[bool] = False


class TaskCreate(TaskBase):
    """Schema for task creation."""
    pass


class TaskRead(TaskBase):
    """Schema for reading task data."""
    id: int
    user_id: int
    google_event_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TaskCompletedUpdate(BaseModel):
    """Schema for updating completion state of a task."""
    completed: bool


# Google / Calendar related schemas
class GoogleSaveToken(BaseModel):
    """Payload for saving Google OAuth tokens from frontend."""
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None  # seconds


class CalendarEventDateTime(BaseModel):
    dateTime: str
    timeZone: Optional[str] = "Europe/Rome"


class CalendarEventCreate(BaseModel):
    summary: str
    description: Optional[str] = None
    start: CalendarEventDateTime
    end: CalendarEventDateTime
    task_id: Optional[int] = None
    # optional: allow passing access_token in body (fallback)
    access_token: Optional[str] = None
