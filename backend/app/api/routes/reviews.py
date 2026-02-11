from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import require_role
from app.db import SessionLocal
from app.models.admin_review import AdminReview
from app.models.doctor import DoctorProfile
from app.schemas.review import AdminReviewCreate, AdminReviewOut
from app.utils.audit import log_activity

router = APIRouter(prefix="/reviews", tags=["reviews"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[AdminReviewOut])
def list_reviews(doctor_id: str | None = None, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    q = db.query(AdminReview)
    if doctor_id:
        q = q.filter(AdminReview.doctor_id == doctor_id)
    rows = q.order_by(AdminReview.created_at.desc()).all()
    return [AdminReviewOut(**r.__dict__) for r in rows]


@router.post("", response_model=AdminReviewOut)
def create_review(payload: AdminReviewCreate, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    doc = db.query(DoctorProfile).filter(DoctorProfile.user_id == payload.doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    review = AdminReview(
        doctor_id=payload.doctor_id,
        admin_id=admin["sub"],
        decision=payload.decision,
        note=payload.note,
    )
    if payload.decision == "approve":
        doc.status = "approved"
        doc.verified = True
    elif payload.decision == "reject":
        doc.status = "rejected"
        doc.verified = False
    else:
        doc.status = "need_more"
    db.add(review)
    log_activity(db, admin["sub"], "admin_review", f"doctor_id={payload.doctor_id},decision={payload.decision}")
    db.commit()
    db.refresh(review)
    return AdminReviewOut(**review.__dict__)
