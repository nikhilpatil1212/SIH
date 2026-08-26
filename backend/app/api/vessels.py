from fastapi import APIRouter
from typing import List
from ..schemas.schemas import VesselSchema
from ..services.data_store import VESSEL_DATA

router = APIRouter(prefix="/vessels", tags=["Vessels & Telemetry"])

@router.get("", response_model=List[VesselSchema])
def list_vessels():
    """List operational vessels."""
    return [VESSEL_DATA]

@router.get("/active", response_model=VesselSchema)
def get_active_vessel():
    """Get active RV Polar Star (SARATHI-1) telemetry."""
    return VESSEL_DATA
