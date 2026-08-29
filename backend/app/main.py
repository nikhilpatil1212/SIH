from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api import health, system_status, icebergs, routes, ml_predict, environment

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Operational Antarctic Maritime Navigation Decision Support Platform API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration allowing requests from the existing React/Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core endpoints
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(system_status.router, prefix=settings.API_V1_STR)
app.include_router(icebergs.router, prefix=settings.API_V1_STR)
app.include_router(routes.router, prefix=settings.API_V1_STR)
app.include_router(ml_predict.router, prefix=settings.API_V1_STR)
app.include_router(environment.router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
