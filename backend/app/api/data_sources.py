from fastapi import APIRouter
from typing import List
from ..schemas.schemas import DataSourceSchema
from ..services.data_store import DATA_SOURCES

router = APIRouter(prefix="/data-sources", tags=["Scientific Data Sources"])

@router.get("", response_model=List[DataSourceSchema])
def list_data_sources():
    """List scientific datasets and provenance registry."""
    return DATA_SOURCES
