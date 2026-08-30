from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..database.models import SeaIceRegionData
from ..services.sea_ice_pipeline import aggregate_and_ingest_sea_ice_data
from ..services.websocket_manager import ws_manager

router = APIRouter(prefix="/sea-ice", tags=["Antarctic Sea Ice Concentration"])

class ForecastMap(BaseModel):
    f1d: float
    f3d: float
    f7d: float
    f14d: float
    f30d: float

class SeaIceRegionItem(BaseModel):
    region: str
    current_sic: float
    sic_min: float
    sic_max: float
    spatial_coverage: float
    valid_grid_cells: int
    forecast: Dict[str, float]
    change_7d: float
    confidence: float
    risk: str
    data_source: str
    last_updated: str

class SeaIceTableResponse(BaseModel):
    observation_timestamp: str
    data_source: str
    regions_monitored: int
    regions: List[SeaIceRegionItem]

class SeaIceHistoryItem(BaseModel):
    id: str
    region_name: str
    observation_time: str
    current_sic: float
    sic_min: float
    sic_max: float
    forecast_7d: float
    change_7d: float
    risk_level: str

@router.get("/regions", response_model=SeaIceTableResponse)
def get_sea_ice_regions_table(db: Session = Depends(get_db)):
    """
    Returns real-time Antarctic Sea-Ice Concentration data for all 15 regions
    with regional mean SIC, multi-horizon ML forecasts (+1d, +3d, +7d, +14d, +30d),
    7-day change, confidence, and modular navigation risk.
    """
    records = aggregate_and_ingest_sea_ice_data(db)
    
    if not records:
        raise HTTPException(status_code=404, detail="Sea-ice data unavailable from pipeline")
        
    latest_ts = records[0].observation_time.isoformat() if records[0].observation_time else datetime.now(timezone.utc).isoformat()
    
    items = []
    for r in records:
        items.append({
            "region": r.region_name,
            "current_sic": r.current_sic,
            "sic_min": r.sic_min,
            "sic_max": r.sic_max,
            "spatial_coverage": r.spatial_coverage,
            "valid_grid_cells": r.valid_grid_cells,
            "forecast": {
                "1d": r.forecast_1d,
                "3d": r.forecast_3d,
                "7d": r.forecast_7d,
                "14d": r.forecast_14d,
                "30d": r.forecast_30d
            },
            "change_7d": r.change_7d,
            "confidence": r.confidence,
            "risk": r.risk_level,
            "data_source": r.data_source,
            "last_updated": r.observation_time.isoformat() if r.observation_time else latest_ts
        })
        
    return {
        "observation_timestamp": latest_ts,
        "data_source": records[0].data_source if records else "NOAA / NSIDC Daily Climate Data Record (G02202 v4)",
        "regions_monitored": len(items),
        "regions": items
    }

@router.get("/history/{region}", response_model=List[SeaIceHistoryItem])
def get_sea_ice_region_history(region: str, limit: int = 30, db: Session = Depends(get_db)):
    """Returns historical observation and forecast records for a specific Antarctic region."""
    records = db.query(SeaIceRegionData)\
        .filter(SeaIceRegionData.region_name.ilike(region.strip()))\
        .order_by(SeaIceRegionData.observation_time.desc())\
        .limit(limit)\
        .all()
        
    return [
        {
            "id": r.id,
            "region_name": r.region_name,
            "observation_time": r.observation_time.isoformat() if r.observation_time else "",
            "current_sic": r.current_sic,
            "sic_min": r.sic_min,
            "sic_max": r.sic_max,
            "forecast_7d": r.forecast_7d,
            "change_7d": r.change_7d,
            "risk_level": r.risk_level
        }
        for r in records
    ]

@router.post("/refresh", response_model=SeaIceTableResponse)
async def force_refresh_sea_ice(db: Session = Depends(get_db)):
    """Force re-run ingestion and forecasting pipeline and broadcast live update to connected frontends."""
    records = aggregate_and_ingest_sea_ice_data(db, force_update=True)
    latest_ts = records[0].observation_time.isoformat() if records[0].observation_time else datetime.now(timezone.utc).isoformat()
    
    items = [
        {
            "region": r.region_name,
            "current_sic": r.current_sic,
            "sic_min": r.sic_min,
            "sic_max": r.sic_max,
            "spatial_coverage": r.spatial_coverage,
            "valid_grid_cells": r.valid_grid_cells,
            "forecast": {
                "1d": r.forecast_1d,
                "3d": r.forecast_3d,
                "7d": r.forecast_7d,
                "14d": r.forecast_14d,
                "30d": r.forecast_30d
            },
            "change_7d": r.change_7d,
            "confidence": r.confidence,
            "risk": r.risk_level,
            "data_source": r.data_source,
            "last_updated": r.observation_time.isoformat() if r.observation_time else latest_ts
        }
        for r in records
    ]
    
    payload = {
        "observation_timestamp": latest_ts,
        "data_source": records[0].data_source if records else "NOAA / NSIDC Daily Climate Data Record (G02202 v4)",
        "regions_monitored": len(items),
        "regions": items
    }
    
    await ws_manager.broadcast("SEA_ICE_UPDATED", payload)
    return payload
