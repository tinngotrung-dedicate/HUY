from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    history: list[dict] | None = None
    child_id: str | None = None


class ChatResponse(BaseModel):
    answer: str


class ChatMessageOut(BaseModel):
    id: str
    child_id: str
    role: str
    content: str
    created_at: str | None = None
