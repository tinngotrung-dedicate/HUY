from pydantic import BaseModel, EmailStr, Field


class ForgotRequest(BaseModel):
    email: EmailStr


class ResetRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6)
