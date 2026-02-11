from datetime import datetime, timedelta
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)
    status = Column(String, default="active")  # active | canceled
    current_period_end = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=30))
    created_at = Column(DateTime, default=datetime.utcnow)
