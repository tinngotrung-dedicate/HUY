from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class AdminReview(Base):
    __tablename__ = "admin_reviews"
    id = Column(String, primary_key=True, default=gen_uuid)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    admin_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision = Column(String, nullable=False)  # approve|reject|need_more
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
