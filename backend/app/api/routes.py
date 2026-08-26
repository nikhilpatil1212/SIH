from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from ..schemas.schemas import RouteCalculateRequest, RouteCalculateResponse
from ..navigation.router import calculate_route_alternatives
from ..ml.schemas import RouteRiskEvaluation
from ..ml.route_risk import RouteRiskEngine

router = APIRouter(prefix="/routes", tags=["Routes & Navigation"])

class RoutePredictRequest(BaseModel):
    start_latitude: float = Field(..., description="Departure latitude in decimal degrees")
    start_longitude: float = Field(..., description="Departure longitude in decimal degrees")
    destination_latitude: float = Field(..., description="Destination latitude in decimal degrees")
    destination_longitude: float = Field(..., description="Destination longitude in decimal degrees")
    vessel_speed_knots: float = Field(12.0, ge=1.0, le=40.0, description="Vessel cruising speed in knots")


@router.post("/predict", response_model=List[RouteRiskEvaluation], summary="Evaluate multi-route navigational risk and safety scores")
def evaluate_maritime_routes(req: RoutePredictRequest):
    """Evaluates Safest, Fastest, and Balanced navigation corridors against active iceberg forecast cones,
    sea ice concentrations, bathymetric grounding shoals, and wind hazard fields.
    """
    engine = RouteRiskEngine()
    active_test_bergs = [
        {"iceberg_id": "A68A", "latitude": -56.2, "longitude": -35.5},
        {"iceberg_id": "A23A", "latitude": -60.4, "longitude": -48.2},
        {"iceberg_id": "B27", "latitude": -65.1, "longitude": -120.4},
    ]
    results = engine.evaluate_routes(
        start_lat=req.start_latitude,
        start_lon=req.start_longitude,
        dest_lat=req.destination_latitude,
        dest_lon=req.destination_longitude,
        active_icebergs=active_test_bergs,
        vessel_speed_knots=req.vessel_speed_knots,
    )
    return results


@router.post("/calculate", response_model=RouteCalculateResponse)
def calculate_routes(req: RouteCalculateRequest):
    """Calculate real multi-objective geographic route alternatives between any two points on Earth."""
    try:
        result = calculate_route_alternatives(
            start_lat=req.start.lat,
            start_lon=req.start.lon,
            dest_lat=req.destination.lat,
            dest_lon=req.destination.lon,
            vessel_speed_kn=req.vessel_speed_kn or 14.0,
            objective=req.objective or "SAFEST"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route calculation error: {str(e)}")


@router.get("/default", response_model=RouteCalculateResponse)
def get_default_routes():
    """Return baseline Cape Town ➔ Maitri Station passage alternatives."""
    return calculate_route_alternatives(
        start_lat=-33.92,
        start_lon=18.42,
        dest_lat=-70.77,
        dest_lon=11.73,
        vessel_speed_kn=14.0,
        objective="SAFEST"
    )

