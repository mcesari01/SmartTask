from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc, case
from typing import List, Optional
from models import Task as TaskModel
from schemas.schemas import TaskCreate, TaskRead
from database.database import SessionLocal, engine, Base
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configura CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permetti tutte le origini (modifica se vuoi restringere)
    allow_credentials=True,
    allow_methods=["*"],  # Permetti tutti i metodi HTTP
    allow_headers=["*"],  # Permetti tutte le intestazioni
)

# Crea tabelle
Base.metadata.create_all(bind=engine)

# Dependency per ottenere una sessione DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/tasks", response_model=List[TaskRead])
def get_tasks(
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "asc",
        db: Session = Depends(get_db)
):
    query = db.query(TaskModel)

    if sort_by == "priority":
        # Definiamo l'ordine delle priorità (High > Medium > Low)
        priority_order = case(
            (TaskModel.priority == "High", 1),
            (TaskModel.priority == "Medium", 2),
            (TaskModel.priority == "Low", 3),
            else_=4
        )
        # Ordiniamo prima per priorità e poi per scadenza
        query = query.order_by(priority_order if sort_order == "asc" else desc(priority_order))
        query = query.order_by(TaskModel.deadline if sort_order == "asc" else desc(TaskModel.deadline))
    else:
        query = query.order_by(TaskModel.id)

    return query.all()

@app.post("/tasks", response_model=TaskRead)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = TaskModel(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.get("/tasks/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.put("/tasks/{task_id}", response_model=TaskRead)
def update_task(task_id: int, updated_task: TaskCreate, db: Session = Depends(get_db)):
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in updated_task.model_dump().items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"detail": "Task deleted"}