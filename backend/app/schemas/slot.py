from pydantic import BaseModel


class TimeSlotCreate(BaseModel):
    start_time: str
    end_time: str
    duration: int | None = None
    slot_type: str = "working"
    is_active: bool = True


class TimeSlotUpdate(BaseModel):
    start_time: str | None = None
    end_time: str | None = None
    duration: int | None = None
    slot_type: str | None = None
    is_active: bool | None = None


class TimeSlotOut(BaseModel):
    id: str
    start_time: str
    end_time: str
    duration: int | None = None
    slot_type: str
    created_by: str | None = None
    is_active: bool
    created_at: str | None = None
