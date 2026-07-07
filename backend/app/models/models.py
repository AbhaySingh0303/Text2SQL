from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class SettingsModel(BaseModel):
    database_url: str = Field(..., description="PostgreSQL database connection URL")
    ollama_url: str = Field(..., description="Ollama API URL")
    ollama_model: str = Field(..., description="Ollama model string (e.g., qwen2.5:1.5b)")
    ollama_temperature: float = Field(..., description="Temperature scaling parameter (0.0 to 1.0)")

class SQLGenerateRequest(BaseModel):
    prompt: str = Field(..., description="Natural language database query")

class SQLExecuteRequest(BaseModel):
    sql: str = Field(..., description="SQL query string to run on the database")

class ChatRequest(BaseModel):
    message: str = Field(..., description="Chat question from the user")

class SQLGenerateResponse(BaseModel):
    success: bool
    sql: Optional[str] = None
    selected_tables: List[str]
    error: Optional[str] = None

class SQLExecuteResponse(BaseModel):
    success: bool
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: float
    error: Optional[Dict[str, str]] = None
