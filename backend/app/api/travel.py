import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..database.connection import get_db
from ..database.models import TravelRecord, User
from .auth import get_current_user

router = APIRouter(prefix="/travel", tags=["Travel & Ships"])

class TravelOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    ship_name: str
    travel_id: str
    departure_time: str
    estimated_arrival_time: str
    required_time: Optional[str] = None
    destination: str
    latitude: float
    longitude: float
    departure_location: str
    departure_latitude: float
    departure_longitude: float
    status: str
    updated_at: Optional[str] = None

class CreateTravelIn(BaseModel):
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    ship_name: str
    travel_id: str
    departure_time: datetime
    estimated_arrival_time: datetime
    required_time: Optional[str] = None
    destination: str
    latitude: float
    longitude: float
    departure_location: Optional[str] = "Ushuaia, Argentina"
    departure_latitude: Optional[float] = -54.80
    departure_longitude: Optional[float] = -68.30
    status: Optional[str] = "IN_TRANSIT"

class UpdateTravelIn(BaseModel):
    ship_name: Optional[str] = None
    departure_time: Optional[datetime] = None
    estimated_arrival_time: Optional[datetime] = None
    required_time: Optional[str] = None
    destination: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None

@router.get("", response_model=List[TravelOut])
def get_travel_records(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List fleet and voyage travel records (Admin sees all; Users see own or fleet overview)."""
    query = db.query(TravelRecord)
    
    if user.role != "ADMIN":
        # Users can view active fleet journeys or their own
        query = query.filter(or_(TravelRecord.user_id == user.id, TravelRecord.user_id.is_(None)))
        
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            TravelRecord.ship_name.ilike(s),
            TravelRecord.travel_id.ilike(s),
            TravelRecord.destination.ilike(s),
            TravelRecord.user_name.ilike(s)
        ))
        
    if status_filter:
        query = query.filter(TravelRecord.status == status_filter.upper())
        
    records = query.order_by(TravelRecord.departure_time.desc()).all()
    
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": r.user_name or "Fleet Operator",
            "ship_name": r.ship_name,
            "travel_id": r.travel_id,
            "departure_time": r.departure_time.isoformat() if r.departure_time else "",
            "estimated_arrival_time": r.estimated_arrival_time.isoformat() if r.estimated_arrival_time else "",
            "required_time": r.required_time,
            "destination": r.destination,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "departure_location": r.departure_location,
            "departure_latitude": r.departure_latitude,
            "departure_longitude": r.departure_longitude,
            "status": r.status,
            "updated_at": r.updated_at.isoformat() if r.updated_at else ""
        }
        for r in records
    ]

@router.post("", response_model=TravelOut, status_code=status.HTTP_201_CREATED)
def create_travel_record(
    req: CreateTravelIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new voyage record."""
    rec = TravelRecord(
        id=f"TRV-{uuid.uuid4().hex[:6].upper()}",
        user_id=req.user_id or user.id,
        user_name=req.user_name or user.name,
        ship_name=req.ship_name,
        travel_id=req.travel_id,
        departure_time=req.departure_time,
        estimated_arrival_time=req.estimated_arrival_time,
        required_time=req.required_time or "170 hours",
        destination=req.destination,
        latitude=req.latitude,
        longitude=req.longitude,
        departure_location=req.departure_location or "Ushuaia, Argentina",
        departure_latitude=req.departure_latitude or -54.80,
        departure_longitude=req.departure_longitude or -68.30,
        status=req.status or "IN_TRANSIT"
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    
    return {
        "id": rec.id,
        "user_id": rec.user_id,
        "user_name": rec.user_name,
        "ship_name": rec.ship_name,
        "travel_id": rec.travel_id,
        "departure_time": rec.departure_time.isoformat(),
        "estimated_arrival_time": rec.estimated_arrival_time.isoformat(),
        "required_time": rec.required_time,
        "destination": rec.destination,
        "latitude": rec.latitude,
        "longitude": rec.longitude,
        "departure_location": rec.departure_location,
        "departure_latitude": rec.departure_latitude,
        "departure_longitude": rec.departure_longitude,
        "status": rec.status,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else ""
    }

@router.put("/{travel_id}", response_model=TravelOut)
def update_travel_record(
    travel_id: str,
    req: UpdateTravelIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update voyage position, status, or ETA."""
    rec = db.query(TravelRecord).filter(TravelRecord.id == travel_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Travel record not found")
        
    if req.ship_name is not None:
        rec.ship_name = req.ship_name
    if req.departure_time is not None:
        rec.departure_time = req.departure_time
    if req.estimated_arrival_time is not None:
        rec.estimated_arrival_time = req.estimated_arrival_time
    if req.required_time is not None:
        rec.required_time = req.required_time
    if req.destination is not None:
        rec.destination = req.destination
    if req.latitude is not None:
        rec.latitude = req.latitude
    if req.longitude is not None:
        rec.longitude = req.longitude
    if req.status is not None:
        rec.status = req.status.upper()
        
    rec.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rec)
    
    return {
        "id": rec.id,
        "user_id": rec.user_id,
        "user_name": rec.user_name,
        "ship_name": rec.ship_name,
        "travel_id": rec.travel_id,
        "departure_time": rec.departure_time.isoformat(),
        "estimated_arrival_time": rec.estimated_arrival_time.isoformat(),
        "required_time": rec.required_time,
        "destination": rec.destination,
        "latitude": rec.latitude,
        "longitude": rec.longitude,
        "departure_location": rec.departure_location,
        "departure_latitude": rec.departure_latitude,
        "departure_longitude": rec.departure_longitude,
        "status": rec.status,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else ""
    }

@router.delete("/{travel_id}")
def delete_travel_record(
    travel_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete a travel record."""
    rec = db.query(TravelRecord).filter(TravelRecord.id == travel_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Travel record not found")
    db.delete(rec)
    db.commit()
    return {"status": "SUCCESS", "message": f"Travel record {travel_id} deleted"}
