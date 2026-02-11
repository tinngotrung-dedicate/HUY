from pydantic import BaseModel


class IntakeUpsert(BaseModel):
    admission_date: str | None = None
    admission_reason: str | None = None
    obstetric_history: str | None = None
    development_history: str | None = None
    nutrition_history: str | None = None
    immunization_history: str | None = None
    allergy_history: str | None = None
    pathology_history: str | None = None
    epidemiology_history: str | None = None
    family_history: str | None = None
    medical_history: str | None = None
    general_exam: str | None = None


class IntakeOut(IntakeUpsert):
    id: str
    child_id: str
    created_at: str | None = None
    updated_at: str | None = None
