from fastapi import APIRouter, HTTPException
from typing import List
from ..schemas.schemas import IcebergSchema
from ..services.data_store import ICEBERGS_DATA

router = APIRouter(prefix="/icebergs", tags=["Icebergs & Cryosphere"])

@router.get("", response_model=List[IcebergSchema])
def list_icebergs():
    """List tracked icebergs with trajectory prediction nodes."""
    return ICEBERGS_DATA

@router.get("/{iceberg_id}", response_model=IcebergSchema)
def get_iceberg(iceberg_id: str):
    """Get single iceberg telemetry and predicted drift envelope."""
    for ibg in ICEBERGS_DATA:
        if ibg["id"].lower() == iceberg_id.lower():
            return ibg
    raise HTTPException(status_code=404, detail="Iceberg not found")
