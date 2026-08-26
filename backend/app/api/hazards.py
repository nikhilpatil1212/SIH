from fastapi import APIRouter
from typing import List
from ..schemas.schemas import HazardSchema
from ..services.data_store import HAZARDS_DATA

router = APIRouter(prefix="/hazards", tags=["Hazards & Risk"])

@router.get("", response_model=List[HazardSchema])
def list_hazards():
    """List active and predicted collision hazards."""
    return HAZARDS_DATA
