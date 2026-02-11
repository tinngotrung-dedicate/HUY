from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class TimeSlot(Base):
    __tablename__ = "time_slots"
    id = Column(String, primary_key=True, default=gen_uuid)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=True)
    slot_type = Column(String, default="working")  # working|block
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
