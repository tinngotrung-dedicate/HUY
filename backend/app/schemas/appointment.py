from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    doctor_id: str
    child_id: str
    slot_id: str | None = None
    scheduled_at: str | None = None
    reason: str | None = None
    note: str | None = None


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    child_id: str | None = None
    slot_id: str | None = None
    scheduled_at: str
    status: str
    reason: str | None = None
    note: str | None = None
    created_at: str | None = None
    doctor_phone: str | None = None
