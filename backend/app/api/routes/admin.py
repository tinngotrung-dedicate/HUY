from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import require_role
from app.db import SessionLocal
from app.models.user import User
from app.models.doctor import DoctorProfile
from app.schemas.user import ProfileOut
from app.schemas.doctor import DoctorCreate, DoctorOut
from app.schemas.assignment import DoctorAssignmentCreate, DoctorAssignmentOut
from app.models.doctor_assignment import DoctorAssignment
from app.models.child import Child
from app.models.notifications import Notification
from app.models.activities import Activity
from app.models.system_setting import SystemSetting
from app.models.appointment import Appointment
from app.models.time_slot import TimeSlot
from app.models.doctor_schedule import DoctorSchedule
from app.schemas.system_setting import SystemSettingUpdate, SystemSettingOut
from app.utils.audit import log_activity
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/users", response_model=list[ProfileOut])
def list_users(db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    rows = db.query(User).all()
    return [ProfileOut(**r.__dict__) for r in rows]


@router.patch("/users/{user_id}/role")
def update_role(user_id: str, role: str, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.role = role
    log_activity(db, admin["sub"], "user_role_updated", f"user_id={user_id},role={role}")
    db.commit()
    return {"status": "updated", "role": role}


@router.patch("/users/{user_id}/status")
def update_status(user_id: str, status: str, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.status = status
    log_activity(db, admin["sub"], "user_status_updated", f"user_id={user_id},status={status}")
    db.commit()
    return {"status": "updated", "user_status": status}


@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(u)
    db.commit()
    return {"status": "deleted"}


@router.post("/doctors", response_model=DoctorOut)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Tạo user với role doctor và mật khẩu tạm thời (admin sẽ gửi link đặt mật khẩu)
        temp_pass = "Temp@12345"
        from app.utils.password import hash_password
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(temp_pass),
            role="doctor",
            status="active",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.role = "doctor"
        db.commit()
    doc = db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
    if not doc:
        doc = DoctorProfile(
            user_id=user.id,
            full_name=payload.full_name,
            specialty=payload.specialty,
            hospital=payload.hospital,
            license_number=payload.license_number,
            bio=payload.bio,
            consultation_fee=payload.consultation_fee,
            is_clinic=payload.is_clinic if payload.is_clinic is not None else True,
            is_online=payload.is_online if payload.is_online is not None else False,
            status="approved",
            verified=True,
            approved_by=admin["sub"],
            approved_at=datetime.utcnow(),
        )
        db.add(doc)
    else:
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
        doc.status = "approved"
        doc.verified = True
        doc.approved_by = admin["sub"]
        doc.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)
    log_activity(db, admin["sub"], "doctor_approved", f"doctor_user_id={user.id}")
    return DoctorOut(**doc.__dict__)


@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    rows = db.query(DoctorProfile).all()
    return [DoctorOut(**r.__dict__) for r in rows]


@router.get("/doctors/pending", response_model=list[DoctorOut])
def pending_doctors(db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    rows = db.query(DoctorProfile).filter(DoctorProfile.verified == False).all()
    return [DoctorOut(**r.__dict__) for r in rows]


@router.patch("/doctors/{doctor_id}/approve", response_model=DoctorOut)
def approve_doctor(doctor_id: str, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    doc = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doc.verified = True
    doc.status = "approved"
    doc.approved_by = admin["sub"]
    doc.approved_at = datetime.utcnow()
    log_activity(db, admin["sub"], "doctor_approved", f"doctor_profile_id={doctor_id}")
    db.commit()
    db.refresh(doc)
    return DoctorOut(**doc.__dict__)


@router.get("/assignments", response_model=list[DoctorAssignmentOut])
def list_assignments(doctor_id: str | None = None, child_id: str | None = None, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    q = db.query(DoctorAssignment)
    if doctor_id:
        q = q.filter(DoctorAssignment.doctor_id == doctor_id)
    if child_id:
        q = q.filter(DoctorAssignment.child_id == child_id)
    rows = q.all()
    return [DoctorAssignmentOut(**r.__dict__) for r in rows]


@router.post("/assignments", response_model=DoctorAssignmentOut)
def assign_doctor(payload: DoctorAssignmentCreate, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    child = db.query(Child).filter(Child.id == payload.child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    assignment = DoctorAssignment(
        doctor_id=payload.doctor_id,
        child_id=payload.child_id,
        assigned_by=admin["sub"],
    )
    db.add(assignment)
    try:
        db.commit()
    except Exception:
        db.rollback()
        # already exists
        existing = db.query(DoctorAssignment).filter(
            DoctorAssignment.doctor_id == payload.doctor_id,
            DoctorAssignment.child_id == payload.child_id,
        ).first()
        if existing:
            return DoctorAssignmentOut(**existing.__dict__)
        raise
    db.refresh(assignment)
    log_activity(db, admin["sub"], "doctor_assigned", f"doctor_id={payload.doctor_id},child_id={payload.child_id}")
    return DoctorAssignmentOut(**assignment.__dict__)


@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: str, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    row = db.query(DoctorAssignment).filter(DoctorAssignment.id == assignment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(row)
    log_activity(db, admin["sub"], "doctor_assignment_deleted", f"assignment_id={assignment_id}")
    db.commit()
    return {"status": "deleted"}


@router.get("/audit")
def list_audit(limit: int = 100, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.query(Activity).order_by(Activity.created_at.desc()).limit(limit).all()
    return [{"id": r.id, "user_id": r.user_id, "action": r.action, "meta": r.meta, "created_at": r.created_at} for r in rows]


@router.post("/notifications/broadcast")
def broadcast_notification(
    title: str,
    body: str | None = None,
    type: str | None = None,
    payload: str | None = None,
    roles: str | None = None,
    admin=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if roles:
        role_list = [r.strip() for r in roles.split(",") if r.strip()]
        if role_list:
            q = q.filter(User.role.in_(role_list))
    users = q.all()
    for u in users:
        db.add(Notification(user_id=u.id, title=title, body=body, type=type, payload=payload, sent_at=datetime.utcnow()))
    log_activity(db, admin["sub"], "notification_broadcast", f"count={len(users)}")
    db.commit()
    return {"status": "sent", "count": len(users)}


@router.get("/reports/summary")
def reports_summary(admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    users_total = db.query(User).count()
    doctors_total = db.query(User).filter(User.role == "doctor").count()
    users_total_by_role = {
        "admin": db.query(User).filter(User.role == "admin").count(),
        "doctor": doctors_total,
        "user": db.query(User).filter(User.role == "user").count(),
    }
    doctor_status = {
        "approved": db.query(DoctorProfile).filter(DoctorProfile.status == "approved").count(),
        "pending": db.query(DoctorProfile).filter(DoctorProfile.status == "pending").count(),
        "rejected": db.query(DoctorProfile).filter(DoctorProfile.status == "rejected").count(),
    }
    appt_status = {
        "pending": db.query(Appointment).filter(Appointment.status == "pending").count(),
        "confirmed": db.query(Appointment).filter(Appointment.status == "confirmed").count(),
        "completed": db.query(Appointment).filter(Appointment.status == "completed").count(),
        "cancelled": db.query(Appointment).filter(Appointment.status == "cancelled").count(),
        "no_show": db.query(Appointment).filter(Appointment.status == "no-show").count(),
    }
    slots_total = db.query(TimeSlot).count()
    schedules_total = db.query(DoctorSchedule).count()
    return {
        "users_total": users_total,
        "users_by_role": users_total_by_role,
        "doctor_status": doctor_status,
        "appointments": appt_status,
        "slots_total": slots_total,
        "schedules_total": schedules_total,
    }


@router.get("/settings", response_model=list[SystemSettingOut])
def list_system_settings(admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.query(SystemSetting).all()
    return [SystemSettingOut(**r.__dict__) for r in rows]


@router.put("/settings/{key}", response_model=SystemSettingOut)
def upsert_system_setting(key: str, payload: SystemSettingUpdate, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not row:
        row = SystemSetting(key=key, value=payload.value)
        db.add(row)
    else:
        row.value = payload.value
    log_activity(db, admin["sub"], "system_setting_updated", f"key={key}")
    db.commit()
    db.refresh(row)
    return SystemSettingOut(**row.__dict__)
