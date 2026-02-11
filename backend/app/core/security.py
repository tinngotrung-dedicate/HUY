import os
import time
import hmac
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", "3600"))
REFRESH_TOKEN_EXPIRE_SECONDS = int(os.getenv("JWT_REFRESH_SECONDS", str(7 * 24 * 3600)))

bearer_scheme = HTTPBearer(auto_error=False)


def _b64url(data: bytes) -> str:
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _jwt_sign(header: dict, payload: dict, expires_in: int) -> str:
    import json as jsonlib
    now = datetime.now(timezone.utc)
    payload = payload.copy()
    payload["iat"] = int(now.timestamp())
    payload["exp"] = int((now + timedelta(seconds=expires_in)).timestamp())
    header_b64 = _b64url(jsonlib.dumps(header, separators=(",", ":"), sort_keys=True).encode())
    payload_b64 = _b64url(jsonlib.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signing_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    return f"{header_b64}.{payload_b64}.{_b64url(signature)}"


def _jwt_decode(token: str) -> dict:
    import base64
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Invalid token")
    header_b64, payload_b64, signature_b64 = parts
    def b64decode(p):
        padding = "=" * ((4 - len(p) % 4) % 4)
        return base64.urlsafe_b64decode(p + padding)
    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, b64decode(signature_b64)):
        raise HTTPException(status_code=401, detail="Invalid token signature")
    payload = json.loads(b64decode(payload_b64))
    if "exp" in payload and time.time() > payload["exp"]:
        raise HTTPException(status_code=401, detail="Token expired")
    return payload


def create_access_token(data: dict) -> str:
    header = {"alg": ALGORITHM, "typ": "JWT"}
    return _jwt_sign(header, data, ACCESS_TOKEN_EXPIRE_SECONDS)


def create_refresh_token(data: dict) -> str:
    header = {"alg": ALGORITHM, "typ": "JWT"}
    return _jwt_sign(header, data, REFRESH_TOKEN_EXPIRE_SECONDS)


def decode_token(token: str) -> dict:
    return _jwt_decode(token)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing token")
    token = credentials.credentials
    payload = decode_token(token)
    return payload  # contains sub (user_id), email, role


def require_role(*roles: str):
    async def checker(user=Depends(get_current_user)):
        if roles and user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker


def require_api_key(x_api_key: str | None = Header(default=None)):
    expected = os.getenv("BACKEND_API_KEY")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
