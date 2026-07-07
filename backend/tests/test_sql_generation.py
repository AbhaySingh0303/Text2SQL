import unittest
import asyncio
import os
import sys

# Add backend directory to path so imports work correctly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.utils.validator import clean_sql_query, validate_sql_query
from app.schema.selector import select_relevant_schema, format_schema_for_llm
from app.prompts.templates import generate_prompt, SYSTEM_PROMPT
from app.llm.ollama_client import stream_ollama_generate

class TestSQLCleaning(unittest.TestCase):
    def test_clean_raw_sql(self):
        # Raw sql should remain unmodified except for trim
        self.assertEqual(clean_sql_query("SELECT * FROM students;"), "SELECT * FROM students;")

    def test_clean_markdown_fence(self):
        # SQL inside markdown block
        raw = "```sql\nSELECT * FROM employees WHERE salary > 50000;\n```"
        self.assertEqual(clean_sql_query(raw), "SELECT * FROM employees WHERE salary > 50000;")

    def test_clean_conversational_intro(self):
        # Conversational prefix before SQL
        raw = "Here is the query you requested:\nSELECT * FROM courses;"
        self.assertEqual(clean_sql_query(raw), "SELECT * FROM courses;")

    def test_clean_conversational_outro(self):
        # Conversational suffix after SQL statement
        raw = "SELECT name, email FROM students WHERE gpa > 3.5;\n\nThis query filters students based on their GPA."
        self.assertEqual(clean_sql_query(raw), "SELECT name, email FROM students WHERE gpa > 3.5;")

    def test_clean_complex_wrapping(self):
        # Markdown + intro + outro comments
        raw = """Sure! Here is the PostgreSQL query:
```sql
SELECT c.title, d.name 
FROM courses c 
JOIN departments d ON c.department_id = d.id 
WHERE d.code = 'CSE';
```
This query joins the courses and departments tables."""
        expected = "SELECT c.title, d.name \nFROM courses c \nJOIN departments d ON c.department_id = d.id \nWHERE d.code = 'CSE';"
        # Strip/normalize whitespace for comparison
        clean = clean_sql_query(raw)
        self.assertEqual(" ".join(clean.split()), " ".join(expected.split()))


class TestSQLValidation(unittest.TestCase):
    def test_valid_select(self):
        valid, sql = validate_sql_query("SELECT * FROM students WHERE id = 1;")
        self.assertTrue(valid)
        self.assertEqual(sql, "SELECT * FROM students WHERE id = 1;")

    def test_valid_with(self):
        query = "WITH cse_students AS (SELECT * FROM students WHERE department_id = 1) SELECT * FROM cse_students;"
        valid, sql = validate_sql_query(query)
        self.assertTrue(valid)

    def test_invalid_dml(self):
        # Blocks update statements
        valid, msg = validate_sql_query("UPDATE students SET gpa = 4.0 WHERE id = 1;")
        self.assertFalse(valid)
        self.assertIn("unauthorized", msg.lower())

    def test_invalid_ddl(self):
        # Blocks drop/delete statements
        valid, msg = validate_sql_query("DROP TABLE students;")
        self.assertFalse(valid)
        self.assertIn("unauthorized", msg.lower())


class TestSchemaSelection(unittest.TestCase):
    def setUp(self):
        from app.schema.retrieval import clear_schema_cache
        clear_schema_cache()

    def test_relevant_table_matching(self):
        # "employees" table should match and select
        schema = select_relevant_schema("Find all employees in the database")
        self.assertIn("employees", schema["tables"])

    def test_join_tables_matching(self):
        # Should match both courses and departments due to keyword and relationships
        schema = select_relevant_schema("Show all courses in the CSE department")
        self.assertIn("courses", schema["tables"])
        self.assertIn("departments", schema["tables"])


class TestSQLGenerationIntegration(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        from app.schema.retrieval import clear_schema_cache
        clear_schema_cache()

    async def get_ollama_sql(self, prompt: str) -> str:
        chunks = []
        async for chunk in stream_ollama_generate(prompt, SYSTEM_PROMPT):
            chunks.append(chunk)
        return "".join(chunks)

    async def test_filtering_and_comparison_generation(self):
        # Test: "Show all employees earning more than 50000"
        schema = select_relevant_schema("Show all employees earning more than 50000")
        formatted = format_schema_for_llm(schema)
        prompt = generate_prompt("Show all employees earning more than 50000", formatted)
        
        raw_response = await self.get_ollama_sql(prompt)
        cleaned = clean_sql_query(raw_response)
        
        valid, validated_sql = validate_sql_query(cleaned)
        self.assertTrue(valid, f"Generated query was invalid: {cleaned}")
        self.assertIn("WHERE", validated_sql.upper())
        self.assertTrue("50000" in validated_sql or "50000.00" in validated_sql)
        self.assertIn("employees", validated_sql.lower())

    async def test_sorting_and_limit_generation(self):
        # Test: "List top 5 highest paid employees"
        schema = select_relevant_schema("List top 5 highest paid employees")
        formatted = format_schema_for_llm(schema)
        prompt = generate_prompt("List top 5 highest paid employees", formatted)
        
        raw_response = await self.get_ollama_sql(prompt)
        cleaned = clean_sql_query(raw_response)
        
        valid, validated_sql = validate_sql_query(cleaned)
        self.assertTrue(valid, f"Generated query was invalid: {cleaned}")
        self.assertIn("ORDER BY", validated_sql.upper())
        self.assertIn("LIMIT", validated_sql.upper())
        self.assertIn("5", validated_sql)

    async def test_aggregation_and_grouping_generation(self):
        # Test: "Count employees in each department"
        schema = select_relevant_schema("Count employees in each department")
        formatted = format_schema_for_llm(schema)
        prompt = generate_prompt("Count employees in each department", formatted)
        
        raw_response = await self.get_ollama_sql(prompt)
        cleaned = clean_sql_query(raw_response)
        
        valid, validated_sql = validate_sql_query(cleaned)
        self.assertTrue(valid, f"Generated query was invalid: {cleaned}")
        self.assertIn("GROUP BY", validated_sql.upper())
        self.assertTrue("COUNT" in validated_sql.upper() or "SUM" in validated_sql.upper())

    async def test_joins_generation(self):
        # Test: "Show courses offered by the CSE department"
        schema = select_relevant_schema("Show courses offered by the CSE department")
        formatted = format_schema_for_llm(schema)
        prompt = generate_prompt("Show courses offered by the CSE department", formatted)
        
        raw_response = await self.get_ollama_sql(prompt)
        cleaned = clean_sql_query(raw_response)
        
        valid, validated_sql = validate_sql_query(cleaned)
        self.assertTrue(valid, f"Generated query was invalid: {cleaned}")
        self.assertIn("JOIN", validated_sql.upper())

if __name__ == '__main__':
    unittest.main()
