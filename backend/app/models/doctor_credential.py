from datetime import datetime, date
import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class DoctorCredential(Base):
    __tablename__ = "doctor_credentials"
    id = Column(String, primary_key=True, default=gen_uuid)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    type = Column(String, nullable=False)  # degree|license|cert
    title = Column(String, nullable=False)
    issuer = Column(String, nullable=True)
    issue_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    doc_url = Column(String, nullable=True)
    verification_status = Column(String, default="pending")  # pending|verified|rejected
    created_at = Column(DateTime, default=datetime.utcnow)
