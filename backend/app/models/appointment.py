from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(String, primary_key=True, default=gen_uuid)
    patient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    child_id = Column(String, ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=True)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    slot_id = Column(String, ForeignKey("time_slots.id", ondelete="SET NULL"), index=True, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String, default="pending")  # pending|confirmed|cancelled|completed|no-show
    reason = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
