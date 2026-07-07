import time
from sqlalchemy import text
from app.database.connection import get_db_connection
import logging

logger = logging.getLogger(__name__)

def execute_query(sql_query: str, max_rows: int = 500, timeout_ms: int = 10000) -> dict:
    """
    Safely executes an SQL read-only statement.
    
    Enforces dynamic timeouts via PostgreSQL `statement_timeout` and formats results 
    into JSON-serializable objects. Restricts actual return payloads to a maximum 
    row threshold while reporting full matching row counts.
    """
    start_time = time.perf_counter()
    
    try:
        with get_db_connection() as conn:
            # Configure database timeout for query
            conn.execute(text(f"SET statement_timeout = {timeout_ms}"))
            
            # Execute statement
            result = conn.execute(text(sql_query))
            
            columns = list(result.keys()) if result.returns_rows else []
            rows = []
            row_count = 0
            
            if result.returns_rows:
                # Fetch all rows to know exact match count
                all_rows = result.fetchall()
                row_count = len(all_rows)
                
                # Format only up to max_rows
                for r in all_rows[:max_rows]:
                    row_data = {}
                    for col_name, val in zip(columns, r):
                        if val is None:
                            row_data[col_name] = None
                        elif hasattr(val, "isoformat"):  # datetime / date / time
                            row_data[col_name] = val.isoformat()
                        elif isinstance(val, bytes):
                            row_data[col_name] = val.hex()
                        elif isinstance(val, (int, float, bool, str)):
                            row_data[col_name] = val
                        else:
                            row_data[col_name] = str(val)
                    rows.append(row_data)
            else:
                row_count = result.rowcount if result.rowcount != -1 else 0
                
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            
            return {
                "success": True,
                "columns": columns,
                "rows": rows,
                "row_count": row_count,
                "execution_time_ms": round(elapsed_ms, 2),
                "error": None
            }
            
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        err_msg = str(e)
        logger.error(f"SQL execution failed: {err_msg}")
        
        is_timeout = "canceling statement due to statement timeout" in err_msg.lower() or "timeout" in err_msg.lower()
        error_type = "TimeoutError" if is_timeout else "DatabaseError"
        friendly_msg = "Database statement execution timed out." if is_timeout else err_msg
        
        return {
            "success": False,
            "columns": [],
            "rows": [],
            "row_count": 0,
            "execution_time_ms": round(elapsed_ms, 2),
            "error": {
                "type": error_type,
                "message": friendly_msg
            }
        }
