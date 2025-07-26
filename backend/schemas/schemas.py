from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime
    priority: Optional[str] = "Medium"

class TaskCreate(TaskBase):
    pass

class TaskRead(TaskBase):
    id: int

    class Config:
        orm_mode = True