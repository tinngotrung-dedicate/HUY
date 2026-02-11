from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user, require_role
from app.db import SessionLocal
from app.models.appointment import Appointment
from app.models.user import User
from app.models.child import Child
from app.models.doctor_assignment import DoctorAssignment
from app.models.time_slot import TimeSlot
from app.models.doctor_schedule import DoctorSchedule
from app.models.booking_lock import BookingLock
from app.models.notifications import Notification
from app.utils.audit import log_activity
from app.schemas.appointment import AppointmentCreate, AppointmentOut

router = APIRouter(prefix="/appointments", tags=["appointments"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=AppointmentOut)
def create_appointment(payload: AppointmentCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.get("role") not in ("user",):
        raise HTTPException(status_code=403, detail="Only user can book")
    doc = db.query(User).filter(User.id == payload.doctor_id, User.role == "doctor").first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    child = db.query(Child).filter(Child.id == payload.child_id, Child.user_id == user.get("sub")).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    slot = None
    if payload.slot_id:
        slot = db.query(TimeSlot).filter(TimeSlot.id == payload.slot_id, TimeSlot.is_active == True).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Slot not found")
        schedule = db.query(DoctorSchedule).filter(
            DoctorSchedule.doctor_id == payload.doctor_id,
            DoctorSchedule.slot_id == payload.slot_id,
        ).first()
        if not schedule or schedule.status != "available":
            raise HTTPException(status_code=409, detail="Slot not available")
        # prevent double booking
        existing = db.query(Appointment).filter(
            Appointment.slot_id == payload.slot_id,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Slot already booked")
        # check booking lock
        now = datetime.utcnow()
        lock = db.query(BookingLock).filter(
            BookingLock.slot_id == payload.slot_id,
            BookingLock.expires_at > now,
        ).first()
        if lock and lock.locked_by_user != user.get("sub"):
            raise HTTPException(status_code=409, detail="Slot locked by another user")
        when = slot.start_time
    else:
        if not payload.scheduled_at:
            raise HTTPException(status_code=400, detail="scheduled_at required if slot_id not provided")
        try:
            when = datetime.fromisoformat(payload.scheduled_at)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid datetime format, use ISO")
    appt = Appointment(
        patient_id=user["sub"],
        child_id=payload.child_id,
        doctor_id=payload.doctor_id,
        slot_id=payload.slot_id,
        scheduled_at=when,
        reason=payload.reason,
        note=payload.note,
        status="pending",
    )
    db.add(appt)
    if payload.slot_id:
        db.query(DoctorSchedule).filter(
            DoctorSchedule.doctor_id == payload.doctor_id,
            DoctorSchedule.slot_id == payload.slot_id,
        ).update({"status": "booked"})
        db.query(BookingLock).filter(
            BookingLock.slot_id == payload.slot_id,
            BookingLock.locked_by_user == user.get("sub"),
        ).delete()
    db.add(Notification(
        user_id=payload.doctor_id,
        type="booking",
        title="New appointment booked",
        body=f"New appointment requested by {user.get('email')}",
        sent_at=datetime.utcnow(),
    ))
    log_activity(db, user["sub"], "appointment_created", f"appointment_id={appt.id}")
    db.commit()
    db.refresh(appt)
    return AppointmentOut(**{**appt.__dict__, "doctor_phone": doc.phone})


@router.get("/my", response_model=list[AppointmentOut])
def my_appointments(child_id: str | None = None, user=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Appointment).filter(Appointment.patient_id == user["sub"])
    if child_id:
        q = q.filter(Appointment.child_id == child_id)
    rows = q.order_by(Appointment.scheduled_at.desc()).all()
    result = []
    for r in rows:
        doctor = db.query(User).filter(User.id == r.doctor_id).first()
        result.append(AppointmentOut(**{**r.__dict__, "doctor_phone": doctor.phone if doctor else None}))
    return result


@router.get("/doctor", response_model=list[AppointmentOut])
def doctor_appointments(user=Depends(get_current_user), db: Session = Depends(get_db)):
    role = user.get("role")
    if role not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    if role == "admin":
        rows = db.query(Appointment).order_by(Appointment.scheduled_at.desc()).all()
        return [AppointmentOut(**r.__dict__) for r in rows]
    # doctor: only appointments for assigned children
    assigned_child_ids = [
        r.child_id for r in db.query(DoctorAssignment).filter(DoctorAssignment.doctor_id == user.get("sub")).all()
    ]
    if not assigned_child_ids:
        return []
    rows = (
        db.query(Appointment)
        .filter(Appointment.doctor_id == user.get("sub"), Appointment.child_id.in_(assigned_child_ids))
        .order_by(Appointment.scheduled_at.desc())
        .all()
    )
    return [AppointmentOut(**r.__dict__) for r in rows]


@router.patch("/{appointment_id}/status")
def update_status(appointment_id: str, status: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Not found")
    if user.get("role") == "doctor":
        if appt.doctor_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    if status not in ("pending", "confirmed", "completed", "cancelled", "no-show", "canceled"):
        raise HTTPException(status_code=400, detail="Bad status")
    appt.status = "cancelled" if status == "canceled" else status
    if appt.slot_id and appt.status in ("cancelled",):
        db.query(DoctorSchedule).filter(
            DoctorSchedule.doctor_id == appt.doctor_id,
            DoctorSchedule.slot_id == appt.slot_id,
        ).update({"status": "available"})
    if user.get("role") == "admin":
        log_activity(db, user["sub"], "appointment_status_updated", f"appointment_id={appointment_id},status={appt.status}")
    db.commit()
    return {"status": status}
