"""Database configuration and utilities."""
import os
from datetime import datetime
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Assicurati che il database sia nella directory corretta
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tasks.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Optional: create parent directory if missing
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Debug prints (you can remove these if verbose)
print(f"Database path: {DB_PATH}")
print(f"Database exists: {os.path.exists(DB_PATH)}")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    # Aggiungi queste opzioni per migliorare la persistenza
    pool_pre_ping=True,
    pool_recycle=300
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
