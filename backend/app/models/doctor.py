from datetime import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Float
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    specialty = Column(String, nullable=True)
    hospital = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    consultation_fee = Column(Float, nullable=True)
    is_clinic = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)
    status = Column(String, nullable=False, default="pending")
    verified = Column(Boolean, default=False)
    approved_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
