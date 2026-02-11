from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.security import get_current_user
from app.db import SessionLocal
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.invoice import Invoice

router = APIRouter(prefix="/billing", tags=["billing"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_plans(db: Session):
    if db.query(Plan).count() == 0:
        plans = [
            Plan(name="Free", price=0, interval="month"),
            Plan(name="Pro", price=19, interval="month"),
            Plan(name="Business", price=49, interval="month"),
        ]
        db.add_all(plans)
        db.commit()


@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    seed_plans(db)
    rows = db.query(Plan).all()
    return [r.__dict__ for r in rows]


@router.get("/subscription")
def get_subscription(user=Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.user_id == user["sub"]).first()
    if not sub:
        return {"status": "none"}
    return {
        "plan_id": sub.plan_id,
        "status": sub.status,
        "current_period_end": sub.current_period_end,
    }


@router.post("/subscription")
def create_or_update_subscription(plan_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    sub = db.query(Subscription).filter(Subscription.user_id == user["sub"]).first()
    end = datetime.utcnow() + timedelta(days=30 if plan.interval == "month" else 365)
    if sub:
        sub.plan_id = plan.id
        sub.status = "active"
        sub.current_period_end = end
    else:
        sub = Subscription(user_id=user["sub"], plan_id=plan.id, status="active", current_period_end=end)
        db.add(sub)
    db.add(Invoice(user_id=user["sub"], amount=plan.price, currency=plan.currency, description=f"Subscription {plan.name}", paid=True))
    db.commit()
    return {"status": "active", "plan": plan.name}


@router.get("/invoices")
def list_invoices(user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Invoice)
        .filter(Invoice.user_id == user["sub"])
        .order_by(Invoice.created_at.desc())
        .limit(50)
        .all()
    )
    return [r.__dict__ for r in rows]
