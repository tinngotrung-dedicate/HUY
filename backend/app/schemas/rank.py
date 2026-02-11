from pydantic import BaseModel


class DoctorRankUpsert(BaseModel):
    doctor_id: str
    level: str
    score: float | None = None
    computed_from: str | None = None


class DoctorRankOut(BaseModel):
    id: str
    doctor_id: str
    level: str
    score: float | None = None
    computed_from: str | None = None
    updated_at: str | None = None


class RankRuleCreate(BaseModel):
    name: str
    weight: float = 1.0
    condition_json: str | None = None
    is_active: bool = True


class RankRuleOut(BaseModel):
    id: str
    name: str
    weight: float
    condition_json: str | None = None
    is_active: bool
    created_at: str | None = None
