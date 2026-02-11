from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=gen_uuid)
    child_id = Column(String, ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    role = Column(String, nullable=False)  # user|assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
