import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..database.models import WeatherRecord, User
from .auth import require_admin

router = APIRouter(prefix="/admin/weather", tags=["Weather Management"])

class WeatherOut(BaseModel):
    id: str
    location: str
    latitude: float
    longitude: float
    temperature_c: float
    wind_speed_kn: float
    wind_direction_deg: float
    visibility_km: float
    pressure_hpa: float
    conditions: str
    source: str
    observation_time: str

class CreateWeatherIn(BaseModel):
    location: str
    latitude: float
    longitude: float
    temperature_c: float
    wind_speed_kn: float
    wind_direction_deg: float
    visibility_km: float
    pressure_hpa: float
    conditions: Optional[str] = "Clear Polar"
    source: Optional[str] = "ECMWF / ERA5 Reanalysis"

class UpdateWeatherIn(BaseModel):
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    temperature_c: Optional[float] = None
    wind_speed_kn: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    visibility_km: Optional[float] = None
    pressure_hpa: Optional[float] = None
    conditions: Optional[str] = None
    source: Optional[str] = None

@router.get("", response_model=List[WeatherOut])
def list_weather_table(
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve weather database updates for table management."""
    query = db.query(WeatherRecord)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(WeatherRecord.location.ilike(s) | WeatherRecord.conditions.ilike(s))
        
    records = query.order_by(WeatherRecord.observation_time.desc()).all()
    return [
        {
            "id": r.id,
            "location": r.location,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "temperature_c": r.temperature_c,
            "wind_speed_kn": r.wind_speed_kn,
            "wind_direction_deg": r.wind_direction_deg,
            "visibility_km": r.visibility_km,
            "pressure_hpa": r.pressure_hpa,
            "conditions": r.conditions,
            "source": r.source,
            "observation_time": r.observation_time.isoformat() if r.observation_time else ""
        }
        for r in records
    ]

@router.post("", response_model=WeatherOut, status_code=status.HTTP_201_CREATED)
def add_weather_record(
    req: CreateWeatherIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to add a weather observation."""
    rec = WeatherRecord(
        id=f"WX-{uuid.uuid4().hex[:6].upper()}",
        location=req.location.strip(),
        latitude=req.latitude,
        longitude=req.longitude,
        temperature_c=req.temperature_c,
        wind_speed_kn=req.wind_speed_kn,
        wind_direction_deg=req.wind_direction_deg,
        visibility_km=req.visibility_km,
        pressure_hpa=req.pressure_hpa,
        conditions=req.conditions or "Clear Polar",
        source=req.source or "ECMWF / ERA5 Reanalysis",
        observation_time=datetime.now(timezone.utc)
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {
        "id": rec.id,
        "location": rec.location,
        "latitude": rec.latitude,
        "longitude": rec.longitude,
        "temperature_c": rec.temperature_c,
        "wind_speed_kn": rec.wind_speed_kn,
        "wind_direction_deg": rec.wind_direction_deg,
        "visibility_km": rec.visibility_km,
        "pressure_hpa": rec.pressure_hpa,
        "conditions": rec.conditions,
        "source": rec.source,
        "observation_time": rec.observation_time.isoformat()
    }

@router.put("/{weather_id}", response_model=WeatherOut)
def update_weather_record(
    weather_id: str,
    req: UpdateWeatherIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to edit a weather observation."""
    rec = db.query(WeatherRecord).filter(WeatherRecord.id == weather_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Weather record not found")
        
    if req.location is not None:
        rec.location = req.location.strip()
    if req.latitude is not None:
        rec.latitude = req.latitude
    if req.longitude is not None:
        rec.longitude = req.longitude
    if req.temperature_c is not None:
        rec.temperature_c = req.temperature_c
    if req.wind_speed_kn is not None:
        rec.wind_speed_kn = req.wind_speed_kn
    if req.wind_direction_deg is not None:
        rec.wind_direction_deg = req.wind_direction_deg
    if req.visibility_km is not None:
        rec.visibility_km = req.visibility_km
    if req.pressure_hpa is not None:
        rec.pressure_hpa = req.pressure_hpa
    if req.conditions is not None:
        rec.conditions = req.conditions
    if req.source is not None:
        rec.source = req.source
        
    rec.observation_time = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rec)
    return {
        "id": rec.id,
        "location": rec.location,
        "latitude": rec.latitude,
        "longitude": rec.longitude,
        "temperature_c": rec.temperature_c,
        "wind_speed_kn": rec.wind_speed_kn,
        "wind_direction_deg": rec.wind_direction_deg,
        "visibility_km": rec.visibility_km,
        "pressure_hpa": rec.pressure_hpa,
        "conditions": rec.conditions,
        "source": rec.source,
        "observation_time": rec.observation_time.isoformat()
    }

@router.delete("/{weather_id}")
def delete_weather_record(
    weather_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to delete a weather record."""
    rec = db.query(WeatherRecord).filter(WeatherRecord.id == weather_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Weather record not found")
    db.delete(rec)
    db.commit()
    return {"status": "SUCCESS", "message": f"Weather record {weather_id} deleted"}
