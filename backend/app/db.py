import os
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DB_URL = os.getenv("DB_URL", "sqlite:///./app.db")

connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def init_db():
    # Import models here so metadata is populated
    from app.models.user import User  # noqa
    from app.models.security import PasswordReset  # noqa
    from app.models.settings import UserSettings  # noqa
    from app.models.notifications import Notification  # noqa
    from app.models.activities import Activity  # noqa
    from app.models.system_setting import SystemSetting  # noqa
    from app.models.plan import Plan  # noqa
    from app.models.subscription import Subscription  # noqa
    from app.models.invoice import Invoice  # noqa
    from app.models.doctor import DoctorProfile  # noqa
    from app.models.doctor_credential import DoctorCredential  # noqa
    from app.models.admin_review import AdminReview  # noqa
    from app.models.appointment import Appointment  # noqa
    from app.models.doc_file import DoctorDocument  # noqa
    from app.models.child import Child  # noqa
    from app.models.intake import Intake  # noqa
    from app.models.chat_message import ChatMessage  # noqa
    from app.models.doctor_assignment import DoctorAssignment  # noqa
    from app.models.time_slot import TimeSlot  # noqa
    from app.models.doctor_schedule import DoctorSchedule  # noqa
    from app.models.doctor_rank import DoctorRank  # noqa
    from app.models.rank_rule import RankRule  # noqa
    from app.models.booking_lock import BookingLock  # noqa
    from app.models.cancellation_policy import CancellationPolicy  # noqa
    Base.metadata.create_all(bind=engine)
    _ensure_columns()


def _column_exists_sqlite(conn, table_name: str, column_name: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return any(r[1] == column_name for r in rows)


def _ensure_columns():
    columns = {
        "users": [
            ("phone", "TEXT"),
            ("status", "TEXT"),
        ],
        "doctor_profiles": [
            ("consultation_fee", "FLOAT"),
            ("is_clinic", "BOOLEAN"),
            ("is_online", "BOOLEAN"),
            ("status", "TEXT"),
        ],
        "appointments": [
            ("slot_id", "TEXT"),
            ("reason", "TEXT"),
        ],
        "notifications": [
            ("type", "TEXT"),
            ("payload", "TEXT"),
            ("read_at", "TIMESTAMP"),
            ("sent_at", "TIMESTAMP"),
        ],
    }

    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            for table, cols in columns.items():
                for col, col_type in cols:
                    if not _column_exists_sqlite(conn, table, col):
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
        elif engine.dialect.name.startswith("postgres"):
            for table, cols in columns.items():
                for col, col_type in cols:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type}"))


@contextmanager
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
