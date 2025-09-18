"""Database models for the SmartTask application.

This module defines SQLAlchemy models for users and tasks.
"""
from sqlalchemy import Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from database.database import Base


class User(Base):  # pylint: disable=too-few-public-methods
    """User model representing application users.
    
    Attributes:
        id: Primary key for the user
        email: Unique email address for the user
        hashed_password: Hashed password for authentication
        auth_provider: Authentication provider (default: local)
        tasks: Relationship to associated tasks
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    auth_provider: Mapped[str] = mapped_column(String, default="local", nullable=False)
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="user")


class Task(Base):  # pylint: disable=too-few-public-methods
    """Task model representing user tasks.
    
    Attributes:
        id: Primary key for the task
        title: Title of the task
        description: Optional description of the task
        deadline: When the task is due
        priority: Priority level of the task (default: Medium)
        completed: Boolean flag for completion status (default: False)
        user_id: Foreign key to the user who owns this task
        user: Relationship to the owning user
    """
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    priority: Mapped[str] = mapped_column(String, default="Medium", nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    user: Mapped["User"] = relationship("User", back_populates="tasks")