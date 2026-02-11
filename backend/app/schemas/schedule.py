from pydantic import BaseModel
from app.schemas.slot import TimeSlotOut


class DoctorScheduleCreate(BaseModel):
    slot_id: str
    doctor_id: str | None = None
    status: str = "available"


class DoctorScheduleUpdate(BaseModel):
    status: str


class DoctorScheduleOut(BaseModel):
    id: str
    doctor_id: str
    slot_id: str
    status: str
    created_at: str | None = None
    slot: TimeSlotOut | None = None
