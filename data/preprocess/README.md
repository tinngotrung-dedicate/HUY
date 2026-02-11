# LightRAG Chatbot with Gemini & Eel

This project implements a Retrieval-Augmented Generation (RAG) chatbot using **LightRAG** and **Google Gemini** models. It features a local web interface built with **Eel**. The system processes text documents to build a knowledge graph and vector store, enabling intelligent querying of the ingested information.

## Project Overview

*   **Backend**: Python with LightRAG (knowledge graph + vector search).
*   **LLM Provider**: Google Gemini (`gemini-2.5-flash` for generation, `text-embedding-004` for embeddings).
*   **Frontend**: HTML/JS/CSS served via Eel.
*   **Data Source**: Text files located in `folder_txt/`.

## Prerequisites

*   Python 3.10 or higher.
*   A Google Cloud Project with the Gemini API enabled and an API Key.

## Installation Guide

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Preprocess_Data
```

### 2. Set up the Environment

Create a `.env` file in the root directory (`Preprocess_Data/.env`) to store your API key securely. This file is ignored by Git to protect your credentials.

**File:** `.env`
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Create a Virtual Environment (Recommended)

It is best practice to use a virtual environment to manage dependencies.

**On Windows:**
```powershell
python -m venv .venv
.venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Install Dependencies

Install the required Python packages:

```bash
pip install "lightrag-hku[api]"
pip install eel numpy
```

## How to Run

1.  Ensure your virtual environment is activated.
2.  Run the main application script:

```bash
python query.py
```

3.  The application will initialize the RAG system and automatically open the user interface in a new window (pointing to `UI-for-HUY/index.html`).

## Security Note for GitHub

This project uses a `.gitignore` file to ensure sensitive information is not uploaded to GitHub.
*   The `.env` file (containing your `GEMINI_API_KEY`) is excluded.
*   The `.venv/` directory is excluded.

**Check your `.gitignore`:**
Ensure a file named `.gitignore` exists in the project root with at least the following content:
```gitignore
.env
.venv/
__pycache__/
lightrag.log
```
This prevents your secrets from being accidentally pushed to the repository.
