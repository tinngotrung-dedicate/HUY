from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Float, ForeignKey
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class DoctorRank(Base):
    __tablename__ = "doctor_ranks"
    id = Column(String, primary_key=True, default=gen_uuid)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    level = Column(String, nullable=False)  # A/B/C or 1/2/3
    score = Column(Float, nullable=True)
    computed_from = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
