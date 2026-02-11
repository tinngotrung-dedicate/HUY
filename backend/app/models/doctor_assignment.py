from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class DoctorAssignment(Base):
    __tablename__ = "doctor_assignments"
    __table_args__ = (UniqueConstraint("doctor_id", "child_id", name="uq_doctor_child"),)
    id = Column(String, primary_key=True, default=gen_uuid)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    child_id = Column(String, ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    assigned_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
