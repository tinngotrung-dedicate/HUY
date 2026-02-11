from datetime import datetime
from sqlalchemy.orm import Session
from app.models.activities import Activity


def log_activity(db: Session, user_id: str, action: str, meta: str | None = None):
    rec = Activity(user_id=user_id, action=action, meta=meta, created_at=datetime.utcnow())
    db.add(rec)
    db.commit()
