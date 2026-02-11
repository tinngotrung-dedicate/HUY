from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import os

from app.schemas.chat import ChatRequest, ChatResponse, ChatMessageOut
from app.services.rag_service import rag_service
from app.core.security import get_current_user
from app.db import SessionLocal
from app.models.chat_message import ChatMessage
from app.models.child import Child
from app.models.doctor_assignment import DoctorAssignment

router = APIRouter()

AI_MODE = os.getenv("AI_MODE", "mock").lower()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _can_access_child(db: Session, child: Child, user: dict) -> bool:
    if user.get("role") == "admin":
        return True
    if child.user_id == user.get("sub"):
        return True
    if user.get("role") == "doctor":
        return db.query(DoctorAssignment).filter(
            DoctorAssignment.doctor_id == user.get("sub"),
            DoctorAssignment.child_id == child.id,
        ).first() is not None
    return False


def _mock_answer(message: str, child: Child | None) -> str:
    name = child.full_name if child else "bé"
    return (
        f"Đã ghi nhận thông tin của {name}. Bạn có thể mô tả rõ triệu chứng, "
        f"thời gian xuất hiện, và các yếu tố liên quan để bác sĩ tư vấn chính xác hơn."
    )

@router.post("")
async def chat(req: ChatRequest, user=Depends(get_current_user), db: Session = Depends(get_db)) -> ChatResponse:
    child = None
    if req.child_id:
        child = db.query(Child).filter(Child.id == req.child_id).first()
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")
        if not _can_access_child(db, child, user):
            raise HTTPException(status_code=403, detail="Forbidden")

    if req.child_id:
        db.add(ChatMessage(child_id=req.child_id, role="user", content=req.message))
        db.commit()

    if AI_MODE == "mock" or not rag_service.ready:
        answer = _mock_answer(req.message, child)
    else:
        answer = await rag_service.ask(req.message, req.history)

    if req.child_id:
        db.add(ChatMessage(child_id=req.child_id, role="assistant", content=answer))
        db.commit()

    return ChatResponse(answer=answer)


@router.get("/children/{child_id}/messages", response_model=list[ChatMessageOut])
def list_messages(child_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not _can_access_child(db, child, user):
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.child_id == child_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [ChatMessageOut(**r.__dict__) for r in rows]
