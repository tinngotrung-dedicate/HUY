from pydantic import BaseModel
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


class Settings(BaseModel):
    app_name: str = os.getenv("APP_NAME", "Brainstorm API")
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8008"))
    log_level: str = os.getenv("LOG_LEVEL", "info")
    env: str = os.getenv("ENV", "dev")
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
    ]


settings = Settings()
