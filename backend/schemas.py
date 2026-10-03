from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr
    password: str
    gender: Optional[str] = None
    course: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class PasswordReset(BaseModel):
    email: EmailStr
    otp: str
    new_password: str