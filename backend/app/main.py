import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database.connection import engine, Base, SessionLocal
from .database.models import User
from .services.auth_service import seed_default_database_data
from .services.sea_ice_pipeline import aggregate_and_ingest_sea_ice_data
from .api import (
    health,
    system_status,
    icebergs,
    routes,
    ml_predict,
    environment,
    rerouting,
    what_if,
    hazards,
    vessels,
    auth,
    users,
    travel,
    feedback,
    alerts,
    admin_icebergs,
    admin_weather,
    sea_ice_regions,
    admin_stats,
    ws
)

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Operational Antarctic Maritime Navigation Decision Support Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration allowing requests from the React/Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .services.iceberg_scheduler import start_iceberg_scheduler, stop_iceberg_scheduler
from .services.usnic_service import ingest_usnic_dataset

# Startup event for seeding initial database data and running sea-ice ingestion
@app.on_event("startup")
async def on_startup():
    db = SessionLocal()
    try:
        logging.info("[*] Seeding default database accounts and initial records...")
        seed_default_database_data(db)
        logging.info("[*] Ingesting and aggregating initial 15-region sea-ice data...")
        aggregate_and_ingest_sea_ice_data(db)
        logging.info("[*] Ingesting authoritative USNIC Antarctic iceberg observations...")
        ingest_usnic_dataset(db, force=False)
        logging.info("[+] Startup initialization completed successfully.")
    except Exception as e:
        logging.error(f"[!] Startup initialization error: {e}")
    finally:
        db.close()
    
    # Start polite 6-hour background sync scheduler
    start_iceberg_scheduler()

@app.on_event("shutdown")
def on_shutdown():
    stop_iceberg_scheduler()


# Core endpoints (existing routes preserved)
app.include_router(health.router)  # /health
app.include_router(health.router, prefix=settings.API_V1_STR)  # /api/health
app.include_router(system_status.router, prefix=settings.API_V1_STR)
app.include_router(icebergs.router, prefix=settings.API_V1_STR)
app.include_router(routes.router, prefix=settings.API_V1_STR)
app.include_router(ml_predict.router, prefix=settings.API_V1_STR)
app.include_router(environment.router, prefix=settings.API_V1_STR)
app.include_router(rerouting.router, prefix=settings.API_V1_STR)
app.include_router(what_if.router, prefix=settings.API_V1_STR)
app.include_router(hazards.router, prefix=settings.API_V1_STR)
app.include_router(vessels.router, prefix=settings.API_V1_STR)

# Extended platform endpoints
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(travel.router, prefix=settings.API_V1_STR)
app.include_router(feedback.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(admin_icebergs.router, prefix=settings.API_V1_STR)
app.include_router(admin_weather.router, prefix=settings.API_V1_STR)
app.include_router(admin_weather.router, prefix=f"{settings.API_V1_STR}/weather-management")
app.include_router(sea_ice_regions.router, prefix=settings.API_V1_STR)
app.include_router(admin_stats.router, prefix=settings.API_V1_STR)
app.include_router(ws.router, prefix=settings.API_V1_STR)
app.include_router(ws.router)  # /ws fallback

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
