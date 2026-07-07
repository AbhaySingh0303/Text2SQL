import json
import logging
import httpx
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.core.config import get_settings, save_settings, AppSettings
from app.database.connection import test_connection, clear_engine_cache
from app.schema.retrieval import get_schema_metadata, clear_schema_cache
from app.schema.selector import select_relevant_schema, format_schema_for_llm
from app.llm.ollama_client import stream_ollama_generate
from app.prompts.templates import generate_prompt, SYSTEM_PROMPT
from app.utils.validator import validate_sql_query
from app.services.executor import execute_query
from app.models.models import SettingsModel, SQLGenerateRequest, SQLExecuteRequest, ChatRequest

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("text2sql_backend")

app = FastAPI(
    title="Text-to-SQL API Engine",
    description="Backend AI database translation & execution system",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to local host origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Returns application health, testing PostgreSQL and Ollama connections."""
    settings = get_settings()
    db_connected = test_connection(settings.database_url)
    
    ollama_online = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.ollama_url.rstrip('/')}/api/tags")
            if res.status_code == 200:
                ollama_online = True
    except Exception:
        pass
        
    return {
        "status": "healthy",
        "database_connected": db_connected,
        "ollama_online": ollama_online,
        "settings": {
            "database_url": settings.database_url,
            "ollama_url": settings.ollama_url,
            "ollama_model": settings.ollama_model,
            "ollama_temperature": settings.ollama_temperature
        }
    }

@app.get("/api/settings")
def get_current_settings():
    """Retrieves current application settings."""
    return get_settings()

@app.post("/api/settings")
def update_current_settings(payload: SettingsModel):
    """Updates database and LLM connections, clearing schema cache on DB change."""
    settings = get_settings()
    db_changed = settings.database_url != payload.database_url
    
    # Validate database connection before saving if URL changed
    if db_changed and not test_connection(payload.database_url):
        raise HTTPException(
            status_code=400, 
            detail="Database connection failed with the provided connection string."
        )
        
    new_settings = AppSettings(
        database_url=payload.database_url,
        ollama_url=payload.ollama_url,
        ollama_model=payload.ollama_model,
        ollama_temperature=payload.ollama_temperature
    )
    save_settings(new_settings)
    
    if db_changed:
        clear_schema_cache()
        clear_engine_cache()
        
    return {"success": True, "message": "Settings updated successfully."}

@app.get("/api/schema")
def read_schema():
    """Returns database schema layout, forcing refreshing metadata inspects."""
    try:
        metadata = get_schema_metadata(use_cache=False)
        return metadata
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Schema inspection failed: {str(e)}"
        )

@app.post("/api/generate-sql")
async def generate_sql(payload: SQLGenerateRequest):
    """
    Selects relevant tables and generates SQL query streaming back the output.
    """
    logger.info(f"[DEBUG] Original user prompt: {payload.prompt}")
    try:
        relevant_schema = select_relevant_schema(payload.prompt)
        selected_tables = list(relevant_schema["tables"].keys())
        logger.info(f"[DEBUG] Selected schema: {json.dumps(relevant_schema)}")
    except Exception as e:
        logger.error(f"Schema filter analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Schema filter analysis error: {str(e)}")
        
    formatted_schema = format_schema_for_llm(relevant_schema)
    prompt = generate_prompt(payload.prompt, formatted_schema)
    logger.info(f"[DEBUG] Final prompt sent to LLM: {prompt}")
    
    async def sse_generator():
        # Yield metadata event
        yield f"data: {json.dumps({'event': 'metadata', 'selected_tables': selected_tables})}\n\n"
        
        full_sql = []
        try:
            async for chunk in stream_ollama_generate(prompt, SYSTEM_PROMPT):
                full_sql.append(chunk)
                yield f"data: {json.dumps({'event': 'chunk', 'text': chunk})}\n\n"
                
            raw_sql = "".join(full_sql)
            logger.info(f"[DEBUG] Raw LLM response: {raw_sql}")
            
            from app.utils.validator import clean_sql_query
            extracted_sql = clean_sql_query(raw_sql)
            logger.info(f"[DEBUG] Extracted SQL: {extracted_sql}")
            
            is_valid, validation_res = validate_sql_query(raw_sql)
            if is_valid:
                logger.info(f"[DEBUG] Final validated SQL: {validation_res}")
                yield f"data: {json.dumps({'event': 'done', 'sql': validation_res})}\n\n"
            else:
                logger.info(f"[DEBUG] Final validated SQL: Validation Failed: {validation_res}")
                yield f"data: {json.dumps({'event': 'error', 'message': f'Validation failed: {validation_res}', 'sql': raw_sql})}\n\n"
        except Exception as e:
            logger.error(f"Error in SQL generation stream: {e}")
            yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@app.post("/api/execute-sql")
def run_sql(payload: SQLExecuteRequest):
    """Executes a user-supplied SQL statement after running safety validations."""
    is_valid, validation_res = validate_sql_query(payload.sql)
    if not is_valid:
        return {
            "success": False,
            "columns": [],
            "rows": [],
            "row_count": 0,
            "execution_time_ms": 0.0,
            "error": {
                "type": "ValidationError",
                "message": validation_res
            }
        }
        
    return execute_query(validation_res)

@app.post("/api/chat")
async def chat_handler(payload: ChatRequest):
    """
    Handles natural language queries end-to-end: filters schema, streams generated SQL, 
    validates the SQL, runs the query, and streams back the result payload.
    """
    logger.info(f"[DEBUG] Original user prompt: {payload.message}")
    try:
        relevant_schema = select_relevant_schema(payload.message)
        selected_tables = list(relevant_schema["tables"].keys())
        logger.info(f"[DEBUG] Selected schema: {json.dumps(relevant_schema)}")
    except Exception as e:
        logger.error(f"Schema select failed: {str(e)}")
        async def err_gen():
            yield f"data: {json.dumps({'event': 'error', 'message': f'Schema select failed: {str(e)}'})}\n\n"
        return StreamingResponse(err_gen(), media_type="text/event-stream")
        
    formatted_schema = format_schema_for_llm(relevant_schema)
    prompt = generate_prompt(payload.message, formatted_schema)
    logger.info(f"[DEBUG] Final prompt sent to LLM: {prompt}")
    
    async def chat_sse_generator():
        yield f"data: {json.dumps({'event': 'metadata', 'selected_tables': selected_tables})}\n\n"
        
        full_sql_chunks = []
        try:
            async for chunk in stream_ollama_generate(prompt, SYSTEM_PROMPT):
                full_sql_chunks.append(chunk)
                yield f"data: {json.dumps({'event': 'sql_chunk', 'text': chunk})}\n\n"
                
            raw_sql = "".join(full_sql_chunks)
            logger.info(f"[DEBUG] Raw LLM response: {raw_sql}")
            
            from app.utils.validator import clean_sql_query
            extracted_sql = clean_sql_query(raw_sql)
            logger.info(f"[DEBUG] Extracted SQL: {extracted_sql}")
            
            is_valid, validation_res = validate_sql_query(raw_sql)
            if not is_valid:
                logger.info(f"[DEBUG] Final validated SQL: Validation Failed: {validation_res}")
                yield f"data: {json.dumps({'event': 'validation_error', 'message': validation_res, 'sql': raw_sql})}\n\n"
                return
                
            logger.info(f"[DEBUG] Final validated SQL: {validation_res}")
            yield f"data: {json.dumps({'event': 'sql_done', 'sql': validation_res})}\n\n"
            
            # Execute safety-validated query
            exec_res = execute_query(validation_res)
            yield f"data: {json.dumps({'event': 'execution_result', 'result': exec_res})}\n\n"
        except Exception as e:
            logger.error(f"Error in chat SQL generation stream: {e}")
            yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
            
    return StreamingResponse(chat_sse_generator(), media_type="text/event-stream")
