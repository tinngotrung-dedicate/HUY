from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import require_role
from app.db import SessionLocal
from app.models.cancellation_policy import CancellationPolicy
from app.schemas.policy import CancellationPolicyCreate, CancellationPolicyOut

router = APIRouter(prefix="/policies", tags=["policies"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[CancellationPolicyOut])
def list_policies(db: Session = Depends(get_db)):
    rows = db.query(CancellationPolicy).all()
    return [CancellationPolicyOut(**r.__dict__) for r in rows]


@router.post("", response_model=CancellationPolicyOut)
def create_policy(payload: CancellationPolicyCreate, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    policy = CancellationPolicy(
        min_hours_before=payload.min_hours_before,
        fee_percent=payload.fee_percent,
        applies_to=payload.applies_to,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return CancellationPolicyOut(**policy.__dict__)


@router.put("/{policy_id}", response_model=CancellationPolicyOut)
def update_policy(policy_id: str, payload: CancellationPolicyCreate, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    policy = db.query(CancellationPolicy).filter(CancellationPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    policy.min_hours_before = payload.min_hours_before
    policy.fee_percent = payload.fee_percent
    policy.applies_to = payload.applies_to
    db.commit()
    db.refresh(policy)
    return CancellationPolicyOut(**policy.__dict__)


@router.delete("/{policy_id}")
def delete_policy(policy_id: str, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    policy = db.query(CancellationPolicy).filter(CancellationPolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    db.delete(policy)
    db.commit()
    return {"status": "deleted"}
