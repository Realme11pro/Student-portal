from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import random
import os
from typing import Optional
import google.generativeai as genai

# Import professional email utility function
from email_utils import send_otp_email

# Database Configuration (MySQL)
DATABASE_URL = "mysql+pymysql://root:6248@127.0.0.1:3306/student_analytics"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Gemini API Configuration (API Key configured)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# User Database Model
class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password = Column(String(100))
    gender = Column(String(20), nullable=True)
    course = Column(String(100), nullable=True)

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Enable CORS properly for credentials and Live Server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas (Optional fields handled safely)
class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    gender: Optional[str] = None
    course: Optional[str] = None

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class PromptRequest(BaseModel):
    prompt: str

# Temporary in-memory store for OTP verification
otp_storage = {}

@app.post("/signup")
def signup_user(data: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(UserDB).filter(UserDB.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    otp = str(random.randint(100000, 999999))
    otp_storage[data.email] = {"otp": otp, "data": data.dict()}
    
    # Send email using email_utils.py module
    success = send_otp_email(data.email, otp)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please check your credentials or internet.")
    
    return {"message": "OTP sent successfully to your email."}

@app.post("/verify-otp")
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    record = otp_storage.get(data.email)
    if not record or record["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    
    udata = record["data"]
    new_user = UserDB(
        full_name=udata["full_name"],
        email=udata["email"],
        password=udata["password"],
        gender=udata.get("gender"),
        course=udata.get("course")
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    del otp_storage[data.email]
    return {"message": "Account created and verified successfully!"}

@app.post("/login")
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == data.email).first()
    if not user or user.password != data.password:
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    
    return {"message": "Login successful!", "name": user.full_name, "course": user.course}

# New Gemini API Endpoint
@app.post("/api/gemini")
async def chat_with_gemini(request: PromptRequest):
    try:
        model = genai.GenerativeModel("gemini-3.5-flash")
        response = model.generate_content(request.prompt)
        return {"response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)