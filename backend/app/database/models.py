from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Boolean
from .connection import Base

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
