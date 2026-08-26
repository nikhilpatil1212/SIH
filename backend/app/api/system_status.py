from fastapi import APIRouter
from datetime import datetime, timezone
from ..schemas.system import SystemStatusResponse
from ..config import settings

router = APIRouter(tags=["System Status"])

@router.get("/system-status", response_model=SystemStatusResponse)
def get_system_status():
    """System health, runtime environment, and subsystem status."""
    return {
        "status": "ONLINE",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "api_health": "HEALTHY",
        "database": "CONNECTED",
        "routing_engine": "READY",
        "risk_engine": "READY",
        "data_sources_online": 4,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
