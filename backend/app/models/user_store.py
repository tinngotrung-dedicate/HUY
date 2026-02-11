import json
import os
import threading
import uuid
from typing import Dict, Optional
from datetime import datetime
import hashlib
import binascii
import os as _os
import hmac

USERS_FILE = os.getenv(
    "USERS_FILE",
    os.path.join(os.path.dirname(__file__), "..", "..", "rag_storage", "users.json"),
)
_lock = threading.Lock()


def _ensure_file():
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, "w") as f:
            json.dump({}, f)


def _hash_password(password: str, salt: Optional[bytes] = None) -> str:
    salt = salt or _os.urandom(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return f"{binascii.hexlify(salt).decode()}:{binascii.hexlify(hashed).decode()}"


def _verify_password(password: str, stored: str) -> bool:
    salt_hex, hash_hex = stored.split(":")
    salt = binascii.unhexlify(salt_hex.encode())
    expected = binascii.unhexlify(hash_hex.encode())
    test = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return hmac.compare_digest(expected, test)


def load_users() -> Dict[str, dict]:
    _ensure_file()
    with _lock, open(USERS_FILE, "r") as f:
        return json.load(f)


def save_users(data: Dict[str, dict]):
    with _lock, open(USERS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def create_user(email: str, password: str, full_name: str, role: str = "user") -> dict:
    users = load_users()
    if email in users:
        raise ValueError("Email already registered")
    user_id = str(uuid.uuid4())
    users[email] = {
        "id": user_id,
        "email": email,
        "full_name": full_name,
        "password_hash": _hash_password(password),
        "role": role,
        "two_factor_enabled": False,
        "two_factor_secret": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    save_users(users)
    return users[email]


def authenticate(email: str, password: str) -> Optional[dict]:
    users = load_users()
    user = users.get(email)
    if not user:
        return None
    if not _verify_password(password, user["password_hash"]):
        return None
    return user


def get_user(email: str) -> Optional[dict]:
    return load_users().get(email)


def get_user_by_id(user_id: str) -> Optional[dict]:
    users = load_users()
    for u in users.values():
        if u["id"] == user_id:
            return u
    return None


def update_user(email: str, data: dict):
    users = load_users()
    if email not in users:
        raise ValueError("User not found")
    users[email].update(data)
    save_users(users)
