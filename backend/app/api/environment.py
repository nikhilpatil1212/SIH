from fastapi import APIRouter
from ..schemas.schemas import EnvironmentSchema
from ..services.data_store import ENVIRONMENT_DATA

router = APIRouter(prefix="/environment", tags=["Metocean & Environment"])

@router.get("", response_model=EnvironmentSchema)
def get_environment():
    """Get current metocean overview parameters."""
    return ENVIRONMENT_DATA
