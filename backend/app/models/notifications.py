from datetime import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    type = Column(String, nullable=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    payload = Column(Text, nullable=True)
    read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
