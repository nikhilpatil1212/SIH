from fastapi import APIRouter
from typing import Dict, Any
from ..schemas.schemas import EnvironmentSchema
from ..services.data_store import ENVIRONMENT_DATA
from ..ml.sea_ice_model import get_sea_ice_model

router = APIRouter(prefix="/environment", tags=["Metocean & Environment"])

@router.get("", response_model=EnvironmentSchema)
def get_environment():
    """Get current metocean overview parameters."""
    return ENVIRONMENT_DATA

@router.get("/sea-ice/forecast")
def get_sea_ice_forecast() -> Dict[str, Any]:
    """Get multi-horizon sea ice extent & regional concentration predictions trained on antarctic_sea_ice_ml_dataset.csv."""
    model = get_sea_ice_model()
    return model.predict_forecasts()
