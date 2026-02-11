import os
import asyncio
import numpy as np

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from lightrag import LightRAG, QueryParam
from lightrag.utils import wrap_embedding_func_with_attrs, setup_logger
from lightrag.llm.gemini import gemini_model_complete, gemini_embed

WORKING_DIR = "./rag_storage"
SOURCE_DIR = "./folder_txt"
GEMINI_MODEL = "gemini-2.5-flash"
EMBED_MODEL = "models/text-embedding-004"

setup_logger("lightrag", level="INFO")

app = FastAPI(title="Local LightRAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def llm_model_func(
    prompt, system_prompt=None, history_messages=[], keyword_extraction=False, **kwargs
) -> str:
    return await gemini_model_complete(
        prompt,
        system_prompt=system_prompt,
        history_messages=history_messages,
        api_key=os.getenv("GEMINI_API_KEY"),
        model_name=GEMINI_MODEL,
        **kwargs,
    )


@wrap_embedding_func_with_attrs(
    embedding_dim=768,
    max_token_size=2048,
    model_name=EMBED_MODEL,
)
async def embedding_func(texts: list[str]) -> np.ndarray:
    return await gemini_embed.func(
        texts,
        api_key=os.getenv("GEMINI_API_KEY"),
        model=EMBED_MODEL,
    )


async def initialize_rag() -> LightRAG:
    rag = LightRAG(
        working_dir=WORKING_DIR,
        llm_model_func=llm_model_func,
        llm_model_name=GEMINI_MODEL,
        embedding_func=embedding_func,
    )
    await rag.initialize_storages()
    return rag


rag_instance: LightRAG | None = None
ingest_task: asyncio.Task | None = None
file_state: dict[str, float] = {}


class ChatRequest(BaseModel):
    message: str
    history: list[dict] | None = None


def build_prompt(message: str, history: list[dict] | None) -> str:
    if not history:
        return message

    lines: list[str] = []
    for item in history[-12:]:
        role = item.get("role", "user")
        content = item.get("content", "")
        if not content:
            continue
        lines.append(f"{role.upper()}: {content}")
    lines.append(f"USER: {message}")
    return "\n".join(lines)


async def try_ingest_text(text: str) -> bool:
    if not rag_instance:
        return False

    for method_name in ("ainsert", "insert", "add", "ingest", "insert_text"):
        method = getattr(rag_instance, method_name, None)
        if not method:
            continue
        try:
            if asyncio.iscoroutinefunction(method):
                try:
                    await method([text])
                except Exception:
                    await method(text)
            else:
                try:
                    method([text])
                except Exception:
                    method(text)
            return True
        except Exception:
            continue
    return False


async def ingest_folder_loop(interval_seconds: int = 8):
    while True:
        try:
            if not os.path.isdir(SOURCE_DIR):
                await asyncio.sleep(interval_seconds)
                continue

            for filename in os.listdir(SOURCE_DIR):
                if not filename.lower().endswith(".txt"):
                    continue
                path = os.path.join(SOURCE_DIR, filename)
                try:
                    stat = os.stat(path)
                except FileNotFoundError:
                    continue

                last_mtime = file_state.get(path)
                if last_mtime and stat.st_mtime <= last_mtime:
                    continue

                with open(path, "r", encoding="utf-8", errors="ignore") as handle:
                    content = handle.read().strip()

                if content:
                    await try_ingest_text(content)
                    file_state[path] = stat.st_mtime
        except Exception:
            # Keep loop alive even if one file fails
            pass

        await asyncio.sleep(interval_seconds)


@app.on_event("startup")
async def startup_event():
    global rag_instance
    global ingest_task

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in environment")

    rag_instance = await initialize_rag()
    ingest_task = asyncio.create_task(ingest_folder_loop())


@app.post("/chat")
async def chat(req: ChatRequest):
    if not rag_instance:
        raise HTTPException(status_code=503, detail="RAG is not ready")

    try:
        prompt = build_prompt(req.message, req.history)
        answer = await rag_instance.aquery(
            prompt, param=QueryParam(mode="hybrid")
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"answer": answer}


@app.get("/health")
async def health():
    return {"status": "ok"}
