import os
from app.db import SessionLocal
from app.models.user import User
from app.utils.password import hash_password


def seed_demo_users():
    env = os.getenv("ENV", "dev")
    enabled = os.getenv("SEED_DEMO_USERS", "1" if env == "dev" else "0") == "1"
    if not enabled:
        return

    reset_passwords = os.getenv(
        "DEMO_RESET_PASSWORDS", "1" if env == "dev" else "0"
    ) == "1"

    users = [
        {
            "email": os.getenv("DEMO_ADMIN_EMAIL", "admin@example.com"),
            "full_name": os.getenv("DEMO_ADMIN_NAME", "Admin"),
            "role": "admin",
            "password": os.getenv("DEMO_ADMIN_PASSWORD", "Admin@12345"),
            "status": "active",
        },
        {
            "email": os.getenv("DEMO_DOCTOR_EMAIL", "doctor@example.com"),
            "full_name": os.getenv("DEMO_DOCTOR_NAME", "Doctor"),
            "role": "doctor",
            "password": os.getenv("DEMO_DOCTOR_PASSWORD", "Doctor@12345"),
            "status": "active",
        },
        {
            "email": os.getenv("DEMO_USER_EMAIL", "user@example.com"),
            "full_name": os.getenv("DEMO_USER_NAME", "User"),
            "role": "user",
            "password": os.getenv("DEMO_USER_PASSWORD", "User@12345"),
            "status": "active",
        },
    ]

    db = SessionLocal()
    try:
        for u in users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if existing:
                if reset_passwords:
                    existing.password_hash = hash_password(u["password"])
                existing.full_name = u["full_name"]
                existing.role = u["role"]
                existing.status = u["status"]
            else:
                db.add(
                    User(
                        email=u["email"],
                        full_name=u["full_name"],
                        role=u["role"],
                        status=u["status"],
                        password_hash=hash_password(u["password"]),
                    )
                )
        db.commit()
    finally:
        db.close()
