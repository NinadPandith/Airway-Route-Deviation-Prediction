"""
Database setup and session management module using SQLAlchemy and SQLite.
"""

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLite database file path
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./airway.db")

# Create SQLAlchemy engine for SQLite
# check_same_thread=False allows multi-threaded request handling in FastAPI
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Session factory for creating DB sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for ORM models
Base = declarative_base()


def init_db():
    """Create tables and add lightweight schema compatibility columns for SQLite."""
    Base.metadata.create_all(bind=engine)

    if DATABASE_URL.startswith("sqlite"):
        with engine.begin() as connection:
            inspector = inspect(connection)
            if "weather_telemetry" in inspector.get_table_names():
                existing_columns = {column["name"] for column in inspector.get_columns("weather_telemetry")}
                if "feels_like" not in existing_columns:
                    connection.execute(text("ALTER TABLE weather_telemetry ADD COLUMN feels_like FLOAT"))


def get_db():
    """
    Dependency generator yielding a database session for FastAPI endpoints.
    Ensures session closure after request handling.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
