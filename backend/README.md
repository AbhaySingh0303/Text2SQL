# Text-to-SQL API Engine (Backend)

A clean-architecture FastAPI backend that reads PostgreSQL metadata, performs schema pruning, translates natural language into SQL using Ollama + Qwen2.5:1.5b, parses queries to validate read-only safety, and executes queries on target databases.

## Project Structure

```
backend/
├── app/
│   ├── api/
│   ├── core/
│   │   ├── config.py         # Dynamic app settings (Pydantic BaseSettings)
│   │   └── settings.json     # Local runtime configuration persistence
│   ├── database/
│   │   └── connection.py     # SQLAlchemy dynamic engine pools
│   ├── llm/
│   │   └── ollama_client.py  # SSE stream client connecting to Ollama
│   ├── prompts/
│   │   └── templates.py      # Instructions tailored for Qwen2.5:1.5b
│   ├── schema/
│   │   ├── retrieval.py      # PostgreSQL structural schema extractor
│   │   └── selector.py       # Scoring token selector for schema pruning
│   ├── services/
│   │   └── executor.py       # SQL runtime execution (timeouts, column formats)
│   ├── models/
│   │   └── models.py         # Request and Response schemas
│   ├── utils/
│   │   └── validator.py      # Read-only query filter (sqlparse analyzer)
│   └── main.py               # FastAPI application definition and controllers
├── .env                      # Connection variables
├── requirements.txt          # Python dependency specification
└── bootstrap_db.py           # PostgreSQL sample schema database seed script
```

## Installation & Setup

### 1. Prerequisites
- Python 3.10 or higher
- A local or remote PostgreSQL database instance running
- [Ollama](https://ollama.com/) running locally

### 2. Setup Ollama
To fetch and run the Qwen2.5 1.5B LLM, run the following in your terminal:
```bash
ollama pull qwen2.5:1.5b
```
Ensure Ollama is running at `http://localhost:11434`.

### 3. Backend Setup
1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```
2. Activate the virtual environment:
   - **Windows PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Verify your `.env` configuration (copied automatically from `.env.example`). Adjust the credentials to target your PostgreSQL instance if different:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=qwen2.5:1.5b
   OLLAMA_TEMPERATURE=0.0
   ```

### 4. Seed database (Optional but recommended)
Run the bootstrap seeder to create sample tables (`students`, `departments`, `courses`, `enrollments`, `employees`) and populate them with standard mock datasets for instant testing:
```bash
python bootstrap_db.py
```

### 5. Start Backend server
Launch the FastAPI uvicorn daemon:
```bash
uvicorn app.main:app --reload --port 8000
```
The server API endpoints will be accessible at `http://localhost:8000`. You can view interactive docs at `http://localhost:8000/docs`.
