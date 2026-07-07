# Text-to-SQL AI Engine ⚡ Local PostgreSQL Assistant

A complete, production-ready, full-stack application that translates natural language questions into safe, optimized PostgreSQL queries using a local LLM (**Ollama + Qwen2.5:1.5b**) and executes them securely with database schema context filtering.

## Key Features & Architectures

1. **Schema-Aware Context Pruning**: Before prompt construction, a scoring token analyzer screens database metadata, selecting ONLY table layouts and relational keys directly referenced in the prompt (preventing token exhaustion and maintaining security).
2. **SSE Streaming**: Generates SQL using Ollama stream APIs, feeding the raw query character-by-character to the frontend for interactive streaming.
3. **Safe Executions**: Restricts queries to read-only statements (`SELECT`, `WITH`, `SHOW`, `EXPLAIN`) using token checks (`sqlparse`). Command types like `DROP`, `DELETE`, `INSERT`, or comments are actively blocked.
4. **Resiliency**: Connects dynamically. Changing details (URLs, database strings, models) in the UI immediately clears metadata caches and spawns updated connection pools.
5. **Polished Dashboard**: Dark-mode primary layout containing schema navigators, query history caching, custom syntax highlights, paginated grid views, and CSV exports.

---

## Complete Quickstart Guide

Ensure your PostgreSQL instance and Ollama server are running before continuing.

### Step 1: Clone or Open Workspace
Ensure the codebase is located in your target directory:
```
Text2SQL/
├── backend/    # FastAPI Python engine
└── frontend/   # Vite React UI client
```

### Step 2: Initialize PostgreSQL Mock Data (Optional)
Run the backend seeder script to populate a sample database for immediate testing:
```bash
cd backend
python -m venv venv
# Activate venv:
# Windows PowerShell: .\venv\Scripts\Activate.ps1
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python bootstrap_db.py
```
*Note: Make sure PostgreSQL credentials in `.env` match your local user.*

### Step 3: Run Backend Server
Inside the active virtual environment in the `backend/` folder, run:
```bash
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health State Check: `http://localhost:8000/api/health`

### Step 4: Run Frontend Dashboard
Open a new shell, and boot up the client:
```bash
cd frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## Example Prompts to Run

Using the default seeded database:
1. `Show all students from CSE.`
2. `Find employees earning more than 50000.`
3. `List all courses offered by Computer Science department.`
4. `Count total course enrollments by department.`
