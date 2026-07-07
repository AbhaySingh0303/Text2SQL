# 🚀 Text2SQL Engine

A full-stack AI-powered **Text-to-SQL** application that converts natural language into executable PostgreSQL queries using **Ollama (Qwen 2.5)** and executes them on a connected PostgreSQL database.

Users can ask questions in plain English, and the application automatically generates SQL, executes it, and displays the results.

---

## ✨ Features

- 🧠 Natural Language to SQL conversion
- 🗄️ Automatic PostgreSQL schema discovery
- 🎯 Dynamic schema selection for relevant tables
- ⚡ SQL execution with result visualization
- 📜 Query history
- 📊 Download query results as CSV
- 🔍 SQL validation before execution
- 🤖 Local LLM support using Ollama
- 🌙 Modern responsive UI
- 🔐 Secure database connection configuration

---

# 📸 Screenshots

## Home Page

> Add screenshot here

![Home](screenshots/home.png)

---

## Generated SQL

> Add screenshot here

![SQL](screenshots/sql.png)

---

## Query Results

> Add screenshot here

![Results](screenshots/results.png)

---

# 🏗️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- FastAPI
- SQLAlchemy
- Psycopg2
- Pydantic

### Database

- PostgreSQL

### AI

- Ollama
- Qwen 2.5

---

# 📂 Project Structure

```
Text2SQL/
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── database/
│   │   ├── llm/
│   │   ├── models/
│   │   ├── prompts/
│   │   ├── schema/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── bootstrap_db.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── README.md
└── .gitignore
```

---

# ⚙️ Installation

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/Text2SQL.git

cd Text2SQL
```

---

## 2. Install PostgreSQL

Download:

https://www.postgresql.org/download/

Create a database.

Example:

```
Database Name : postgres

Username : postgres

Password : your_password
```

---

## 3. Install Ollama

Download:

https://ollama.com/download

Pull the model:

```bash
ollama pull qwen2.5:1.5b
```

Run Ollama

```bash
ollama serve
```

---

# Backend Setup

Go to backend

```bash
cd backend
```

Create virtual environment

```bash
python -m venv venv
```

Activate

Windows

```bash
venv\Scripts\activate
```

Linux/Mac

```bash
source venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Create `.env`

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres

OLLAMA_URL=http://localhost:11434

OLLAMA_MODEL=qwen2.5:1.5b

OLLAMA_TEMPERATURE=0
```

Run backend

```bash
python -m uvicorn app.main:app --reload
```

Backend runs at

```
http://localhost:8000
```

Swagger

```
http://localhost:8000/docs
```

---

# Frontend Setup

Go to frontend

```bash
cd frontend
```

Install packages

```bash
npm install
```

Run

```bash
npm run dev
```

Frontend

```
http://localhost:5173
```

---

# Example Prompts

```
Show all students.

Show all students from CSE.

Show students whose CGPA is greater than 8.5.

Count students in each branch.

List students ordered by CGPA.

Find students older than 20.

Show top 5 students by CGPA.

Display students whose names start with A.
```

---

# API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/health` | Health Check |
| GET | `/api/schema` | Retrieve Database Schema |
| POST | `/api/generate` | Generate SQL |
| POST | `/api/execute` | Execute SQL |

---

# Workflow

```
User Prompt
      │
      ▼
Schema Retrieval
      │
      ▼
Relevant Schema Selection
      │
      ▼
Prompt Construction
      │
      ▼
Ollama (Qwen)
      │
      ▼
Generated SQL
      │
      ▼
SQL Validation
      │
      ▼
Execute PostgreSQL Query
      │
      ▼
Display Results
```

---

# Future Improvements

- Database schema caching
- Multi-database support (MySQL, SQLite)
- Chat history
- SQL explanation
- Query optimization suggestions
- Export to Excel
- Authentication
- Docker support
- Cloud deployment
- Fine-tuned LLM

---

# Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.

```
git checkout -b feature-name
```

3. Commit changes.

```
git commit -m "Added new feature"
```

4. Push.

```
git push origin feature-name
```

5. Open a Pull Request.

---

# Author

**Abhay Singh**

