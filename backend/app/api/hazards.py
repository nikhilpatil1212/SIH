from fastapi import APIRouter
from typing import List
from ..schemas.schemas import HazardSchema
from ..services.data_store import get_canonical_hazards

router = APIRouter(prefix="/hazards", tags=["Hazards & Risk"])

@router.get("", response_model=List[HazardSchema])
def list_hazards():
    """List genuine active and predicted collision hazards derived from real USNIC iceberg observations and actual polar data."""
    return get_canonical_hazards()

