from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Text
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(String, primary_key=True, default=gen_uuid)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
