from pydantic import BaseModel, EmailStr, Field


class ProfileOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    phone: str | None = None
    status: str | None = None
    two_factor_enabled: bool


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2)
    phone: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class SettingsOut(BaseModel):
    notify_email: bool
    notify_push: bool
    language: str
    privacy_level: str


class SettingsUpdate(BaseModel):
    notify_email: bool | None = None
    notify_push: bool | None = None
    language: str | None = None
    privacy_level: str | None = None


class NotificationOut(BaseModel):
    id: str
    type: str | None = None
    title: str
    body: str | None = None
    payload: str | None = None
    read: bool
    read_at: str | None = None
    sent_at: str | None = None
    created_at: str


class ActivityOut(BaseModel):
    id: str
    action: str
    meta: str | None = None
    created_at: str
