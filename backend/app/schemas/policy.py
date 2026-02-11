from pydantic import BaseModel


class CancellationPolicyCreate(BaseModel):
    min_hours_before: int
    fee_percent: float
    applies_to: str


class CancellationPolicyOut(BaseModel):
    id: str
    min_hours_before: int
    fee_percent: float
    applies_to: str
    created_at: str | None = None
