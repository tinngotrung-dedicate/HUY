from pydantic import BaseModel


class IngestRequest(BaseModel):
    text: str


class IngestResponse(BaseModel):
    status: str
