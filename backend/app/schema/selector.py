import re
from typing import List, Set, Dict
from app.schema.retrieval import get_schema_metadata
import logging

logger = logging.getLogger(__name__)

STOP_WORDS = {
    "show", "list", "find", "get", "select", "all", "any", "some", "the", "a", "an",
    "of", "in", "on", "at", "by", "for", "with", "from", "to", "than", "more", "less",
    "equal", "greater", "earning", "having", "who", "whose", "where", "and", "or",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did"
}

def tokenize(text: str) -> Set[str]:
    """Tokenizes text, filters stop words, and normalizes tokens for comparison."""
    # Replace non-alphanumeric characters with space and split
    words = re.findall(r'\b\w+\b', text.lower())
    # Return unique tokens, filtering out common stop words
    return {w for w in words if w not in STOP_WORDS}

def singularize(word: str) -> str:
    """Very basic singularization to assist in matching table/column names."""
    if len(word) <= 2:
        return word
    if word.endswith("ies"):
        return word[:-3] + "y"
    elif word.endswith("es") and not word.endswith("ces") and not word.endswith("ses"):
        return word[:-2]
    elif word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word

def select_relevant_schema(query: str) -> dict:
    """
    Analyzes the user's natural language query and filters the full database
    schema metadata down to only the tables and relationships required to answer it.
    """
    full_schema = get_schema_metadata()
    if not full_schema or not full_schema.get("tables"):
        return {"tables": {}, "relationships": []}
        
    query_tokens = tokenize(query)
    # Add singularized tokens to expand matching
    expanded_tokens = set()
    for t in query_tokens:
        expanded_tokens.add(t)
        expanded_tokens.add(singularize(t))
        
    logger.debug(f"Query tokens: {query_tokens}, Expanded: {expanded_tokens}")
    
    table_scores: Dict[str, float] = {}
    
    for table_name, table_meta in full_schema["tables"].items():
        score = 0.0
        table_words = set(table_name.lower().split("_"))
        
        # Match table name tokens
        for word in table_words:
            if word in expanded_tokens:
                score += 10.0
            # Check substring matches
            for token in expanded_tokens:
                if len(token) > 2 and (token in word or word in token):
                    score += 5.0
                    
        # Match column names
        for col in table_meta["columns"]:
            col_words = set(col["name"].lower().split("_"))
            for word in col_words:
                if word in expanded_tokens:
                    score += 6.0
                for token in expanded_tokens:
                    if len(token) > 2 and (token in word or word in token):
                        score += 3.0
                        
        if score > 0:
            table_scores[table_name] = score

    # Select tables with positive score
    selected_tables = set(table_scores.keys())
    
    # If nothing matched, fall back to matching all tables if database is small,
    # or select the top 2 based on basic token overlaps
    if not selected_tables:
        if len(full_schema["tables"]) <= 4:
            selected_tables = set(full_schema["tables"].keys())
        else:
            # Fallback: top 2 tables
            selected_tables = set(list(full_schema["tables"].keys())[:2])

    # Expand selected tables to include foreign key references (FK Closure)
    # This is critical so that the LLM has join schemas!
    expanded_tables = set(selected_tables)
    for table_name in selected_tables:
        table_meta = full_schema["tables"][table_name]
        for fk in table_meta["foreign_keys"]:
            referred = fk["referred_table"]
            if referred in full_schema["tables"]:
                expanded_tables.add(referred)
                
        # Also check other tables referencing this table
        for other_name, other_meta in full_schema["tables"].items():
            for fk in other_meta["foreign_keys"]:
                if fk["referred_table"] == table_name:
                    # Only add if it's a common bridge table or heavily related
                    expanded_tables.add(other_name)
                    
    # Compile the final filtered schema
    filtered_schema = {
        "tables": {},
        "relationships": []
    }
    
    for table_name in expanded_tables:
        filtered_schema["tables"][table_name] = full_schema["tables"][table_name]
        
    for rel in full_schema["relationships"]:
        if rel["from_table"] in expanded_tables and rel["to_table"] in expanded_tables:
            filtered_schema["relationships"].append(rel)
            
    return filtered_schema

def format_schema_for_llm(schema: dict) -> str:
    """Formats the selected schema dictionary into a clean textual representation for LLM prompts."""
    output = []
    
    # Format Tables
    for table_name, table_meta in schema["tables"].items():
        output.append(f"Table: {table_name}")
        cols_str = []
        for col in table_meta["columns"]:
            col_desc = f"  - {col['name']} ({col['type']})"
            if col["name"] in table_meta["primary_keys"]:
                col_desc += " PRIMARY KEY"
            # Add foreign keys references annotations
            for fk in table_meta["foreign_keys"]:
                if col["name"] in fk["constrained_columns"]:
                    idx = fk["constrained_columns"].index(col["name"])
                    referred_col = fk["referred_columns"][idx]
                    col_desc += f" FOREIGN KEY REFERENCES {fk['referred_table']}({referred_col})"
            cols_str.append(col_desc)
        output.extend(cols_str)
        output.append("") # Blank line
        
    # Format Relationships explicitly
    if schema["relationships"]:
        output.append("Relationships:")
        for rel in schema["relationships"]:
            output.append(f"  - {rel['from_table']}.{rel['from_column']} joins with {rel['to_table']}.{rel['to_column']}")
            
    return "\n".join(output)
