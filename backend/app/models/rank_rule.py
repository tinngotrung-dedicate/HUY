from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, Float, Boolean, Text
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class RankRule(Base):
    __tablename__ = "rank_rules"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    weight = Column(Float, nullable=False, default=1.0)
    condition_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
