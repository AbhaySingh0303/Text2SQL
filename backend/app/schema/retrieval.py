import json
from sqlalchemy import inspect, text
from app.database.connection import get_engine
import logging

logger = logging.getLogger(__name__)

# Schema cache dict keyed by database connection URL
_schema_cache = {}

def clear_schema_cache():
    """Clears the internal schema cache forcing re-inspection."""
    global _schema_cache
    _schema_cache.clear()

def get_schema_metadata(use_cache: bool = True) -> dict:
    """
    Inspects PostgreSQL database metadata (tables, columns, datatypes, primary keys, 
    foreign keys, and relationships) and caches the results in memory.
    """
    engine = get_engine()
    db_url = str(engine.url)
    
    if use_cache and db_url in _schema_cache:
        return _schema_cache[db_url]
        
    try:
        # 1. Query the current database name
        with engine.connect() as conn:
            current_db = conn.execute(text("SELECT current_database()")).scalar()
        logger.info(f"Current Database: {current_db}")
        
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        logger.info(f"Discovered Tables: {table_names}")
        
        schema = {
            "tables": {},
            "relationships": []
        }
        
        for table_name in table_names:
            columns = inspector.get_columns(table_name)
            discovered_cols = [col["name"] for col in columns]
            logger.info(f"Discovered Columns for table '{table_name}': {discovered_cols}")
            
            pk_constraint = inspector.get_pk_constraint(table_name)
            pks = pk_constraint.get("constrained_columns", [])
            fks = inspector.get_foreign_keys(table_name)
            
            table_meta = {
                "name": table_name,
                "columns": [],
                "primary_keys": pks,
                "foreign_keys": []
            }
            
            for col in columns:
                col_meta = {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                    "default": str(col.get("default")) if col.get("default") is not None else None
                }
                table_meta["columns"].append(col_meta)
                
            for fk in fks:
                fk_meta = {
                    "constrained_columns": fk["constrained_columns"],
                    "referred_table": fk["referred_table"],
                    "referred_columns": fk["referred_columns"]
                }
                table_meta["foreign_keys"].append(fk_meta)
                
                # Extract and format table relationships
                for cc, rc in zip(fk["constrained_columns"], fk["referred_columns"]):
                    schema["relationships"].append({
                        "from_table": table_name,
                        "from_column": cc,
                        "to_table": fk["referred_table"],
                        "to_column": rc
                    })
                    
            schema["tables"][table_name] = table_meta
            
        logger.info(f"JSON returned by /api/schema: {json.dumps(schema)}")
        _schema_cache[db_url] = schema
        return schema
    except Exception as e:
        logger.error(f"Error querying schema metadata: {e}")
        raise e
