from datetime import date
from pydantic import BaseModel


class ChildCreate(BaseModel):
    full_name: str
    birth_date: date | None = None
    gender: str | None = None
    address: str | None = None


class ChildUpdate(BaseModel):
    full_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    address: str | None = None


class ChildOut(BaseModel):
    id: str
    user_id: str
    full_name: str
    birth_date: date | None = None
    gender: str | None = None
    address: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
