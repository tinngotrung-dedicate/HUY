#!/usr/bin/env python
"""
Create a default admin user if not exists.

Usage:
  python scripts/seed_admin.py

Env vars:
  ADMIN_EMAIL (default: admin@example.com)
  ADMIN_PASSWORD (default: Admin@12345)
  ADMIN_NAME (default: Admin)
"""
import os
from app.db import SessionLocal, init_db
from app.models.user import User
from app.utils.password import hash_password


def main():
    init_db()
    email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    password = os.getenv("ADMIN_PASSWORD", "Admin@12345")
    full_name = os.getenv("ADMIN_NAME", "Admin")
    db = SessionLocal()
    try:
        exists = db.query(User).filter(User.email == email).first()
        if exists:
            print(f"[seed_admin] Admin already exists: {email}")
            return
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            role="admin",
        )
        db.add(user)
        db.commit()
        print(f"[seed_admin] Created admin {email} with password {password}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
