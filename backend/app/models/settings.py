from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from app.db import Base


class UserSettings(Base):
    __tablename__ = "user_settings"
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    notify_email = Column(Boolean, default=True)
    notify_push = Column(Boolean, default=False)
    language = Column(String, default="vi")
    privacy_level = Column(String, default="private")  # private | friends | public
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
