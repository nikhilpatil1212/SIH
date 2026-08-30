import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..database.models import HelpAlert, User
from ..services.websocket_manager import ws_manager
from .auth import get_current_user, get_optional_user

router = APIRouter(prefix="/alerts", tags=["Emergency Help Alerts"])

class AlertOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: str
    message: str
    latitude: float
    longitude: float
    severity: str
    status: str
    created_at: str
    updated_at: Optional[str] = None

class CreateAlertIn(BaseModel):
    message: str
    latitude: float
    longitude: float
    severity: Optional[str] = "HIGH"  # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    user_name: Optional[str] = None

class UpdateAlertStatusIn(BaseModel):
    status: str  # "OPEN" | "ACKNOWLEDGED" | "RESOLVED"

@router.get("", response_model=List[AlertOut])
def get_alerts(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve help and emergency alert register."""
    query = db.query(HelpAlert)
    
    if status_filter:
        query = query.filter(HelpAlert.status == status_filter.upper())
        
    if severity:
        query = query.filter(HelpAlert.severity == severity.upper())
        
    alerts = query.order_by(HelpAlert.created_at.desc()).all()
    
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "user_name": a.user_name,
            "message": a.message,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "severity": a.severity,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else "",
            "updated_at": a.updated_at.isoformat() if a.updated_at else ""
        }
        for a in alerts
    ]

@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_emergency_alert(
    req: CreateAlertIn,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    User endpoint to send emergency / help alert to Admin in real-time.
    Broadcasts 'ALERT_CREATED' immediately to all admin dashboards via WebSocket.
    """
    user_id = user.id if user else None
    user_name = req.user_name or (user.name if user else "Naval Officer")
    
    alert = HelpAlert(
        id=f"ALT-{uuid.uuid4().hex[:6].upper()}",
        user_id=user_id,
        user_name=user_name,
        message=req.message.strip(),
        latitude=req.latitude,
        longitude=req.longitude,
        severity=req.severity.upper() if req.severity else "HIGH",
        status="OPEN",
        created_at=datetime.now(timezone.utc)
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    alert_dict = {
        "id": alert.id,
        "user_id": alert.user_id,
        "user_name": alert.user_name,
        "message": alert.message,
        "latitude": alert.latitude,
        "longitude": alert.longitude,
        "severity": alert.severity,
        "status": alert.status,
        "created_at": alert.created_at.isoformat(),
        "updated_at": alert.updated_at.isoformat() if alert.updated_at else ""
    }
    
    # Broadcast to Admin Dashboard via WebSocket
    await ws_manager.broadcast("ALERT_CREATED", alert_dict)
    
    return alert_dict

@router.put("/{alert_id}", response_model=AlertOut)
async def update_alert_status(
    alert_id: str,
    req: UpdateAlertStatusIn,
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to change alert lifecycle status (OPEN -> ACKNOWLEDGED -> RESOLVED).
    Broadcasts 'ALERT_UPDATED' to all connected clients.
    """
    alert = db.query(HelpAlert).filter(HelpAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.status = req.status.upper()
    alert.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    
    alert_dict = {
        "id": alert.id,
        "user_id": alert.user_id,
        "user_name": alert.user_name,
        "message": alert.message,
        "latitude": alert.latitude,
        "longitude": alert.longitude,
        "severity": alert.severity,
        "status": alert.status,
        "created_at": alert.created_at.isoformat() if alert.created_at else "",
        "updated_at": alert.updated_at.isoformat() if alert.updated_at else ""
    }
    
    # Broadcast updated status to connected clients
    await ws_manager.broadcast("ALERT_UPDATED", alert_dict)
    
    return alert_dict
