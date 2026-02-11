from datetime import datetime, timedelta
import uuid
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class PasswordReset(Base):
    __tablename__ = "password_resets"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
