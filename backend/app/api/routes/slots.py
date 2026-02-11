from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user, require_role
from app.db import SessionLocal
from app.models.time_slot import TimeSlot
from app.schemas.slot import TimeSlotCreate, TimeSlotUpdate, TimeSlotOut
from app.utils.audit import log_activity

router = APIRouter(prefix="/slots", tags=["slots"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _parse_dt(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid datetime format, use ISO") from exc


@router.get("", response_model=list[TimeSlotOut])
def list_slots(active_only: bool = True, user=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(TimeSlot)
    if active_only:
        q = q.filter(TimeSlot.is_active == True)
    rows = q.order_by(TimeSlot.start_time.asc()).all()
    return [TimeSlotOut(**r.__dict__) for r in rows]


@router.post("", response_model=TimeSlotOut)
def create_slot(payload: TimeSlotCreate, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    start = _parse_dt(payload.start_time)
    end = _parse_dt(payload.end_time)
    if end <= start:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")
    duration = payload.duration
    if duration is None:
        duration = int((end - start).total_seconds() / 60)
    slot = TimeSlot(
        start_time=start,
        end_time=end,
        duration=duration,
        slot_type=payload.slot_type,
        created_by=admin["sub"],
        is_active=payload.is_active,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    log_activity(db, admin["sub"], "slot_created", f"slot_id={slot.id}")
    return TimeSlotOut(**slot.__dict__)


@router.put("/{slot_id}", response_model=TimeSlotOut)
def update_slot(slot_id: str, payload: TimeSlotUpdate, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    slot = db.query(TimeSlot).filter(TimeSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    data = payload.dict(exclude_none=True)
    if "start_time" in data:
        data["start_time"] = _parse_dt(data["start_time"])
    if "end_time" in data:
        data["end_time"] = _parse_dt(data["end_time"])
    for k, v in data.items():
        setattr(slot, k, v)
    db.commit()
    db.refresh(slot)
    log_activity(db, admin["sub"], "slot_updated", f"slot_id={slot.id}")
    return TimeSlotOut(**slot.__dict__)


@router.delete("/{slot_id}")
def delete_slot(slot_id: str, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    slot = db.query(TimeSlot).filter(TimeSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot.is_active = False
    db.commit()
    log_activity(db, admin["sub"], "slot_deactivated", f"slot_id={slot.id}")
    return {"status": "deactivated"}
