import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.security import get_current_user
from app.db import SessionLocal
from app.models.doc_file import DoctorDocument

UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))

router = APIRouter(prefix="/doctor/docs", tags=["doctor-docs"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("")
def upload_doc(file: UploadFile = File(...), user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(file.file.read())
    doc = DoctorDocument(doctor_id=user["sub"], filename=file.filename, url=path)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "filename": doc.filename, "url": doc.url}


@router.get("")
def list_docs(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = db.query(DoctorDocument).filter(DoctorDocument.doctor_id == user["sub"]).all()
    return [r.__dict__ for r in rows]
