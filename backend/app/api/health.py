from fastapi import APIRouter
from ..schemas.system import HealthResponse
from ..config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint for platform monitoring."""
    return {
        "status": "HEALTHY",
        "service": "dhruva-sarathi-backend",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
    }
