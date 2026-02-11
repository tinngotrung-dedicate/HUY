from pydantic import BaseModel


class DoctorCredentialCreate(BaseModel):
    type: str
    title: str
    issuer: str | None = None
    issue_date: str | None = None
    expiry_date: str | None = None
    doc_url: str | None = None


class DoctorCredentialOut(BaseModel):
    id: str
    doctor_id: str
    type: str
    title: str
    issuer: str | None = None
    issue_date: str | None = None
    expiry_date: str | None = None
    doc_url: str | None = None
    verification_status: str
    created_at: str | None = None


class DoctorCredentialVerify(BaseModel):
    verification_status: str
