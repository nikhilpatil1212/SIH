from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from ..schemas.schemas import RouteCalculateRequest, RouteCalculateResponse
from ..navigation.router import calculate_route_alternatives

router = APIRouter(prefix="/routes", tags=["Routes & Navigation"])

@router.post("/calculate", response_model=RouteCalculateResponse)
def calculate_routes(req: RouteCalculateRequest):
    """
    Calculate real multi-objective geographic route alternatives between any two points on Earth.
    """
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
    """
    Return baseline Cape Town ➔ Maitri Station passage alternatives.
    """
    return calculate_route_alternatives(
        start_lat=-33.92,
        start_lon=18.42,
        dest_lat=-70.77,
        dest_lon=11.73,
        vessel_speed_kn=14.0,
        objective="SAFEST"
    )
