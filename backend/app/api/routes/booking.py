from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user, require_role
from app.db import SessionLocal
from app.models.booking_lock import BookingLock
from app.models.time_slot import TimeSlot
from app.schemas.booking import BookingLockCreate, BookingLockOut

router = APIRouter(prefix="/booking", tags=["booking"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/lock", response_model=BookingLockOut)
def create_lock(payload: BookingLockCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    slot = db.query(TimeSlot).filter(TimeSlot.id == payload.slot_id, TimeSlot.is_active == True).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    now = datetime.utcnow()
    db.query(BookingLock).filter(BookingLock.expires_at < now).delete()
    existing = db.query(BookingLock).filter(
        BookingLock.slot_id == payload.slot_id,
        BookingLock.expires_at > now,
    ).first()
    if existing and existing.locked_by_user != user.get("sub"):
        raise HTTPException(status_code=409, detail="Slot already locked")
    if existing:
        return BookingLockOut(**existing.__dict__)
    expires_at = now + timedelta(minutes=payload.expires_in_minutes)
    lock = BookingLock(
        slot_id=payload.slot_id,
        doctor_id=payload.doctor_id,
        locked_by_user=user.get("sub"),
        expires_at=expires_at,
    )
    db.add(lock)
    db.commit()
    db.refresh(lock)
    return BookingLockOut(**lock.__dict__)


@router.delete("/lock/{lock_id}")
def delete_lock(lock_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    lock = db.query(BookingLock).filter(BookingLock.id == lock_id).first()
    if not lock:
        raise HTTPException(status_code=404, detail="Lock not found")
    if user.get("role") != "admin" and lock.locked_by_user != user.get("sub"):
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(lock)
    db.commit()
    return {"status": "deleted"}
