from pydantic import BaseModel


class DoctorAssignmentCreate(BaseModel):
    doctor_id: str
    child_id: str


class DoctorAssignmentOut(BaseModel):
    id: str
    doctor_id: str
    child_id: str
    assigned_by: str | None = None
    created_at: str | None = None
