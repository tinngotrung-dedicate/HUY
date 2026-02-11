from fastapi import APIRouter, HTTPException

from app.schemas.ingest import IngestRequest, IngestResponse
from app.services.rag_service import rag_service

router = APIRouter()


@router.post("")
async def ingest(req: IngestRequest) -> IngestResponse:
    if not rag_service.ready:
        raise HTTPException(status_code=503, detail="RAG not ready")

    await rag_service.enqueue_ingest(req.text)
    return IngestResponse(status="queued")
