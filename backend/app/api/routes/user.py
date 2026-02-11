from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.core.security import get_current_user
from app.db import SessionLocal
from app.models.user import User
from app.models.settings import UserSettings
from app.models.notifications import Notification
from app.models.activities import Activity
from app.utils.password import hash_password, verify_password
from app.schemas.user import (
    ProfileOut,
    ProfileUpdate,
    PasswordChange,
    SettingsOut,
    SettingsUpdate,
    NotificationOut,
    ActivityOut,
)
from app.schemas.password import ForgotRequest, ResetRequest
from app.models.security import PasswordReset
from app.utils.emailer import send_email
from app.models.doctor import DoctorProfile
from app.schemas.doctor import DoctorOut


router = APIRouter(prefix="/me", tags=["me"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_settings(db: Session, user_id: str) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=ProfileOut)
def get_profile(user=Depends(get_current_user), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user["sub"]).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return ProfileOut(**u.__dict__)


@router.put("", response_model=ProfileOut)
def update_profile(payload: ProfileUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(User).filter(User.id == user["sub"])
    if not q.first():
        raise HTTPException(status_code=404, detail="User not found")
    data = payload.dict(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No changes")
    q.update(data)
    db.commit()
    u = q.first()
    return ProfileOut(**u.__dict__)


@router.put("/password")
def change_password(payload: PasswordChange, user=Depends(get_current_user), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user["sub"]).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(payload.current_password, u.password_hash):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    u.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "password_changed"}


@router.get("/settings", response_model=SettingsOut)
def get_settings(user=Depends(get_current_user), db: Session = Depends(get_db)):
    settings = _get_settings(db, user["sub"])
    return SettingsOut(**settings.__dict__)


@router.put("/settings", response_model=SettingsOut)
def update_settings(payload: SettingsUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    settings = _get_settings(db, user["sub"])
    data = payload.dict(exclude_none=True)
    for k, v in data.items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    return SettingsOut(**settings.__dict__)


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user["sub"])
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [NotificationOut(**r.__dict__) for r in rows]


@router.post("/notifications/clear")
def clear_notifications(user=Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user["sub"]).update({"read": True})
    db.commit()
    return {"status": "cleared"}


@router.get("/activity", response_model=list[ActivityOut])
def list_activity(user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Activity)
        .filter(Activity.user_id == user["sub"])
        .order_by(Activity.created_at.desc())
        .limit(50)
        .all()
    )
    return [ActivityOut(**r.__dict__) for r in rows]


@router.get("/doctor", response_model=DoctorOut)
def my_doctor_profile(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    doc = db.query(DoctorProfile).filter(DoctorProfile.user_id == user["sub"]).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return DoctorOut(**doc.__dict__)


@router.put("/doctor", response_model=DoctorOut)
def update_doctor_profile(payload: DoctorOut, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    doc = db.query(DoctorProfile).filter(DoctorProfile.user_id == user["sub"]).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    # only allow limited fields to update; keep verified status
    doc.full_name = payload.full_name
    doc.specialty = payload.specialty
    doc.hospital = payload.hospital
    doc.license_number = payload.license_number
    doc.bio = payload.bio
    if payload.consultation_fee is not None:
        doc.consultation_fee = payload.consultation_fee
    if payload.is_clinic is not None:
        doc.is_clinic = payload.is_clinic
    if payload.is_online is not None:
        doc.is_online = payload.is_online
    db.commit()
    db.refresh(doc)
    return DoctorOut(**doc.__dict__)


@router.post("/forgot")
def forgot_password(payload: ForgotRequest, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == payload.email).first()
    if not u:
        # avoid user enumeration
        return {"status": "ok"}
    token = str(uuid.uuid4())
    reset = PasswordReset(
        user_id=u.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1),
        used=False,
    )
    db.add(reset)
    db.commit()
    sent = send_email(
        to_email=u.email,
        subject="Password reset",
        body=f"Use this token to reset your password: {token}",
    )
    return {"status": "ok", "reset_token": token if not sent else None}


@router.post("/reset")
def reset_password(payload: ResetRequest, db: Session = Depends(get_db)):
    rec = (
        db.query(PasswordReset)
        .filter(PasswordReset.token == payload.token, PasswordReset.used == False)
        .first()
    )
    if not rec or rec.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == rec.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(payload.new_password)
    rec.used = True
    db.commit()
    return {"status": "password_reset"}
