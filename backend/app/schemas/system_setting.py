from pydantic import BaseModel


class SystemSettingUpdate(BaseModel):
    value: str | None = None


class SystemSettingOut(BaseModel):
    id: str
    key: str
    value: str | None = None
    updated_at: str | None = None
