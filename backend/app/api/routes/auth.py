import os
import uuid
import requests
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    UserOut,
    TwoFASetupResponse,
    TwoFAVerifyRequest,
    RefreshRequest,
    OAuthLoginRequest,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    require_role,
    decode_token,
)
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.user import User
from app.utils.password import hash_password, verify_password

try:
    import pyotp
except ImportError:  # pragma: no cover
    pyotp = None


router = APIRouter(prefix="/auth", tags=["auth"])
OAUTH_MOCK = os.getenv("OAUTH_MOCK", "0") == "1"
GOOGLE_TOKENINFO = "https://www.googleapis.com/oauth2/v3/tokeninfo"
FACEBOOK_ME = "https://graph.facebook.com/me"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/signup", response_model=UserOut)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role="user",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(**user.__dict__)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        demo_auto = os.getenv("DEMO_AUTO_CREATE", "1" if os.getenv("ENV", "dev") == "dev" else "0") == "1"
        if demo_auto:
            demo_map = {
                os.getenv("DEMO_ADMIN_EMAIL", "admin@example.com"): ("Admin", "admin", os.getenv("DEMO_ADMIN_PASSWORD", "Admin@12345")),
                os.getenv("DEMO_DOCTOR_EMAIL", "doctor@example.com"): ("Doctor", "doctor", os.getenv("DEMO_DOCTOR_PASSWORD", "Doctor@12345")),
                os.getenv("DEMO_USER_EMAIL", "user@example.com"): ("User", "user", os.getenv("DEMO_USER_PASSWORD", "User@12345")),
            }
            if payload.email in demo_map:
                name, role, pwd = demo_map[payload.email]
                if payload.password == pwd:
                    user = User(
                        email=payload.email,
                        full_name=name,
                        password_hash=hash_password(pwd),
                        role=role,
                        status="active",
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.status and user.status != "active":
        raise HTTPException(status_code=403, detail="User inactive")

    if user.two_factor_enabled:
        if not pyotp:
            raise HTTPException(status_code=500, detail="pyotp not installed for 2FA")
        if not payload.code:
            raise HTTPException(status_code=401, detail="2FA code required")
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(payload.code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

    claims = {"sub": user.id, "email": user.email, "role": user.role}
    access = create_access_token(claims)
    refresh = create_refresh_token(claims)
    return TokenResponse(access_token=access, refresh_token=refresh)


def _get_or_create_oauth_user(db: Session, email: str, full_name: str | None = None) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    temp_password = f"oauth-{uuid.uuid4()}"
    user = User(
        email=email,
        full_name=full_name or email.split("@")[0],
        password_hash=hash_password(temp_password),
        role="user",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/oauth/google", response_model=TokenResponse)
def oauth_google(payload: OAuthLoginRequest, db: Session = Depends(get_db)):
    if OAUTH_MOCK and payload.email:
        user = _get_or_create_oauth_user(db, payload.email, payload.full_name)
    else:
        if not payload.id_token:
            raise HTTPException(status_code=400, detail="Missing id_token")
        try:
            resp = requests.get(GOOGLE_TOKENINFO, params={"id_token": payload.id_token}, timeout=5)
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Google verification failed") from exc
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        data = resp.json()
        email = data.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google account missing email")
        user = _get_or_create_oauth_user(db, email, data.get("name"))

    claims = {"sub": user.id, "email": user.email, "role": user.role}
    access = create_access_token(claims)
    refresh = create_refresh_token(claims)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/oauth/facebook", response_model=TokenResponse)
def oauth_facebook(payload: OAuthLoginRequest, db: Session = Depends(get_db)):
    if OAUTH_MOCK and payload.email:
        user = _get_or_create_oauth_user(db, payload.email, payload.full_name)
    else:
        if not payload.access_token:
            raise HTTPException(status_code=400, detail="Missing access_token")
        try:
            resp = requests.get(
                FACEBOOK_ME,
                params={"fields": "id,name,email", "access_token": payload.access_token},
                timeout=5,
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Facebook verification failed") from exc
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Facebook token")
        data = resp.json()
        email = data.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Facebook account missing email")
        user = _get_or_create_oauth_user(db, email, data.get("name"))

    claims = {"sub": user.id, "email": user.email, "role": user.role}
    access = create_access_token(claims)
    refresh = create_refresh_token(claims)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user["sub"]).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**u.__dict__)


@router.post("/2fa/setup", response_model=TwoFASetupResponse)
def twofa_setup(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not pyotp:
        raise HTTPException(status_code=500, detail="pyotp not installed")
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otpauth = totp.provisioning_uri(name=user["email"], issuer_name="UI-for-HUY")
    db.query(User).filter(User.id == user["sub"]).update(
        {"two_factor_secret": secret, "two_factor_enabled": False}
    )
    db.commit()
    return TwoFASetupResponse(secret=secret, otpauth_url=otpauth)


@router.post("/2fa/verify")
def twofa_verify(payload: TwoFAVerifyRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not pyotp:
        raise HTTPException(status_code=500, detail="pyotp not installed")
    record = db.query(User).filter(User.id == user["sub"]).first()
    if not record or not record.two_factor_secret:
        raise HTTPException(status_code=400, detail="2FA not initialized")
    totp = pyotp.TOTP(record.two_factor_secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")
    db.query(User).filter(User.id == user["sub"]).update({"two_factor_enabled": True})
    db.commit()
    return {"status": "2fa_enabled"}


@router.post("/2fa/disable")
def twofa_disable(user=Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(User).filter(User.id == user["sub"]).update(
        {"two_factor_enabled": False, "two_factor_secret": None}
    )
    db.commit()
    return {"status": "2fa_disabled"}


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    claims = {"sub": data["sub"], "email": data.get("email"), "role": data.get("role")}
    access = create_access_token(claims)
    new_refresh = create_refresh_token(claims)
    return TokenResponse(access_token=access, refresh_token=new_refresh)


@router.get("/admin/guarded")
def admin_guarded(user=Depends(require_role("admin"))):
    return {"status": "ok", "role": user["role"]}
