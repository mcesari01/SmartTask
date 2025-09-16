"""Database models for the SmartTask application.

This module defines SQLAlchemy models for users and tasks.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database.database import Base


class User(Base):  # pylint: disable=too-few-public-methods
    """User model representing application users.
    
    Attributes:
        id: Primary key for the user
        email: Unique email address for the user
        hashed_password: Hashed password for authentication
        tasks: Relationship to associated tasks
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    tasks = relationship("Task", back_populates="user")


class Task(Base):  # pylint: disable=too-few-public-methods
    """Task model representing user tasks.
    
    Attributes:
        id: Primary key for the task
        title: Title of the task
        description: Optional description of the task
        deadline: When the task is due
        priority: Priority level of the task (default: Medium)
        user_id: Foreign key to the user who owns this task
        user: Relationship to the owning user
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    deadline = Column(DateTime)
    priority = Column(String, default="Medium")
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="tasks")
