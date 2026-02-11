from datetime import datetime
import uuid
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    description = Column(String, nullable=True)
    paid = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
