from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..database.models import User, TravelRecord, Feedback, HelpAlert, IcebergRecord, WeatherRecord, SeaIceRegionData
from .auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin System Overview"])

class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    total_trips: int
    active_trips: int
    pending_feedback: int
    open_help_alerts: int
    iceberg_records: int
    latest_weather_update: str
    latest_sea_ice_update: str

@router.get("/stats", response_model=AdminStatsOut)
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Retrieve verified database counters for the Admin Dashboard overview cards."""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.status == "ACTIVE").count()
    total_trips = db.query(TravelRecord).count()
    active_trips = db.query(TravelRecord).filter(TravelRecord.status == "IN_TRANSIT").count()
    pending_feedback = db.query(Feedback).filter(Feedback.status == "PENDING").count()
    open_help_alerts = db.query(HelpAlert).filter(HelpAlert.status == "OPEN").count()
    iceberg_records = db.query(IcebergRecord).count()
    
    latest_wx = db.query(WeatherRecord).order_by(WeatherRecord.observation_time.desc()).first()
    latest_wx_str = latest_wx.observation_time.isoformat() if latest_wx and latest_wx.observation_time else "Data unavailable"
    
    latest_sic = db.query(SeaIceRegionData).order_by(SeaIceRegionData.observation_time.desc()).first()
    latest_sic_str = latest_sic.observation_time.isoformat() if latest_sic and latest_sic.observation_time else "Data unavailable"
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_trips": total_trips,
        "active_trips": active_trips,
        "pending_feedback": pending_feedback,
        "open_help_alerts": open_help_alerts,
        "iceberg_records": iceberg_records,
        "latest_weather_update": latest_wx_str,
        "latest_sea_ice_update": latest_sic_str
    }
