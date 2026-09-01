from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .connection import Base

def utcnow():
    return datetime.now(timezone.utc)

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False)
    message = Column(Text, nullable=False)
    environment = Column(String(32), default="DEVELOPMENT")
    created_at = Column(DateTime, default=utcnow)

class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    source_type = Column(String(64), nullable=False)
    description = Column(Text, nullable=True)
    source_url = Column(String(256), nullable=False)
    status = Column(String(32), default="ONLINE")
    last_updated = Column(DateTime, default=utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    phone = Column(String(32), nullable=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), default="USER", nullable=False)  # "ADMIN" | "USER"
    status = Column(String(32), default="ACTIVE", nullable=False)  # "ACTIVE" | "INACTIVE"
    organization = Column(String(128), default="NCPOR / MoES")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    last_login = Column(DateTime, nullable=True)

    travel_records = relationship("TravelRecord", back_populates="user", cascade="all, delete-orphan")
    feedback_items = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    help_alerts = relationship("HelpAlert", back_populates="user", cascade="all, delete-orphan")

class TravelRecord(Base):
    __tablename__ = "travel_records"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    user_name = Column(String(128), nullable=True)
    ship_name = Column(String(128), nullable=False)
    travel_id = Column(String(64), unique=True, index=True, nullable=False)
    departure_time = Column(DateTime, nullable=False)
    estimated_arrival_time = Column(DateTime, nullable=False)
    required_time = Column(String(64), nullable=True)  # e.g. "177 hours (7.4 days)"
    destination = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    departure_location = Column(String(128), default="Ushuaia, Argentina")
    departure_latitude = Column(Float, default=-54.80)
    departure_longitude = Column(Float, default=-68.30)
    status = Column(String(32), default="IN_TRANSIT")  # "IN_TRANSIT" | "SCHEDULED" | "ARRIVED" | "ANCHORED" | "DELAYED"
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="travel_records")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    user_name = Column(String(128), nullable=False)
    user_email = Column(String(128), nullable=True)
    rating = Column(Integer, default=5)
    feedback = Column(Text, nullable=False)
    category = Column(String(64), default="GENERAL")
    status = Column(String(32), default="PENDING")  # "PENDING" | "REVIEWED"
    submitted_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="feedback_items")

class HelpAlert(Base):
    __tablename__ = "help_alerts"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    user_name = Column(String(128), nullable=False)
    message = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity = Column(String(32), default="HIGH")  # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    status = Column(String(32), default="OPEN")  # "OPEN" | "ACKNOWLEDGED" | "RESOLVED"
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="help_alerts")

class IcebergRecord(Base):
    __tablename__ = "iceberg_records"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    size_km = Column(Float, nullable=False)
    movement_speed_kn = Column(Float, default=0.5)
    movement_heading_deg = Column(Float, default=0.0)
    risk_level = Column(String(32), default="HIGH")  # "LOW" | "MEDIUM" | "HIGH"
    confidence = Column(Float, default=85.0)
    source = Column(String(128), default="USNIC / Satellite Synthetic Aperture Radar")
    last_updated = Column(DateTime, default=utcnow)

class WeatherRecord(Base):
    __tablename__ = "weather_records"

    id = Column(String(64), primary_key=True, index=True)
    location = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    wind_speed_kn = Column(Float, nullable=False)
    wind_direction_deg = Column(Float, nullable=False)
    visibility_km = Column(Float, nullable=False)
    pressure_hpa = Column(Float, nullable=False)
    conditions = Column(String(64), default="Clear Polar")
    source = Column(String(128), default="ECMWF / ERA5 Reanalysis")
    observation_time = Column(DateTime, default=utcnow)

class SeaIceRegionData(Base):
    __tablename__ = "sea_ice_region_data"

    id = Column(String(64), primary_key=True, index=True)
    region_name = Column(String(128), nullable=False, index=True)
    observation_time = Column(DateTime, nullable=False, index=True)
    current_sic = Column(Float, nullable=False)  # Regional Mean SIC %
    sic_min = Column(Float, nullable=False)
    sic_max = Column(Float, nullable=False)
    spatial_coverage = Column(Float, default=100.0)  # % valid coverage
    valid_grid_cells = Column(Integer, default=1000)
    forecast_1d = Column(Float, nullable=False)
    forecast_3d = Column(Float, nullable=False)
    forecast_7d = Column(Float, nullable=False)
    forecast_14d = Column(Float, nullable=False)
    forecast_30d = Column(Float, nullable=False)
    change_7d = Column(Float, nullable=False)  # forecast_7d - current_sic
    confidence = Column(Float, default=85.0)  # % confidence
    risk_level = Column(String(32), default="MODERATE")  # "LOW" | "MODERATE" | "HIGH" | "VERY HIGH"
    data_source = Column(String(128), default="NOAA / NSIDC CDR Daily Analysis")
    updated_at = Column(DateTime, default=utcnow, index=True)


class IcebergObservation(Base):
    """Authoritative historical and latest observations from U.S. National Ice Center (USNIC)."""
    __tablename__ = "iceberg_observations"

    id = Column(String(64), primary_key=True, index=True)
    iceberg_id = Column(String(64), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    length_nm = Column(Float, default=5.0)
    width_nm = Column(Float, default=2.5)
    area_sq_nm = Column(Float, nullable=True)
    area_sq_km = Column(Float, nullable=True)
    region = Column(String(128), nullable=True)
    observation_timestamp = Column(DateTime, nullable=False, index=True)
    source = Column(String(128), default="U.S. National Ice Center (USNIC)")
    ingested_at = Column(DateTime, default=utcnow, index=True)


class IcebergForecast(Base):
    """Multi-horizon 72-hour AI and physics forward trajectory projections."""
    __tablename__ = "iceberg_forecasts"

    id = Column(String(64), primary_key=True, index=True)
    iceberg_id = Column(String(64), nullable=False, index=True)
    forecast_generated_at = Column(DateTime, default=utcnow, index=True)
    forecast_timestamp = Column(DateTime, nullable=False, index=True)
    forecast_horizon_hours = Column(Integer, nullable=False)  # 6, 12, 18, 24, 36, 48, 60, 72
    predicted_latitude = Column(Float, nullable=False)
    predicted_longitude = Column(Float, nullable=False)
    raw_predicted_latitude = Column(Float, nullable=True)
    raw_predicted_longitude = Column(Float, nullable=True)
    uncertainty_km = Column(Float, default=5.0)
    model_version = Column(String(64), default="RandomForest_Wagner_v1.0")
    input_observation_timestamp = Column(DateTime, nullable=True)
    prediction_constrained = Column(Boolean, default=False)
    constraint_reason = Column(String(64), nullable=True)


class ModelValidationMetric(Base):
    """Historical validation metrics comparing ML predictions against subsequent USNIC observations and baselines."""
    __tablename__ = "model_validation_metrics"

    id = Column(String(64), primary_key=True, index=True)
    iceberg_id = Column(String(64), nullable=False, index=True)
    forecast_id = Column(String(64), nullable=True)
    forecast_horizon_hours = Column(Integer, nullable=False)
    predicted_latitude = Column(Float, nullable=False)
    predicted_longitude = Column(Float, nullable=False)
    actual_latitude = Column(Float, nullable=False)
    actual_longitude = Column(Float, nullable=False)
    positional_error_km = Column(Float, nullable=False)
    baseline_error_km = Column(Float, nullable=False)  # Constant velocity / persistence baseline
    evaluated_at = Column(DateTime, default=utcnow, index=True)

