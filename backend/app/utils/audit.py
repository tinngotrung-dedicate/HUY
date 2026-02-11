from app.models.activities import Activity


def log_activity(db, user_id: str, action: str, meta: str | None = None):
    db.add(Activity(user_id=user_id, action=action, meta=meta))
