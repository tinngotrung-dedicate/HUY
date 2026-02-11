from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class BookingLock(Base):
    __tablename__ = "booking_locks"
    id = Column(String, primary_key=True, default=gen_uuid)
    slot_id = Column(String, ForeignKey("time_slots.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    locked_by_user = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
