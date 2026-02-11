from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import require_api_key
from app.api.routes import health, chat, ingest, auth
from app.db import init_db
from app.utils.seed_demo import seed_demo_users


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/health", tags=["health"])
    app.include_router(chat.router, prefix="/chat", tags=["chat"])
    app.include_router(ingest.router, prefix="/ingest", tags=["ingest"], dependencies=[Depends(require_api_key)])
    app.include_router(auth.router)
    from app.api.routes import user, admin, billing, appointments, documents, doctors, slots, schedules, credentials, reviews, ranks, booking, policies
    app.include_router(user.router)
    app.include_router(admin.router)
    app.include_router(doctors.router)
    app.include_router(billing.router)
    app.include_router(appointments.router)
    app.include_router(documents.router)
    app.include_router(slots.router)
    app.include_router(schedules.router)
    app.include_router(credentials.router)
    app.include_router(reviews.router)
    app.include_router(ranks.router)
    app.include_router(booking.router)
    app.include_router(policies.router)
    from app.api.routes import children
    app.include_router(children.router)

    return app


init_db()
seed_demo_users()
app = create_app()
