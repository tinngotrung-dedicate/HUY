from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Float, Integer
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class CancellationPolicy(Base):
    __tablename__ = "cancellation_policies"
    id = Column(String, primary_key=True, default=gen_uuid)
    min_hours_before = Column(Integer, nullable=False)
    fee_percent = Column(Float, nullable=False)
    applies_to = Column(String, nullable=False)  # online|offline|all
    created_at = Column(DateTime, default=datetime.utcnow)
