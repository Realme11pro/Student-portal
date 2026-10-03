from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# MySQL Database URL (Password '6248' aur database 'student_analytics' ke sath)
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:6248@127.0.0.1:3306/student_analytics"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()