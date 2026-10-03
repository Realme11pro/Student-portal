from sqlalchemy import Column, Integer, String, Text, Boolean, Float
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255), nullable=False)
    gender = Column(String(50), nullable=True)
    course = Column(String(255), nullable=True)
    otp = Column(String(10), nullable=True)
    is_verified = Column(Integer, default=0)

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(255), nullable=False)
    priority = Column(String(50), default="Medium")
    completed = Column(Boolean, default=False)

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(255), nullable=False)
    completed = Column(Boolean, default=False)

class Routine(Base):
    __tablename__ = "routines"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    day_or_date = Column(String(100), nullable=False)
    time_slot = Column(String(100), nullable=False)

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    subject_name = Column(String(255), nullable=False)
    exam_date = Column(String(100), nullable=False)
    time_slot = Column(String(100), nullable=False)
    room = Column(String(50), nullable=True)