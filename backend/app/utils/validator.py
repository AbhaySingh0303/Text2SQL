import re
import sqlparse
import logging

logger = logging.getLogger(__name__)

ALLOWED_START_KEYWORDS = {"SELECT", "WITH", "SHOW", "EXPLAIN"}
FORBIDDEN_KEYWORDS = {"DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE", "MERGE", "REPLACE"}

def clean_sql_query(sql: str) -> str:
    """
    Robustly extracts and cleans SQL query from LLM responses, stripping
    conversational intro/outro text and markdown code blocks.
    """
    if not sql:
        return ""
    
    # 1. Try to extract content inside markdown code blocks (```sql ... ``` or ``` ... ```)
    code_block_match = re.search(r"```(?:sql)?\s*(.*?)\s*```", sql, re.DOTALL | re.IGNORECASE)
    if code_block_match:
        sql = code_block_match.group(1)
        
    sql = sql.strip()
    
    # 2. Skip any conversational intro text by finding the first start keyword
    start_keywords = ["SELECT", "WITH", "SHOW", "EXPLAIN"]
    pattern = r"\b(" + "|".join(start_keywords) + r")\b"
    match = re.search(pattern, sql, re.IGNORECASE)
    if match:
        sql = sql[match.start():]
        
    # 3. Clean up trailing conversational text or comments after the SQL statement using sqlparse
    try:
        parsed = sqlparse.parse(sql)
        for stmt in parsed:
            # Find first non-whitespace, non-comment token
            first_keyword = None
            for token in stmt.tokens:
                if not token.is_whitespace and token.ttype is not sqlparse.tokens.Comment and not isinstance(token, sqlparse.sql.Comment):
                    first_keyword = token
                    break
            if first_keyword and str(first_keyword).upper().strip() in start_keywords:
                # Return the string representation of just this SQL statement, keeping all its clauses intact
                return str(stmt).strip()
    except Exception:
        pass
        
    return sql.strip()

def validate_sql_query(sql: str) -> tuple[bool, str]:
    """
    Validates that a SQL query contains ONLY read-only operations (SELECT, WITH, SHOW, EXPLAIN).
    Blocks commands like DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE, CREATE, etc.
    
    Returns:
        tuple[bool, str]: (is_valid, cleaned_sql_or_error_message)
    """
    cleaned_sql = clean_sql_query(sql)
    if not cleaned_sql:
        return False, "The query is empty."
        
    try:
        parsed = sqlparse.parse(cleaned_sql)
        if not parsed:
            return False, "Failed to parse SQL statement structure."
            
        for stmt in parsed:
            # Find the first keyword token that is not whitespace or comment
            first_keyword = None
            for token in stmt.tokens:
                if not token.is_whitespace and token.ttype is not sqlparse.tokens.Comment and not isinstance(token, sqlparse.sql.Comment):
                    first_keyword = token
                    break
                    
            if first_keyword is None:
                continue
                
            first_kw_upper = str(first_keyword).upper().strip()
            
            # Enforce that query starts with allowed operations
            if first_kw_upper not in ALLOWED_START_KEYWORDS:
                return False, f"Unauthorized SQL statement type starting with: '{first_kw_upper}'. Only SELECT, WITH, SHOW, and EXPLAIN are allowed."
                
            # Perform deep token inspection on flattened structure
            # to prevent unauthorized DDL/DML in CTEs or nested scopes
            for token in stmt.flatten():
                if token.ttype in sqlparse.tokens.Keyword or token.ttype in sqlparse.tokens.Keyword.DDL or token.ttype in sqlparse.tokens.Keyword.DML:
                    token_val = str(token).upper().strip()
                    if token_val in FORBIDDEN_KEYWORDS:
                        return False, f"SQL query contains unauthorized database operation: '{token_val}'"
                        
    except Exception as e:
        logger.error(f"SQL validation error: {e}")
        return False, f"SQL validation exception: {str(e)}"
        
    return True, cleaned_sql
