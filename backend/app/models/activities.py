from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Activity(Base):
    __tablename__ = "activities"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    action = Column(String, nullable=False)
    meta = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
