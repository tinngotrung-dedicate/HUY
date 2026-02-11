from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class DoctorDocument(Base):
    __tablename__ = "doctor_documents"
    id = Column(String, primary_key=True, default=gen_uuid)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    filename = Column(String, nullable=False)
    url = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
