from pydantic import BaseModel


class DoctorCreate(BaseModel):
    email: str
    full_name: str
    specialty: str | None = None
    hospital: str | None = None
    license_number: str | None = None
    bio: str | None = None
    consultation_fee: float | None = None
    is_clinic: bool | None = None
    is_online: bool | None = None


class DoctorOut(BaseModel):
    id: str
    user_id: str
    full_name: str
    specialty: str | None = None
    hospital: str | None = None
    license_number: str | None = None
    bio: str | None = None
    consultation_fee: float | None = None
    is_clinic: bool | None = None
    is_online: bool | None = None
    status: str | None = None
    verified: bool | None = None
    approved_by: str | None = None
    approved_at: str | None = None
