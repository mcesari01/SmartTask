"""Schemas for users, authentication tokens, and tasks."""

from datetime import datetime
from typing import Optional

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


    model_config = ConfigDict(from_attributes=True)

class TaskCompletedUpdate(BaseModel):
    """Schema for updating completion state of a task."""
    completed: bool
