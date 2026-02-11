from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Intake(Base):
    __tablename__ = "intakes"
    id = Column(String, primary_key=True, default=gen_uuid)
    child_id = Column(String, ForeignKey("children.id", ondelete="CASCADE"), unique=True, nullable=False)
    admission_date = Column(String, nullable=True)
    admission_reason = Column(Text, nullable=True)
    obstetric_history = Column(Text, nullable=True)
    development_history = Column(Text, nullable=True)
    nutrition_history = Column(Text, nullable=True)
    immunization_history = Column(Text, nullable=True)
    allergy_history = Column(Text, nullable=True)
    pathology_history = Column(Text, nullable=True)
    epidemiology_history = Column(Text, nullable=True)
    family_history = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)
    general_exam = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
