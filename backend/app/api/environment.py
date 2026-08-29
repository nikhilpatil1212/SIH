from fastapi import APIRouter
from ..schemas.schemas import EnvironmentSchema, SeaIcePredictionResponse
from ..services.data_store import ENVIRONMENT_DATA
from ..services.sea_ice_service import get_sea_ice_data

router = APIRouter(prefix="/environment", tags=["Metocean & Environment"])

@router.get("", response_model=EnvironmentSchema)
def get_environment():
    """Get current metocean overview parameters."""
    return ENVIRONMENT_DATA

@router.get("/sea-ice", response_model=SeaIcePredictionResponse)
def get_sea_ice():
    """Get real sea-ice concentration observations and forecasts."""
    return get_sea_ice_data()

