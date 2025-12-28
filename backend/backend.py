import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from passlib.context import CryptContext
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_community.utilities import SQLDatabase
from langchain_groq import ChatGroq
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import ast
import json
import re
from langchain.sql_database import SQLDatabase

# Load environment variables
load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise RuntimeError("GROQ_API_KEY not found in environment variables")

#              >>>>> EMAIL CONFIGURATION <<<<<
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
    print("WARNING: Email credentials not found. OTP sending will be disabled.")
# ===============================================================

# --- Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- SQLite Database Setup with Connection Pooling ---
SQLITE_DB_FILE = "users.db"
engine = create_engine(
    f"sqlite:///{SQLITE_DB_FILE}", 
    echo=False,
    pool_pre_ping=True,      # Test connections before using
    pool_recycle=3600,       # Recycle connections every hour
    pool_size=5,             # Limit connection pool size
    max_overflow=10          # Maximum overflow connections
)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    firstName = Column(String, nullable=False)
    lastName = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    username = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)

# Create the database tables
Base.metadata.create_all(engine)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8081", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Vars (For Demo) ---

chat_history = [AIMessage(content="Hello! I'm your database assistant.")]

otp_storage = {}  
pending_sql_actions = {}



class DBConfig(BaseModel):
    host: str
    port: int
    user: str
    password: str = ""
    database: str

class ChatRequest(BaseModel):
    question: str
    chat_history: list = []  # Make it optional with default empty list

# --- Auth Models ---
class UserCreate(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    otp: str
    gender: str
    username: str

class UserLogin(BaseModel):
    identifier: str
    password: str

# Chat Session Model
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String, nullable=False)
    messages = Column(Text, nullable=False)

# Create the chat_sessions table if not exists
Base.metadata.create_all(engine)

class OtpRequest(BaseModel):
    email: EmailStr
    
# --- Database Session Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(recipient_email: str, otp: str):
    if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
        print(f"Skipping email send. OTP for {recipient_email} is {otp}")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = "Your Verification Code"
    message["From"] = EMAIL_HOST_USER
    message["To"] = recipient_email

    html = f"""
    <html>
    <body>
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
            <h2>Welcome to Query Genie!</h2>
            <p>Your one-time verification code is:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #007BFF;">{otp}</p>
            <p>This code will expire in 5 minutes.</p>
        </div>
    </body>
    </html>
    """
    message.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.sendmail(EMAIL_HOST_USER, recipient_email, message.as_string())
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP email.")
# ===============================================================
# ---------------- SQL SAFETY HELPERS ----------------

DANGEROUS_KEYWORDS = ["DROP", "TRUNCATE", "DELETE", "ALTER", "UPDATE"]

def detect_dangerous_sql(sql: str):
    sql_upper = sql.upper()
    return [kw for kw in DANGEROUS_KEYWORDS if kw in sql_upper]

def explain_sql_impact(sql: str, keywords: list[str]) -> str:
    explanations = {
        "DROP": "permanently delete a database or table",
        "TRUNCATE": "remove ALL rows from a table instantly",
        "DELETE": "remove records from a table",
        "ALTER": "change the table structure",
        "UPDATE": "modify existing data in the table"
    }

    impacts = [explanations[k] for k in keywords if k in explanations]

    message = (
        "⚠️ WARNING: This is a destructive database operation.\n\n"
        f"SQL Generated:\n{sql}\n\n"
        "If executed, this will:\n"
    )

    for impact in impacts:
        message += f"- {impact}\n"

    message += "\nDo you want to continue?\nSend CONFIRM to execute or CANCEL to stop."

    return message

def sql_to_table_preview(sql: str):
    sql_upper = sql.upper()

    action = "UNKNOWN"
    table = "-"
    condition = "-"

    if sql_upper.startswith("DELETE"):
        action = "DELETE"
        match = re.search(r"FROM\s+(\w+)", sql_upper)
        if match:
            table = match.group(1)

        where_match = re.search(r"WHERE\s+(.+)", sql, re.IGNORECASE)
        if where_match:
            condition = where_match.group(1)

    return {
        "columns": ["Action", "Table", "Condition", "Impact"],
        "data": [
            [
                action,
                table,
                condition,
                "Removes record(s) permanently"
            ]
        ]
    }

# --- Auth Helpers ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(identifier: str, db):
    return db.query(User).filter(User.email == identifier).first()

# Removed get_current_user function as JWT auth is removed

# --- DB & LangChain Helpers ---
def init_database(user, password, host, port, database):
    try:
        db_uri = f"mysql+mysqlconnector://{user}:{password}@{host}:{port}/{database}"
        return SQLDatabase.from_uri(db_uri)
    except SQLAlchemyError as e:
        raise HTTPException(status_code=400, detail=f"DB connection failed: {e}")

def get_sql_chain(db):
    template = """
    You are a MySQL expert. Given the schema and chat history,
    generate a SINGLE valid MySQL statement (DDL, DML, DCL, TCL, or queries with JOINS/CONSTRAINTS/TRIGGERS).
    
    IMPORTANT RULES:
    1. When using aggregate functions (AVG, SUM, COUNT, MAX, MIN), you MUST include a GROUP BY clause for any non-aggregated columns in SELECT
    2. If you select both aggregated and non-aggregated columns, GROUP BY the non-aggregated ones
    3. Include only the SQL; no explanations, markdown, or extra text
    4. Ensure the query is compatible with sql_mode=only_full_group_by
    5. For aggregate queries, structure should be: SELECT column, AGG_FUNC(column) FROM table GROUP BY column

    Schema:
    {schema}

    Chat History (recent context):
    {chat_history}

    User Question:
    {question}

    Your response must contain ONLY the SQL statement. Do NOT add any extra text, commentary, or code formatting like ```sql.
    """
    prompt = ChatPromptTemplate.from_template(template)
    llm = ChatGroq(api_key=groq_api_key, model="llama-3.1-8b-instant", temperature=0)
    def get_schema(_):
        return db.get_table_info()
    return (
        RunnablePassthrough.assign(schema=get_schema)
        | prompt
        | llm
        | StrOutputParser()
    )

def get_response(question, db, chat_history):
    chain = get_sql_chain(db)
    
    # ✅ TOKEN LIMIT FIX: Only use last 5 messages (increased from 3 for better context)
    # This prevents token exhaustion after multiple queries while maintaining context
    recent_history = chat_history[-5:] if len(chat_history) > 5 else chat_history
    
    formatted_chat_history = "\n".join([
        f"{'Human' if isinstance(msg, HumanMessage) else 'AI'}: {msg.content}"
        for msg in recent_history
    ])
    
    connection = None  # Track connection for proper cleanup
    
    try:
        response_text = chain.invoke({
            "question": question,
            "chat_history": formatted_chat_history
        })
        sql_query = response_text.strip()
        
        # Remove any markdown formatting if present
        if sql_query.startswith("```"):
            sql_query = re.sub(r'^```[\w]*\n?', '', sql_query)
            sql_query = re.sub(r'\n?```$', '', sql_query)
            sql_query = sql_query.strip()
        
        # --------- DANGEROUS SQL CHECK ---------
        dangerous_ops = detect_dangerous_sql(sql_query)

        if dangerous_ops:
            return json.dumps({
                "type": "confirmation_required",
                "sql": sql_query,
                "table": sql_to_table_preview(sql_query)
            })

        # Detect SQL type
        sql_upper = sql_query.upper()
        if sql_upper.startswith('SELECT'):
            sql_type = 'select'
        else:
            sql_type = 'other'

        if sql_type == 'select':
            # NEW METHOD: Execute query and get column names from cursor
            try:
                connection = db._engine.connect()  # Store connection reference
                result_proxy = connection.execute(text(sql_query))
                
                # Get actual column names from database
                columns = list(result_proxy.keys())
                
                # Fetch all rows
                rows = result_proxy.fetchall()
                
                # Convert to list of lists with proper string formatting
                data = []
                for row in rows:
                    row_data = []
                    for cell in row:
                        if cell is None:
                            row_data.append('')
                        else:
                            row_data.append(str(cell))
                    data.append(row_data)
                
                output_data = {
                    "type": "select",
                    "data": data,
                    "columns": columns,  # Real column names from database!
                    "row_count": len(data)
                }
                
            except Exception as select_error:
                # Return the actual SQL error to help debug
                error_message = str(select_error)
                
                # Check if it's a GROUP BY error and provide helpful message
                if "only_full_group_by" in error_message or "1140" in error_message:
                    helpful_msg = (
                        "⚠️ GROUP BY Error: When using aggregate functions like AVG(), SUM(), COUNT(), "
                        "all non-aggregated columns in SELECT must be included in the GROUP BY clause. "
                        f"\n\nOriginal error: {error_message}\n\n"
                        "Please rephrase your question or ask me to fix the query."
                    )
                    output_data = {
                        "type": "error",
                        "message": helpful_msg
                    }
                else:
                    output_data = {
                        "type": "error",
                        "message": f"Query execution failed: {error_message}"
                    }
            finally:
                # CRITICAL: Always close the connection
                if connection:
                    try:
                        connection.close()
                    except Exception as close_error:
                        print(f"Error closing connection: {close_error}")
                    
        else:
            # For non-SELECT statements
            result = db.run(sql_query)
            clean_result = result.strip()
            
            if 'Query OK' in clean_result or 'rows affected' in clean_result or 'row affected' in clean_result:
                match = re.search(r'(\d+) rows? affected', clean_result)
                affected_rows = int(match.group(1)) if match else 0
                message = f"Statement executed successfully. {affected_rows} row{'s' if affected_rows != 1 else ''} affected."
            else:
                message = clean_result or "Statement executed successfully."
                affected_rows = 0
            
            output_data = {
                "type": "status",
                "message": message,
                "affected_rows": affected_rows
            }

        return f"SQL: `{sql_query}`\nOutput: {json.dumps(output_data)}"
        
    except Exception as e:
        error_data = {
            "type": "error",
            "message": str(e)
        }
        sql_query_placeholder = sql_query if 'sql_query' in locals() else 'N/A'
        return f"SQL: `{sql_query_placeholder}`\nOutput: {json.dumps(error_data)}"
    finally:
        # CRITICAL: Final cleanup - ensure connection is closed
        if connection:
            try:
                connection.close()
            except Exception as final_close_error:
                print(f"Final connection close error: {final_close_error}")

#                 >>>>> /api/send-otp <<<<<
@app.post("/api/send-otp")
async def send_otp_for_signup(request: OtpRequest):
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Store the OTP and its expiration time
    otp_storage[request.email] = {"otp": otp, "expires_at": expires_at}
    
    # Send the OTP via email
    send_otp_email(request.email, otp)
    
    print(f"OTP for {request.email}: {otp}") # For debugging
    return {"success": True, "message": "OTP has been sent to your email."}

#            >>>>> /api/signup Endpoint <<<<<
@app.post("/api/signup", status_code=201)
async def signup_user(user: UserCreate, db: Session = Depends(get_db)):
    # --- OTP Verification ---
    stored_otp_data = otp_storage.get(user.email)
    if not stored_otp_data:
        raise HTTPException(status_code=400, detail="OTP not requested or expired.")

    if datetime.now(timezone.utc) > stored_otp_data["expires_at"]:
        # Clean up expired OTP
        del otp_storage[user.email]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        
    if stored_otp_data["otp"] != user.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP provided.")
    
    # --- User Creation ---
    if get_user(user.email, db):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    
    db_user = User(
        email=user.email,
        firstName=user.firstName,
        lastName=user.lastName,
        gender=user.gender,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Clean up OTP after successful verification
    del otp_storage[user.email]

    return {"success": True, "message": "User created successfully"}

# --- Login Endpoint ---
@app.post("/api/login")
async def login_for_access_token(form_data: UserLogin, db: Session = Depends(get_db)):
    user = get_user(form_data.identifier, db)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )
    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user.id,
            "email": user.email,
            "firstName": user.firstName,
            "lastName": user.lastName,
            "username": user.username,
            "gender": user.gender
        }
    }

# --- Other Endpoints ---
@app.post("/api/connect")
async def connect_db(config: DBConfig):
    global chat_history
    print(f"Received connect request with config: host={config.host}, port={config.port}, user={config.user}, database={config.database}")
    try:
        db_uri = f"mysql+mysqlconnector://{config.user}:{config.password}@{config.host}:{config.port}/{config.database}"
        app.state.db_uri = db_uri
        app.state.db_name = config.database

        chat_history = [AIMessage(content="Hello! I'm your database assistant.")]
        print("Database connection successful")
        return {"success": True, "database": config.database}
    except Exception as e:
        print(f"Database connection failed: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/api/disconnect")
async def disconnect_db():
    try:
        if hasattr(app.state, "db_uri"):
            delattr(app.state, "db_uri")
        if hasattr(app.state, "db_name"):
            delattr(app.state, "db_name")
        print("Database disconnected successfully")
        return {"success": True, "message": "Database disconnected successfully"}
    except Exception as e:
        print(f"Database disconnect failed: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not hasattr(app.state, "db_uri"):
        raise HTTPException(status_code=400, detail="Database not connected")
    
    try:
        # ✅ Convert chat history to LangChain message objects with validation
        chat_history = []
        for msg in request.chat_history:
            if isinstance(msg, dict):
                role = msg.get("role", "").lower()
                content = msg.get("content", "")
                
                if role == "ai" or role == "assistant":
                    chat_history.append(AIMessage(content=content))
                elif role == "human" or role == "user":
                    chat_history.append(HumanMessage(content=content))
            else:
                print(f"Warning: Skipping invalid message format: {msg}")
        
        db = SQLDatabase.from_uri(app.state.db_uri)
        response = get_response(request.question, db, chat_history)
        return {"success": True, "response": response}
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Chat endpoint error: {str(e)}")
        print(f"Request data: question={request.question}, chat_history={request.chat_history}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# --- Chat Session Endpoints ---

from fastapi import Path
import json

@app.get("/api/chat-sessions")
async def get_chat_sessions(user_id: int):
    db_session = SessionLocal()
    try:
        sessions = db_session.query(ChatSession).filter(ChatSession.user_id == user_id).all()
        result = []
        for session in sessions:
            result.append({
                "id": session.id,
                "title": session.title,
                "messages": json.loads(session.messages),
                "timestamp": datetime.utcnow().isoformat()
            })
        return result
    finally:
        db_session.close()

@app.post("/api/chat-sessions")
async def create_chat_session(session: dict):
    db_session = SessionLocal()
    try:
        new_session = ChatSession(
            user_id=session.get("user_id"),
            title=session.get("title", "Untitled Chat"),
            messages=json.dumps(session.get("messages", []))
        )
        db_session.add(new_session)
        db_session.commit()
        db_session.refresh(new_session)
        return {
            "id": new_session.id,
            "title": new_session.title,
            "messages": json.loads(new_session.messages),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create chat session: {str(e)}")
    finally:
        db_session.close()

@app.put("/api/chat-sessions/{session_id}")
async def update_chat_session(session_id: int, session: dict):
    db_session = SessionLocal()
    try:
        existing_session = db_session.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not existing_session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if existing_session.user_id != session.get("user_id"):
            raise HTTPException(status_code=403, detail="Unauthorized to update this session")

        # Update title if provided
        if "title" in session:
            existing_session.title = session["title"]

        # Update messages if provided
        if "messages" in session:
            existing_session.messages = json.dumps(session["messages"])

        db_session.commit()
        return {
            "id": existing_session.id,
            "title": existing_session.title,
            "messages": json.loads(existing_session.messages),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update chat session: {str(e)}")
    finally:
        db_session.close()

@app.delete("/api/chat-sessions/{session_id}")
async def delete_chat_session(session_id: int = Path(..., description="The ID of the chat session to delete"), user_id: int = None):
    if user_id is None:
        raise HTTPException(status_code=400, detail="user_id is required")
    db_session = SessionLocal()
    try:
        session = db_session.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized to delete this session")
        db_session.delete(session)
        db_session.commit()
        return {"success": True, "message": "Chat session deleted"}
    except HTTPException as e:
        raise e
    except Exception as e:
        db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete chat session: {str(e)}")
    finally:
        db_session.close()

from pydantic import BaseModel

class ConfirmSQLRequest(BaseModel):
    user_id: int
    confirm: bool
    sql: str

@app.post("/api/confirm-sql")
async def confirm_sql_action(req: ConfirmSQLRequest):

    if not req.confirm:
        return {
            "type": "status",
            "message": "SQL execution cancelled by user"
        }

    try:
        if not hasattr(app.state, "db_uri"):
            raise HTTPException(status_code=400, detail="Database not connected")

        db = SQLDatabase.from_uri(app.state.db_uri)
        db.run(req.sql)

        return {
            "type": "status",
            "message": "SQL executed successfully"
        }
    except Exception as e:
        return {
            "type": "error",
            "message": str(e)
        }

# --- Cleanup on shutdown ---
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on application shutdown"""
    if hasattr(app.state, "db_uri"):
        delattr(app.state, "db_uri")
    print("Application shutdown - resources cleaned up")