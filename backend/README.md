# FastAPI Backend Skeleton

This is a production‑oriented FastAPI structure wired to LightRAG.

## Run (local)

```bash
cd /Users/tinngo/Documents/Code/UI-for-HUY-main/backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn pydantic python-dotenv "lightrag-hku[api]" eel numpy
uvicorn app.main:app --host 127.0.0.1 --port 8008 --reload
```

## Env
Copy `.env.example` to `.env` and fill values.

## Endpoints
- `POST /chat` -> { message, history? }
- `POST /ingest` -> { text }
- `GET /health`

Add header `X-API-Key` if `BACKEND_API_KEY` is set.
