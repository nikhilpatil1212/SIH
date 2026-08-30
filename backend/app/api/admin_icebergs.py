import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..database.models import IcebergRecord, User
from .auth import require_admin

router = APIRouter(prefix="/admin/icebergs", tags=["Iceberg Management"])

class IcebergOut(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    size_km: float
    movement_speed_kn: float
    movement_heading_deg: float
    risk_level: str
    confidence: float
    source: str
    last_updated: str

class CreateIcebergIn(BaseModel):
    id: Optional[str] = None
    name: str
    latitude: float
    longitude: float
    size_km: float
    movement_speed_kn: Optional[float] = 0.5
    movement_heading_deg: Optional[float] = 0.0
    risk_level: Optional[str] = "HIGH"
    confidence: Optional[float] = 85.0
    source: Optional[str] = "USNIC / Synthetic Aperture Radar"

class UpdateIcebergIn(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    size_km: Optional[float] = None
    movement_speed_kn: Optional[float] = None
    movement_heading_deg: Optional[float] = None
    risk_level: Optional[str] = None
    confidence: Optional[float] = None
    source: Optional[str] = None

@router.get("", response_model=List[IcebergOut])
def list_icebergs_table(
    search: Optional[str] = None,
    risk: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve iceberg database records for admin table management."""
    query = db.query(IcebergRecord)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(IcebergRecord.name.ilike(s) | IcebergRecord.id.ilike(s))
    if risk:
        query = query.filter(IcebergRecord.risk_level == risk.upper())
        
    records = query.order_by(IcebergRecord.size_km.desc()).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "size_km": r.size_km,
            "movement_speed_kn": r.movement_speed_kn,
            "movement_heading_deg": r.movement_heading_deg,
            "risk_level": r.risk_level,
            "confidence": r.confidence,
            "source": r.source,
            "last_updated": r.last_updated.isoformat() if r.last_updated else ""
        }
        for r in records
    ]

@router.post("", response_model=IcebergOut, status_code=status.HTTP_201_CREATED)
def add_iceberg_record(
    req: CreateIcebergIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to add an iceberg record."""
    ib_id = req.id.strip().upper() if req.id else f"IBG-{uuid.uuid4().hex[:5].upper()}"
    existing = db.query(IcebergRecord).filter(IcebergRecord.id == ib_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Iceberg with this identifier already exists")
        
    rec = IcebergRecord(
        id=ib_id,
        name=req.name.strip(),
        latitude=req.latitude,
        longitude=req.longitude,
        size_km=req.size_km,
        movement_speed_kn=req.movement_speed_kn or 0.5,
        movement_heading_deg=req.movement_heading_deg or 0.0,
        risk_level=req.risk_level.upper() if req.risk_level else "HIGH",
        confidence=req.confidence or 85.0,
        source=req.source or "USNIC / Synthetic Aperture Radar",
        last_updated=datetime.now(timezone.utc)
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {
        "id": rec.id,
        "name": rec.name,
        "latitude": rec.latitude,
        "longitude": rec.longitude,
        "size_km": rec.size_km,
        "movement_speed_kn": rec.movement_speed_kn,
        "movement_heading_deg": rec.movement_heading_deg,
        "risk_level": rec.risk_level,
        "confidence": rec.confidence,
        "source": rec.source,
        "last_updated": rec.last_updated.isoformat()
    }

@router.put("/{iceberg_id}", response_model=IcebergOut)
def update_iceberg_record(
    iceberg_id: str,
    req: UpdateIcebergIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to edit an iceberg record."""
    rec = db.query(IcebergRecord).filter(IcebergRecord.id == iceberg_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Iceberg record not found")
        
    if req.name is not None:
        rec.name = req.name.strip()
    if req.latitude is not None:
        rec.latitude = req.latitude
    if req.longitude is not None:
        rec.longitude = req.longitude
    if req.size_km is not None:
        rec.size_km = req.size_km
    if req.movement_speed_kn is not None:
        rec.movement_speed_kn = req.movement_speed_kn
    if req.movement_heading_deg is not None:
        rec.movement_heading_deg = req.movement_heading_deg
    if req.risk_level is not None:
        rec.risk_level = req.risk_level.upper()
    if req.confidence is not None:
        rec.confidence = req.confidence
    if req.source is not None:
        rec.source = req.source
        
    rec.last_updated = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rec)
    return {
        "id": rec.id,
        "name": rec.name,
        "latitude": rec.latitude,
        "longitude": rec.longitude,
        "size_km": rec.size_km,
        "movement_speed_kn": rec.movement_speed_kn,
        "movement_heading_deg": rec.movement_heading_deg,
        "risk_level": rec.risk_level,
        "confidence": rec.confidence,
        "source": rec.source,
        "last_updated": rec.last_updated.isoformat()
    }

@router.delete("/{iceberg_id}")
def delete_iceberg_record(
    iceberg_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to delete an iceberg record."""
    rec = db.query(IcebergRecord).filter(IcebergRecord.id == iceberg_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Iceberg record not found")
    db.delete(rec)
    db.commit()
    return {"status": "SUCCESS", "message": f"Iceberg record {iceberg_id} deleted"}
