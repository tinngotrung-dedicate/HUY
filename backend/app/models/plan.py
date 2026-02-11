from datetime import datetime
import uuid
from sqlalchemy import Column, String, Float, DateTime
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Plan(Base):
    __tablename__ = "plans"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    interval = Column(String, default="month")  # month|year
    created_at = Column(DateTime, default=datetime.utcnow)
