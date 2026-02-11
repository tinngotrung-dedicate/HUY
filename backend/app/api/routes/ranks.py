from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user, require_role
from app.db import SessionLocal
from app.models.doctor_rank import DoctorRank
from app.models.rank_rule import RankRule
from app.schemas.rank import DoctorRankOut, DoctorRankUpsert, RankRuleCreate, RankRuleOut

router = APIRouter(prefix="/ranks", tags=["ranks"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[DoctorRankOut])
def list_ranks(admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.query(DoctorRank).all()
    return [DoctorRankOut(**r.__dict__) for r in rows]


@router.get("/doctor/{doctor_id}", response_model=DoctorRankOut)
def get_rank(doctor_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    rank = db.query(DoctorRank).filter(DoctorRank.doctor_id == doctor_id).first()
    if not rank:
        raise HTTPException(status_code=404, detail="Rank not found")
    return DoctorRankOut(**rank.__dict__)


@router.post("", response_model=DoctorRankOut)
def upsert_rank(payload: DoctorRankUpsert, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rank = db.query(DoctorRank).filter(DoctorRank.doctor_id == payload.doctor_id).first()
    if not rank:
        rank = DoctorRank(
            doctor_id=payload.doctor_id,
            level=payload.level,
            score=payload.score,
            computed_from=payload.computed_from,
        )
        db.add(rank)
    else:
        rank.level = payload.level
        rank.score = payload.score
        rank.computed_from = payload.computed_from
    db.commit()
    db.refresh(rank)
    return DoctorRankOut(**rank.__dict__)


@router.get("/rules", response_model=list[RankRuleOut])
def list_rules(admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rows = db.query(RankRule).all()
    return [RankRuleOut(**r.__dict__) for r in rows]


@router.post("/rules", response_model=RankRuleOut)
def create_rule(payload: RankRuleCreate, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rule = RankRule(
        name=payload.name,
        weight=payload.weight,
        condition_json=payload.condition_json,
        is_active=payload.is_active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return RankRuleOut(**rule.__dict__)


@router.put("/rules/{rule_id}", response_model=RankRuleOut)
def update_rule(rule_id: str, payload: RankRuleCreate, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rule = db.query(RankRule).filter(RankRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.name = payload.name
    rule.weight = payload.weight
    rule.condition_json = payload.condition_json
    rule.is_active = payload.is_active
    db.commit()
    db.refresh(rule)
    return RankRuleOut(**rule.__dict__)


@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: str, admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    rule = db.query(RankRule).filter(RankRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"status": "deleted"}
