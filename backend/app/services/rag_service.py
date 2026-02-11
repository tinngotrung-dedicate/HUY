import os
import asyncio
import logging
import numpy as np

try:
    from lightrag import LightRAG, QueryParam
    from lightrag.utils import wrap_embedding_func_with_attrs, setup_logger
    from lightrag.llm.gemini import gemini_model_complete, gemini_embed
except Exception:
    LightRAG = None
    QueryParam = None
    wrap_embedding_func_with_attrs = None
    setup_logger = None
    gemini_model_complete = None
    gemini_embed = None

WORKING_DIR = os.getenv("RAG_WORKDIR", "./rag_storage")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-004")

if setup_logger:
    setup_logger("lightrag", level="INFO")

logger = logging.getLogger("backend.rag")


def build_prompt(message: str, history: list[dict] | None) -> str:
    if not history:
        return message

    lines: list[str] = []
    for item in history[-12:]:
        role = item.get("role", "user")
        content = item.get("content", "")
        if content:
            lines.append(f"{role.upper()}: {content}")
    lines.append(f"USER: {message}")
    return "\n".join(lines)


class RagService:
    def __init__(self):
        self.rag = None
        self.ready = False
        self._init_task = None
        self._ingest_queue: asyncio.Queue[str] | None = None
        self._ingest_task: asyncio.Task | None = None
        self.force_bypass = False
        self.raw_only = False

    async def init(self):
        if not LightRAG:
            self.ready = False
            return

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY is missing. LightRAG will not respond.")
            self.ready = False
            return
        logger.info("Using GEMINI_MODEL=%s EMBED_MODEL=%s", GEMINI_MODEL, EMBED_MODEL)
        self.force_bypass = (
            os.getenv("FORCE_BYPASS", "0") == "1"
            or os.getenv("RAG_MODE", "hybrid").lower() == "bypass"
        )
        if self.force_bypass:
            logger.warning("RAG_MODE=bypass enabled. Embedding will be skipped.")
        self.raw_only = os.getenv("RAW_ONLY", "0") == "1"
        if self.raw_only:
            logger.warning("RAW_ONLY enabled. Returning retrieved context only.")

        async def llm_model_func(prompt, system_prompt=None, history_messages=[], keyword_extraction=False, **kwargs) -> str:
            retries = int(os.getenv("LLM_RETRY", "2"))
            delay = float(os.getenv("LLM_RETRY_DELAY", "5"))
            for attempt in range(retries + 1):
                try:
                    return await gemini_model_complete(
                        prompt,
                        system_prompt=system_prompt,
                        history_messages=history_messages,
                        api_key=api_key,
                        model_name=GEMINI_MODEL,
                        **kwargs,
                    )
                except Exception as exc:
                    message = str(exc)
                    if "RESOURCE_EXHAUSTED" in message or "429" in message:
                        if attempt < retries:
                            await asyncio.sleep(delay)
                            delay *= 2
                            continue
                        logger.error("LLM quota exceeded. Returning fallback response.")
                        return "He thong dang het han muc (quota). Vui long thu lai sau."
                    raise

        @wrap_embedding_func_with_attrs(
            embedding_dim=768,
            max_token_size=2048,
            model_name=EMBED_MODEL,
            send_dimensions=True,
        )
        async def embedding_func(
            texts: list[str],
            embedding_dim: int | None = None,
            max_token_size: int | None = None,
        ):
            result = await gemini_embed.func(
                texts,
                api_key=api_key,
                model=EMBED_MODEL,
                embedding_dim=embedding_dim,
                max_token_size=max_token_size,
            )

            if isinstance(result, dict) and "embedding" in result:
                vectors = np.array(result["embedding"])
            elif hasattr(result, "embedding"):
                vectors = np.array(result.embedding)
            else:
                vectors = np.array(result)

            expected_dim = embedding_dim or 768

            if vectors.size == 0:
                return np.zeros((len(texts), expected_dim))

            if vectors.ndim == 1:
                # If a flat array contains multiple vectors concatenated, reshape to (n, dim)
                if vectors.shape[0] % expected_dim == 0 and vectors.shape[0] > expected_dim:
                    vectors = vectors.reshape(-1, expected_dim)
                else:
                    vectors = vectors.reshape(1, -1)

            if vectors.ndim > 2:
                vectors = vectors.reshape(-1, vectors.shape[-1])

            # If we still don't have the expected embedding dimension, reshape by total size.
            if vectors.ndim == 2 and vectors.shape[1] != expected_dim:
                if vectors.size % expected_dim == 0:
                    vectors = vectors.reshape(-1, expected_dim)

            if len(texts) == 1 and vectors.shape[0] > 1:
                return np.mean(vectors, axis=0, keepdims=True)

            if vectors.shape[0] != len(texts):
                if vectors.shape[0] > len(texts):
                    indices = np.array_split(np.arange(vectors.shape[0]), len(texts))
                    grouped = [np.mean(vectors[idx], axis=0) for idx in indices]
                    return np.stack(grouped, axis=0)
                else:
                    last_vector = vectors[-1:]
                    padding = np.repeat(
                        last_vector, len(texts) - vectors.shape[0], axis=0
                    )
                    return np.concatenate([vectors, padding], axis=0)

            return vectors

        self.rag = LightRAG(
            working_dir=WORKING_DIR,
            llm_model_func=llm_model_func,
            llm_model_name=GEMINI_MODEL,
            embedding_func=embedding_func,
        )
        await self.rag.initialize_storages()
        self.ready = True

        self._ingest_queue = asyncio.Queue()
        self._ingest_task = asyncio.create_task(self._ingest_loop())

    async def _ingest_loop(self):
        if not self._ingest_queue:
            return

        while True:
            text = await self._ingest_queue.get()
            try:
                await self.ingest_text(text)
            finally:
                self._ingest_queue.task_done()

    async def enqueue_ingest(self, text: str):
        if not self._ingest_queue:
            raise RuntimeError("Ingest queue not initialized")
        await self._ingest_queue.put(text)

    async def ingest_text(self, text: str) -> bool:
        if not self.rag:
            raise RuntimeError("RAG not initialized")

        for method_name in ("ainsert", "insert", "add", "ingest", "insert_text"):
            method = getattr(self.rag, method_name, None)
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

    async def ask(self, message: str, history: list[dict] | None):
        if not self.rag:
            raise RuntimeError("RAG not initialized")

        prompt = build_prompt(message, history)
        if self.raw_only:
            try:
                result = await self.rag.aquery(
                    prompt,
                    param=QueryParam(
                        mode="hybrid",
                        only_need_context=True,
                        include_references=True,
                    ),
                )
                if result is None:
                    return ""
                if isinstance(result, str):
                    return result
                if isinstance(result, list):
                    return "\n\n".join([str(item) for item in result])
                if isinstance(result, dict):
                    if "context" in result:
                        return str(result["context"])
                    if "data" in result:
                        return str(result["data"])
                return str(result)
            except Exception as exc:
                logger.error("Raw-only retrieval failed: %s", exc)
                return "Khong the truy xuat raw context. Vui long kiem tra embedding."
        if self.force_bypass:
            answer = await self.rag.aquery(
                prompt,
                param=QueryParam(mode="bypass", only_need_prompt=True),
            )
            if answer is None:
                return ""
            return answer

        try:
            answer = await self.rag.aquery(prompt, param=QueryParam(mode="hybrid"))
            if answer is None:
                return ""
            return answer
        except Exception as exc:
            logger.warning("Hybrid query failed, falling back to bypass mode: %s", exc)
            answer = await self.rag.aquery(
                prompt,
                param=QueryParam(mode="bypass", only_need_prompt=True),
            )
            if answer is None:
                return ""
            return answer


rag_service = RagService()


async def init_rag_background():
    await rag_service.init()


asyncio.get_event_loop().create_task(init_rag_background())
