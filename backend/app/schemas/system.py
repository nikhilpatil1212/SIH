from pydantic import BaseModel
from typing import Dict, Any, Optional

class HealthResponse(BaseModel):
    status: str = "HEALTHY"
    service: str = "dhruva-sarathi-backend"
    environment: str = "DEVELOPMENT"
    version: str = "1.0.0"

class SystemStatusResponse(BaseModel):
    status: str = "ONLINE"
    environment: str = "DEVELOPMENT"
    version: str = "1.0.0"
    api_health: str = "HEALTHY"
    database: str = "CONNECTED"
    routing_engine: str = "READY"
    risk_engine: str = "READY"
    data_sources_online: int = 4
    last_updated: str
