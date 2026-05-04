import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'fallback-dev-key'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///timepocket.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False