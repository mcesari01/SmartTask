"""Main application file for the SmartTask backend."""

from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import case, desc
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    get_current_user,
    get_db,
    get_password_hash,
    verify_password,
    verify_google_id_token_and_get_email,
)
from database.database import Base, engine
from models import Task as TaskModel, User
from schemas.schemas import TaskCreate, TaskRead, Token, UserCreate, UserRead
from pydantic import BaseModel

app = FastAPI()

# Configura CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Restringi al frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crea tabelle
# Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

@app.post("/register", response_model=UserRead)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Registers a new user."""
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticates a user and returns an access token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


class GoogleAuthPayload(BaseModel):
    credential: str


@app.post("/auth/google", response_model=Token)
def google_auth(payload: GoogleAuthPayload, db: Session = Depends(get_db)):
    """Login/Register via Google ID token. Creates user if not exists, then issues JWT."""
    email = verify_google_id_token_and_get_email(payload.credential)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password="")
        db.add(user)
        db.commit()
        db.refresh(user)
    access_token = create_access_token(data={"sub": email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/tasks", response_model=List[TaskRead])
def get_tasks(
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = "asc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves tasks for the current user, with optional sorting."""
    query = db.query(TaskModel).filter(TaskModel.user_id == current_user.id)
    if sort_by == "priority":
        priority_order = case(
            (TaskModel.priority == "High", 1),
            (TaskModel.priority == "Medium", 2),
            (TaskModel.priority == "Low", 3),
            else_=4
        )
        # Apply compound sorting: first by priority, then by deadline as secondary sort
        if sort_order == "asc":
            query = query.order_by(priority_order, TaskModel.deadline)
        else:
            query = query.order_by(desc(priority_order), desc(TaskModel.deadline))
    else:
        query = query.order_by(TaskModel.id)
    return query.all()

@app.post("/tasks", response_model=TaskRead)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates a new task for the current user."""
    db_task = TaskModel(**task.model_dump(), user_id=current_user.id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/tasks/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves a specific task by ID for the current user."""
    task = db.query(TaskModel).filter(
        TaskModel.id == task_id, TaskModel.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not authorized")
    return task

@app.put("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    updated_task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates an existing task by ID for the current user."""
    task = db.query(TaskModel).filter(
        TaskModel.id == task_id, TaskModel.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not authorized")
    for key, value in updated_task.model_dump().items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task

@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes a task by ID for the current user."""
    task = db.query(TaskModel).filter(
        TaskModel.id == task_id, TaskModel.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or not authorized")
    db.delete(task)
    db.commit()
    return {"detail": "Task deleted"}
