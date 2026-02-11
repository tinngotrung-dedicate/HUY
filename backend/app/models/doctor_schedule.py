from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"
    id = Column(String, primary_key=True, default=gen_uuid)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    slot_id = Column(String, ForeignKey("time_slots.id", ondelete="CASCADE"), index=True, nullable=False)
    status = Column(String, default="available")  # available|booked|blocked
    created_at = Column(DateTime, default=datetime.utcnow)
