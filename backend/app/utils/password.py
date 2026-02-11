import hashlib
import os
import binascii
import hmac


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return f"{binascii.hexlify(salt).decode()}:{binascii.hexlify(hashed).decode()}"


def verify_password(password: str, stored: str) -> bool:
    salt_hex, hash_hex = stored.split(":")
    salt = binascii.unhexlify(salt_hex.encode())
    expected = binascii.unhexlify(hash_hex.encode())
    test = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return hmac.compare_digest(expected, test)
