from pydantic import BaseModel


class BookingLockCreate(BaseModel):
    slot_id: str
    doctor_id: str | None = None
    expires_in_minutes: int = 5


class BookingLockOut(BaseModel):
    id: str
    slot_id: str
    doctor_id: str | None = None
    locked_by_user: str
    expires_at: str
    created_at: str | None = None
