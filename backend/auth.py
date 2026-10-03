import hashlib
import random

def get_password_hash(password: str):
    # SHA-256 hashing (72 bytes ki koi limit nahi hoti isme)
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str):
    return get_password_hash(plain_password) == hashed_password

def generate_otp():
    return str(random.randint(100000, 999999))