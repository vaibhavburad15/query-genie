🚀 Query Genie — AI-Powered Natural Language to SQL Assistant

Query Genie is a full-stack AI application that converts natural language queries into SQL, allowing users to interact with relational databases safely and efficiently using a chat-based interface.

Designed with production-grade safety, state management, and scalable architecture, Query Genie bridges the gap between non-technical users and complex database systems.

🔥 Key Highlights (Resume-Friendly)

✅ Built an AI-driven NL → SQL system using FastAPI + React

✅ Implemented safe SQL execution with user confirmation for destructive queries

✅ Designed multi-chat session architecture with dynamic chat titles

✅ Solved real-world issues like duplicate state updates, race conditions, and DB lifecycle management

✅ Followed clean React patterns (single source of truth, controlled components)

✅ Request-scoped database connections (production-ready backend)

✨ Features

🧠 Natural Language to SQL Translation

💬 Chat-based UI for database interaction

🗂️ Multiple Chat Sessions per User

🏷️ Automatic Chat Naming from first user prompt

🔐 Safe Execution Layer for DELETE / UPDATE queries

⚠️ User Confirmation Workflow before destructive operations

📊 Tabular SQL Result Rendering

🔄 Persistent Chat History

🧩 Per-request Database Connections

🚫 Prevents accidental data loss

🏗️ System Architecture
Frontend (React + TypeScript)

React (Functional Components & Hooks)

TypeScript

Tailwind CSS

Vite

Custom Chat Session Management

Optimistic UI updates

Controlled input handling

Confirmation UI for SQL execution

Backend (FastAPI + Python)

FastAPI (REST APIs)

SQLAlchemy ORM

LangChain SQLDatabase

OpenAI API

Request-scoped DB connections

MySQL / PostgreSQL compatible

Secure SQL execution pipeline

🔒 Database Safety & Security

Query Genie follows production-grade safety principles:

❌ No auto-execution of destructive SQL

⚠️ DELETE / UPDATE queries require explicit user confirmation

🧾 SQL preview before execution

🛑 Users can cancel execution at any time

🔄 Prevents duplicate SQL execution

🔐 No global DB connections (thread-safe)

🧠 Engineering Challenges Solved

Fixed double-submit bugs in React forms

Eliminated duplicate message insertion

Designed single source of truth for chat state

Implemented DB-scoped chat sessions

Prevented infinite confirmation loops

Improved UX by binding chat lifecycle to DB connection

Followed clean separation of concerns (UI vs logic)

⚙️ Setup Instructions
🔹 Backend Setup
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend:app --reload


Backend runs on:

http://localhost:8000

🔹 Frontend Setup
cd frontend
npm install
npm run dev


Frontend runs on:

http://localhost:8080

🔑 Environment Variables

Create a .env file in backend:

OPENAI_API_KEY=your_openai_api_key

🧪 Example Queries
Show all tables
Get top 5 students by marks
Delete student where id = 144
Update marks of student where id = 10

🚦 Confirmation Flow (Example)
⚠️ WARNING: This action will permanently modify the database.

Action: DELETE
Table: students
Condition: id = 144

Do you want to continue?
[Confirm] [Cancel]

🛠️ Tech Stack (ATS Keywords)

React.js

TypeScript

Tailwind CSS

FastAPI

Python

SQLAlchemy

LangChain

OpenAI API

MySQL / PostgreSQL

REST APIs

Git & GitHub

Vite

📌 Roadmap

 Dockerized deployment

 Render / Railway hosting

 Query audit logs

 Role-based database permissions

 CSV / Excel export

 Multi-database support

 Authentication-based chat isolation

📄 License

MIT License

👨‍💻 Author

Vaibhav Burad
Engineering (IT) | Cloud, AI & Backend Enthusiast

GitHub: https://github.com/vaibhavburad15

Skills: React, FastAPI, SQL, AI, Cloud, System Design

⭐ Why This Project Matters

Query Genie demonstrates:

Full-stack engineering skills

AI integration in real-world systems

Strong debugging and architectural thinking

Production-focused development mindset
