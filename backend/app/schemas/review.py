from pydantic import BaseModel


class AdminReviewCreate(BaseModel):
    doctor_id: str
    decision: str  # approve|reject|need_more
    note: str | None = None


class AdminReviewOut(BaseModel):
    id: str
    doctor_id: str
    admin_id: str | None = None
    decision: str
    note: str | None = None
    created_at: str | None = None
