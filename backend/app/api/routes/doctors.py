from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.doctor import DoctorProfile
from app.schemas.doctor import DoctorOut
from app.core.security import get_current_user

router = APIRouter(prefix="/doctors", tags=["doctors"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[DoctorOut])
def list_doctors(user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(DoctorProfile).filter(
        DoctorProfile.verified == True,
        (DoctorProfile.status == "approved") | (DoctorProfile.status == None),
    ).all()
    return [DoctorOut(**r.__dict__) for r in rows]
