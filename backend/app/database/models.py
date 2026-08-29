from datetime import datetime, timezone
import hashlib
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Boolean
from .connection import Base

def hash_password(password: str) -> str:
    """Deterministic secure SHA-256 password hash for authentication."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    organization = Column(String(128), default="National Centre for Polar and Ocean Research (NCPOR)")
    role = Column(String(32), default="Researcher")  # Admin, Vessel Operator, Researcher
    status = Column(String(32), default="Active")  # Active, Suspended
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

class MissionVoyage(Base):
    __tablename__ = "mission_voyages"

    id = Column(String(64), primary_key=True, index=True)
    ship_name = Column(String(128), nullable=False)
    ship_no = Column(String(64), nullable=False)  # IMO / Registration Number
    ship_ice_class = Column(String(32), default="PC6")  # PC1 to PC7 / 1A Super
    start_destination = Column(String(128), nullable=False)
    end_destination = Column(String(128), nullable=False)
    no_of_break_points = Column(Integer, default=6)
    departure_time = Column(String(64), nullable=False)
    expected_arrival_time = Column(String(64), nullable=False)
    expected_travel_duration = Column(String(64), nullable=False)
    distance_nm = Column(Float, default=2450.0)
    fuel_expected_tons = Column(Float, default=184.2)
    status = Column(String(32), default="UNDERWAY")  # UNDERWAY, PLANNING, COMPLETED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class IcebergRecord(Base):
    __tablename__ = "iceberg_records"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(64), nullable=False)
    sector = Column(String(128), default="Antarctic Waters")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    length_nm = Column(Float, default=10.0)
    width_nm = Column(Float, default=5.0)
    area_sqnm = Column(Float, default=50.0)
    size_km = Column(Float, default=18.5)
    speed_ms = Column(Float, default=0.3)
    heading_deg = Column(Float, default=0.0)
    risk_level = Column(String(32), default="medium")  # high, medium, low
    confidence = Column(Float, default=85.0)
    last_updated = Column(String(64), default="18 Aug 2026 00:00 UTC")

class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(String(64), nullable=True)
    user_name = Column(String(128), nullable=False)
    user_email = Column(String(128), nullable=False)
    category = Column(String(64), default="General Feedback")  # Route Safety, Iceberg Detection, UI/UX, Incident Report
    rating = Column(Integer, default=5)  # 1 to 5 stars
    subject = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(32), default="NEW")  # NEW, REVIEWED, RESOLVED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False)
    message = Column(Text, nullable=False)
    environment = Column(String(32), default="DEVELOPMENT")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    source_type = Column(String(64), nullable=False)
    description = Column(Text, nullable=True)
    source_url = Column(String(256), nullable=False)
    status = Column(String(32), default="ONLINE")
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))
