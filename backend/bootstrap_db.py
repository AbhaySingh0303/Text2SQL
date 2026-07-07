import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load configurations from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

def main():
    print(f"Connecting to database to seed tables using URL: {DATABASE_URL}")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            # Execute database updates inside an explicit transaction block
            with conn.begin():
                print("Dropping existing tables to refresh database...")
                conn.execute(text("DROP TABLE IF EXISTS enrollments CASCADE;"))
                conn.execute(text("DROP TABLE IF EXISTS courses CASCADE;"))
                conn.execute(text("DROP TABLE IF EXISTS students CASCADE;"))
                conn.execute(text("DROP TABLE IF EXISTS departments CASCADE;"))
                conn.execute(text("DROP TABLE IF EXISTS employees CASCADE;"))
                
                print("Creating table: departments")
                conn.execute(text("""
                    CREATE TABLE departments (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        code VARCHAR(10) UNIQUE NOT NULL,
                        budget NUMERIC(12, 2),
                        head VARCHAR(100)
                    );
                """))
                
                print("Creating table: students")
                conn.execute(text("""
                    CREATE TABLE students (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
                        gpa NUMERIC(3, 2) CHECK (gpa >= 0.0 AND gpa <= 4.0),
                        enrollment_date DATE DEFAULT CURRENT_DATE
                    );
                """))
                
                print("Creating table: courses")
                conn.execute(text("""
                    CREATE TABLE courses (
                        id SERIAL PRIMARY KEY,
                        title VARCHAR(150) NOT NULL,
                        code VARCHAR(15) UNIQUE NOT NULL,
                        credits INTEGER CHECK (credits > 0),
                        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL
                    );
                """))
                
                print("Creating table: enrollments")
                conn.execute(text("""
                    CREATE TABLE enrollments (
                        id SERIAL PRIMARY KEY,
                        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
                        grade CHAR(2),
                        semester VARCHAR(20)
                    );
                """))

                print("Creating table: employees")
                conn.execute(text("""
                    CREATE TABLE employees (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        salary NUMERIC(10, 2) NOT NULL,
                        department VARCHAR(50) NOT NULL,
                        hire_date DATE DEFAULT CURRENT_DATE
                    );
                """))
                
                print("Inserting record data: departments")
                conn.execute(text("""
                    INSERT INTO departments (name, code, budget, head) VALUES
                    ('Computer Science and Engineering', 'CSE', 250000.00, 'Dr. Alan Turing'),
                    ('Electrical Engineering', 'EE', 180000.00, 'Dr. Nikola Tesla'),
                    ('Mechanical Engineering', 'ME', 150000.00, 'Dr. James Watt'),
                    ('Mathematics and Physics', 'MATH', 100000.00, 'Dr. Isaac Newton');
                """))
                
                print("Inserting record data: students")
                conn.execute(text("""
                    INSERT INTO students (name, email, department_id, gpa, enrollment_date) VALUES
                    ('Alice Smith', 'alice@cse.university.edu', 1, 3.85, '2024-09-01'),
                    ('Bob Jones', 'bob@ee.university.edu', 2, 3.45, '2024-09-01'),
                    ('Charlie Brown', 'charlie@cse.university.edu', 1, 3.92, '2023-09-01'),
                    ('Diana Prince', 'diana@math.university.edu', 4, 3.70, '2025-01-15'),
                    ('Evan Wright', 'evan@me.university.edu', 3, 2.95, '2024-09-01'),
                    ('Fiona Gallagher', 'fiona@cse.university.edu', 1, 3.10, '2024-09-01');
                """))
                
                print("Inserting record data: courses")
                conn.execute(text("""
                    INSERT INTO courses (title, code, credits, department_id) VALUES
                    ('Introduction to Programming', 'CS101', 4, 1),
                    ('Data Structures and Algorithms', 'CS201', 4, 1),
                    ('Basic Circuit Analysis', 'EE101', 3, 2),
                    ('Thermodynamics', 'ME201', 3, 3),
                    ('Linear Algebra and Calculus', 'MATH101', 4, 4),
                    ('Database Management Systems', 'CS301', 4, 1);
                """))
                
                print("Inserting record data: enrollments")
                conn.execute(text("""
                    INSERT INTO enrollments (student_id, course_id, grade, semester) VALUES
                    (1, 1, 'A', 'Fall 2024'),
                    (1, 2, 'A-', 'Fall 2024'),
                    (2, 3, 'B+', 'Fall 2024'),
                    (3, 1, 'A', 'Fall 2023'),
                    (3, 6, 'A', 'Fall 2024'),
                    (4, 5, 'A', 'Spring 2025'),
                    (5, 4, 'B-', 'Fall 2024'),
                    (6, 1, 'B', 'Fall 2024');
                """))

                print("Inserting record data: employees")
                conn.execute(text("""
                    INSERT INTO employees (name, email, salary, department, hire_date) VALUES
                    ('John Doe', 'john.doe@company.com', 65000.00, 'CSE', '2023-03-01'),
                    ('Jane Watson', 'jane.watson@company.com', 75000.00, 'EE', '2022-06-15'),
                    ('Sherlock Holmes', 'sherlock@company.com', 95000.00, 'MATH', '2021-01-10'),
                    ('Mycroft Holmes', 'mycroft@company.com', 120000.00, 'CSE', '2019-11-20'),
                    ('Irene Adler', 'irene@company.com', 85000.00, 'ME', '2024-02-01');
                """))
                
            print("Successfully bootstrapped and seeded PostgreSQL database!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        print("Please ensure your local PostgreSQL database server is running and database URL credentials are correct.")

if __name__ == "__main__":
    main()
