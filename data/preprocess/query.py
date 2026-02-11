import os
import asyncio
import numpy as np
import eel

from lightrag import LightRAG, QueryParam
from lightrag.utils import wrap_embedding_func_with_attrs, setup_logger
from lightrag.llm.gemini import gemini_model_complete, gemini_embed

WORKING_DIR = "./rag_storage"
GEMINI_MODEL = "gemini-2.5-flash"
EMBED_MODEL = "models/text-embedding-004"

setup_logger("lightrag", level="INFO")

async def llm_model_func(prompt, system_prompt=None, history_messages=[], keyword_extraction=False, **kwargs) -> str:
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
    await rag.initialize_storages()  # bắt buộc :contentReference[oaicite:6]{index=6}
    return rag

# Global variables for Eel integration
rag_instance = None
program_loop = None

async def process_question(question):
    """
    Async task to process the query and call back to JS.
    """
    global rag_instance
    try:
        if not rag_instance:
             eel.receive_ai_response("⚠️ Hệ thống chưa sẵn sàng.")
             return

        # Perform the actual RAG query
        ans = await rag_instance.aquery(question, param=QueryParam(mode="hybrid"))
        
        # Send result back to JavaScript
        # Note: eel functions are thread-safe enough for this usage pattern
        eel.receive_ai_response(ans)
        
    except Exception as e:
        print(f"Error in process_question: {e}")
        eel.receive_ai_response(f"Error: {str(e)}")

@eel.expose
def ask_ai(question):
    """
    Function exposed to JavaScript.
    Initiates the async process without blocking.
    """
    global program_loop
    print(f"Received query: {question}")
    
    # Schedule the task on the main asyncio loop
    # We do NOT wait for the result here to avoid deadlocking the Eel loop
    if program_loop:
        asyncio.run_coroutine_threadsafe(process_question(question), program_loop)
    else:
        print("Error: program_loop is not set")
    
    return "Request received"

def on_close(page, sockets):
    print("Window closed")

async def main():
    global rag_instance, program_loop
    program_loop = asyncio.get_running_loop()

    # --- 1. Check API Key ---
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("\n" + "="*50)
        print("❌ LỖI: Chưa tìm thấy GEMINI_API_KEY!")
        print("👉 Vui lòng set biến môi trường: $env:GEMINI_API_KEY='...' hoặc set trong code/file .env")
        print("="*50 + "\n")
        # Không return ngay để giữ cửa sổ terminal (nếu chạy click đúp)
        input("Nhấn Enter để thoát...") 
        return

    print("--- Initializing LightRAG ---")
    try:
        rag_instance = await initialize_rag()
        print("--- LightRAG Ready ---")
    except Exception as e:
        print(f"\n❌ Critical Error initializing RAG: {e}")
        import traceback
        traceback.print_exc()
        print("Dừng chương trình do lỗi khởi tạo.")
        input("Nhấn Enter để thoát...")
        return

    # Initialize Eel with the web folder
    try:
        eel.init("UI-for-HUY")
        
        print("--- Starting UI ---")
        # Start the browser with specific host/port to avoid conflicts
        eel.start(
            'index.html',
            size=(1200, 800),
            block=False,
            close_callback=on_close,
            port=8080,        # Cố định port để dễ debug
            host='localhost'  # Cố định host
        )
    except Exception as e:
        print(f"❌ Lỗi khởi động giao diện (Eel): {e}")
        input("Nhấn Enter để thoát...")
        return

    print("✅ System is running. Press Ctrl+C in Terminal to stop.")
    
    # Keep the asyncio loop running
    try:
        while True:
            # Quan trọng: Cần gọi eel.sleep để server giao diện (gevent) có thời gian xử lý request
            eel.sleep(0.1) 
            # Nhường lại cho asyncio để xử lý logic RAG
            await asyncio.sleep(0.1)
    except asyncio.CancelledError:
        print("Shutting down...")
    except KeyboardInterrupt:
        print("User stopped program.")
    finally:
        if rag_instance:
            print("Cleaning up storages...")
            await rag_instance.finalize_storages()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
