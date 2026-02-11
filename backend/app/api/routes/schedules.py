from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user, require_role
from app.db import SessionLocal
from app.models.doctor_schedule import DoctorSchedule
from app.models.time_slot import TimeSlot
from app.schemas.schedule import DoctorScheduleCreate, DoctorScheduleUpdate, DoctorScheduleOut
from app.schemas.slot import TimeSlotOut
from app.utils.audit import log_activity

router = APIRouter(prefix="/schedules", tags=["schedules"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[DoctorScheduleOut])
def list_all(admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.query(DoctorSchedule).all()
    return [DoctorScheduleOut(**r.__dict__) for r in rows]


@router.get("/my", response_model=list[DoctorScheduleOut])
def my_schedules(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = db.query(DoctorSchedule).filter(DoctorSchedule.doctor_id == user.get("sub")).all()
    return [DoctorScheduleOut(**r.__dict__) for r in rows]


@router.get("/doctor/{doctor_id}", response_model=list[DoctorScheduleOut])
def doctor_availability(doctor_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(DoctorSchedule, TimeSlot)
        .join(TimeSlot, DoctorSchedule.slot_id == TimeSlot.id)
        .filter(
            DoctorSchedule.doctor_id == doctor_id,
            DoctorSchedule.status == "available",
            TimeSlot.is_active == True,
        )
        .all()
    )
    result: list[DoctorScheduleOut] = []
    for schedule, slot in rows:
        out = DoctorScheduleOut(**schedule.__dict__)
        out.slot = TimeSlotOut(**slot.__dict__)
        result.append(out)
    return result


@router.post("", response_model=DoctorScheduleOut)
def create_schedule(payload: DoctorScheduleCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    doctor_id = payload.doctor_id if user.get("role") == "admin" and payload.doctor_id else user.get("sub")
    slot = db.query(TimeSlot).filter(TimeSlot.id == payload.slot_id, TimeSlot.is_active == True).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    existing = db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id == doctor_id,
        DoctorSchedule.slot_id == payload.slot_id,
    ).first()
    if existing:
        return DoctorScheduleOut(**existing.__dict__)
    schedule = DoctorSchedule(
        doctor_id=doctor_id,
        slot_id=payload.slot_id,
        status=payload.status,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    if user.get("role") == "admin":
        log_activity(db, user["sub"], "schedule_created", f"doctor_id={doctor_id},slot_id={payload.slot_id}")
    return DoctorScheduleOut(**schedule.__dict__)


@router.patch("/{schedule_id}/status", response_model=DoctorScheduleOut)
def update_schedule_status(schedule_id: str, payload: DoctorScheduleUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    schedule = db.query(DoctorSchedule).filter(DoctorSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if user.get("role") == "doctor" and schedule.doctor_id != user.get("sub"):
        raise HTTPException(status_code=403, detail="Forbidden")
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    schedule.status = payload.status
    db.commit()
    db.refresh(schedule)
    if user.get("role") == "admin":
        log_activity(db, user["sub"], "schedule_status_updated", f"schedule_id={schedule_id},status={payload.status}")
    return DoctorScheduleOut(**schedule.__dict__)
