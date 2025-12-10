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
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import ast  # For safe evaluation of the result string

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

# --- Password Hashing & Auth ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- SQLite Database Setup ---
SQLITE_DB_FILE = "users.db"
engine = create_engine(f"sqlite:///{SQLITE_DB_FILE}", echo=False)
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
    allow_origins=["https://queryfrontend-one.vercel.app/","http://localhost:8080", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Vars (For Demo) ---
db = None
chat_history = [AIMessage(content="Hello! I'm your database assistant.")]

otp_storage = {}  # Stores -> {"email@example.com": {"otp": "123456", "expires_at": datetime}}
# ===============================================================

# ------------------- MODELS -------------------

class DBConfig(BaseModel):
    host: str
    port: int
    user: str
    password: str = ""
    database: str

class ChatRequest(BaseModel):
    question: str
    chat_history: list

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
    title = Column(String, nullable=False)
    messages = Column(Text, nullable=False)

# Create the chat_sessions table if not exists
Base.metadata.create_all(engine)

# ===============================================================
#                 >>>>> OTP Send Model <<<<<
# ===============================================================
class OtpRequest(BaseModel):
    email: EmailStr
# ===============================================================

# ------------------- HELPERS -------------------

# --- Database Session Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ===============================================================
#               >>>>> OTP & Email Helpers <<<<<
# ===============================================================
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
    You are a data analyst. Given the schema and chat history,
    write ONLY a single MySQL query (no explanation, no markdown).

    Schema:
    {schema}

    Chat History:
    {chat_history}

    User Question:
    {question}

    Your response must contain ONLY the SQL query. Do NOT add any extra text, commentary, or code formatting like ```sql.
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
    formatted_chat_history = "\n".join([
        f"{'Human' if isinstance(msg, HumanMessage) else 'AI'}: {msg.content}"
        for msg in chat_history
    ])
    try:
        response_text = chain.invoke({
            "question": question,
            "chat_history": formatted_chat_history
        })
        sql_query = response_text
        result = db.run(sql_query)  # Returns a string like "[('Ravi Kumar',), ('Priya Yadav',), ...]"
        
        # Process the result into a clean list of values
        if result.startswith('[') and result.endswith(']'):
            try:
                # Safely parse the result string into a list of tuples
                raw_data = ast.literal_eval(result)
                cleaned_result = [str(item[0]).strip() for item in raw_data if isinstance(item, tuple) and item]
            except (ValueError, SyntaxError):
                # Fallback to string splitting if parsing fails
                inner_content = result[1:-1]
                items = [item.strip("()").strip("'").strip() for item in inner_content.split(",") if item.strip()]
                cleaned_result = [item for item in items if item]
        else:
            cleaned_result = [result.strip()]  # Fallback for single value

        # Format the output as a clean list string with each item on a new line
        output_str = '[' + ', '.join(f"'{item}'" for item in cleaned_result) + ']'
        return f"SQL: `{sql_query}`\nOutput: {output_str}"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

# ------------------- ENDPOINTS -------------------

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
# ===============================================================

# --- Login Endpoint ---
@app.post("/api/login")
async def login_for_access_token(form_data: UserLogin, db: Session = Depends(get_db)):
    user = get_user(form_data.identifier, db)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
        )
    return {"success": True, "message": "Login successful"}

# --- Other Endpoints ---
@app.post("/api/connect")
async def connect_db(config: DBConfig):
    global db, chat_history
    print(f"Received connect request with config: host={config.host}, port={config.port}, user={config.user}, database={config.database}")
    try:
        db = init_database(
            config.user, config.password, config.host, config.port, config.database
        )
        chat_history = [AIMessage(content="Hello! I'm your database assistant.")]
        print("Database connection successful")
        return {"success": True}
    except Exception as e:
        print(f"Database connection failed: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    global db
    if db is None:
        raise HTTPException(status_code=400, detail="Database not connected")
    chat_history = [
        AIMessage(content=msg["content"]) if msg["role"] == "ai"
        else HumanMessage(content=msg["content"])
        for msg in request.chat_history
    ]
    try:
        response = get_response(request.question, db, chat_history)
        return {"success": True, "response": response}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# --- Chat Session Endpoints ---

from fastapi import Path
import json

@app.get("/api/chat-sessions")
async def get_chat_sessions():
    db_session = SessionLocal()
    try:
        sessions = db_session.query(ChatSession).all()
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
        existing_session.title = session.get("title", existing_session.title)
        existing_session.messages = json.dumps(session.get("messages", json.loads(existing_session.messages)))
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
async def delete_chat_session(session_id: int = Path(..., description="The ID of the chat session to delete")):
    db_session = SessionLocal()
    try:
        session = db_session.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
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

