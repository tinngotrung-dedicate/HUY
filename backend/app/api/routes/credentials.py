from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user, require_role
from app.db import SessionLocal
from app.models.doctor_credential import DoctorCredential
from app.schemas.credential import DoctorCredentialCreate, DoctorCredentialOut, DoctorCredentialVerify

router = APIRouter(prefix="/credentials", tags=["credentials"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD") from exc


@router.post("", response_model=DoctorCredentialOut)
def create_credential(payload: DoctorCredentialCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    cred = DoctorCredential(
        doctor_id=user.get("sub"),
        type=payload.type,
        title=payload.title,
        issuer=payload.issuer,
        issue_date=_parse_date(payload.issue_date),
        expiry_date=_parse_date(payload.expiry_date),
        doc_url=payload.doc_url,
        verification_status="pending",
    )
    db.add(cred)
    db.commit()
    db.refresh(cred)
    return DoctorCredentialOut(**cred.__dict__)


@router.get("/my", response_model=list[DoctorCredentialOut])
def my_credentials(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = db.query(DoctorCredential).filter(DoctorCredential.doctor_id == user.get("sub")).all()
    return [DoctorCredentialOut(**r.__dict__) for r in rows]


@router.get("", response_model=list[DoctorCredentialOut])
def list_credentials(admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.query(DoctorCredential).all()
    return [DoctorCredentialOut(**r.__dict__) for r in rows]


@router.patch("/{credential_id}/verify", response_model=DoctorCredentialOut)
def verify_credential(credential_id: str, payload: DoctorCredentialVerify, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    cred = db.query(DoctorCredential).filter(DoctorCredential.id == credential_id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    cred.verification_status = payload.verification_status
    db.commit()
    db.refresh(cred)
    return DoctorCredentialOut(**cred.__dict__)
