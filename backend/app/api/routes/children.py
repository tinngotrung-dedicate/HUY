from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.security import get_current_user
from app.db import SessionLocal
from app.models.child import Child
from app.models.intake import Intake
from app.models.doctor_assignment import DoctorAssignment
from app.schemas.child import ChildCreate, ChildUpdate, ChildOut
from app.schemas.intake import IntakeUpsert, IntakeOut

router = APIRouter(prefix="/children", tags=["children"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _can_access_child(db: Session, child: Child, user: dict) -> bool:
    if user.get("role") == "admin":
        return True
    if child.user_id == user.get("sub"):
        return True
    if user.get("role") == "doctor":
        return db.query(DoctorAssignment).filter(
            DoctorAssignment.doctor_id == user.get("sub"),
            DoctorAssignment.child_id == child.id,
        ).first() is not None
    return False


@router.get("", response_model=list[ChildOut])
def list_children(user_id: str | None = None, user=Depends(get_current_user), db: Session = Depends(get_db)):
    role = user.get("role")
    if role == "admin" and user_id:
        rows = db.query(Child).filter(Child.user_id == user_id).all()
    elif role == "doctor":
        child_ids = [r.child_id for r in db.query(DoctorAssignment).filter(DoctorAssignment.doctor_id == user.get("sub")).all()]
        if not child_ids:
            return []
        rows = db.query(Child).filter(Child.id.in_(child_ids)).all()
    else:
        rows = db.query(Child).filter(Child.user_id == user.get("sub")).all()
    return [ChildOut(**r.__dict__) for r in rows]


@router.post("", response_model=ChildOut)
def create_child(payload: ChildCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    owner_id = user.get("sub")
    child = Child(
        user_id=owner_id,
        full_name=payload.full_name,
        birth_date=payload.birth_date,
        gender=payload.gender,
        address=payload.address,
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    return ChildOut(**child.__dict__)


@router.get("/{child_id}", response_model=ChildOut)
def get_child(child_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(db, child, user):
        raise HTTPException(status_code=403, detail="Forbidden")
    return ChildOut(**child.__dict__)


@router.put("/{child_id}", response_model=ChildOut)
def update_child(child_id: str, payload: ChildUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(db, child, user):
        raise HTTPException(status_code=403, detail="Forbidden")
    data = payload.dict(exclude_none=True)
    for k, v in data.items():
        setattr(child, k, v)
    child.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(child)
    return ChildOut(**child.__dict__)


@router.delete("/{child_id}")
def delete_child(child_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if user.get("role") != "admin" and child.user_id != user.get("sub"):
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(child)
    db.commit()
    return {"status": "deleted"}


@router.get("/{child_id}/intake", response_model=IntakeOut)
def get_intake(child_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(db, child, user):
        raise HTTPException(status_code=403, detail="Forbidden")
    intake = db.query(Intake).filter(Intake.child_id == child_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")
    return IntakeOut(**intake.__dict__)


@router.put("/{child_id}/intake", response_model=IntakeOut)
def upsert_intake(child_id: str, payload: IntakeUpsert, user=Depends(get_current_user), db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if user.get("role") != "admin" and child.user_id != user.get("sub"):
        raise HTTPException(status_code=403, detail="Forbidden")
    intake = db.query(Intake).filter(Intake.child_id == child_id).first()
    data = payload.dict(exclude_none=True)
    if not intake:
        intake = Intake(child_id=child_id, **data)
        db.add(intake)
    else:
        for k, v in data.items():
            setattr(intake, k, v)
        intake.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(intake)
    return IntakeOut(**intake.__dict__)
