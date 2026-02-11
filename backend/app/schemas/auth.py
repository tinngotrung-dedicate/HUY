from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2)
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    code: str | None = None  # 2FA code optional


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    phone: str | None = None
    status: str | None = None
    two_factor_enabled: bool


class TwoFASetupResponse(BaseModel):
    secret: str
    otpauth_url: str


class TwoFAVerifyRequest(BaseModel):
    code: str


class RefreshRequest(BaseModel):
    refresh_token: str


class OAuthLoginRequest(BaseModel):
    id_token: str | None = None  # Google
    access_token: str | None = None  # Facebook
    email: EmailStr | None = None  # mock fallback
    full_name: str | None = None
