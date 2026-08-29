"""REST API router for Antarctic iceberg catalog metadata, canonical trajectory feeds,
and physics-based analytical drift projections.
"""

import os
import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..schemas.iceberg import (
    IcebergTrackSummary,
    TrajectoryFeaturePoint,
    WagnerPhysicsInput,
    WagnerPhysicsOutput,
)
from ..physics.wagner_drift_model import compute_iceberg_velocity
from ..services.usnic_service import load_current_icebergs

router = APIRouter(prefix="/icebergs", tags=["Icebergs & Trajectories"])

PROCESSED_DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed")
)


def _load_catalog() -> dict:
    """Load the processed master catalog summary."""
    catalog_path = os.path.join(PROCESSED_DATA_DIR, "iceberg_catalog_summary.json")
    if not os.path.exists(catalog_path):
        return {}
    with open(catalog_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("", response_model=List[IcebergTrackSummary], summary="List all cataloged Antarctic icebergs")
def list_icebergs(
    limit: int = Query(50, ge=1, le=1000, description="Max icebergs to return"),
    min_observations: int = Query(1, ge=1, description="Filter by minimum observation count"),
    named_only: bool = Query(False, description="Filter for NIC named icebergs (A, B, C, D)"),
):
    """Retrieve catalog list of processed Antarctic icebergs with spatial bounds and observation metrics."""
    catalog = _load_catalog()
    results = []
    
    for berg_id, data in catalog.items():
        if data.get("total_observations", 0) < min_observations:
            continue
        if named_only and not (berg_id.startswith(("A", "B", "C", "D")) and not berg_id.startswith("SA")):
            continue
        results.append(data)
        if len(results) >= limit:
            break

    return results


@router.get("/current", summary="Get current USNIC tracked icebergs")
def get_current_icebergs():
    """Retrieve the latest real Antarctic icebergs tracked by the US National Ice Center (USNIC)."""
    try:
        return load_current_icebergs()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading current icebergs: {e}",
        )


@router.get("/{iceberg_id}", response_model=IcebergTrackSummary, summary="Get summary metadata for a single iceberg")
def get_iceberg(iceberg_id: str):
    """Retrieve metadata, date ranges, and spatial bounding boxes for a specific iceberg."""
    catalog = _load_catalog()
    berg_key = iceberg_id.strip().upper()
    
    if berg_key not in catalog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Iceberg '{iceberg_id}' not found in catalog.",
        )
    return catalog[berg_key]


@router.get("/{iceberg_id}/trajectory", response_model=List[TrajectoryFeaturePoint], summary="Get full canonical trajectory points")
def get_iceberg_trajectory(
    iceberg_id: str,
    limit: Optional[int] = Query(None, ge=1, le=10000, description="Limit trajectory points"),
):
    """Retrieve sequential canonical trajectory points with derived kinematics, bearings, and quality flags."""
    berg_key = iceberg_id.strip().upper()
    traj_path = os.path.join(PROCESSED_DATA_DIR, f"{berg_key}.json")
    
    if not os.path.exists(traj_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trajectory for iceberg '{iceberg_id}' not generated or not found in processed cache.",
        )
        
    with open(traj_path, "r", encoding="utf-8") as f:
        points = json.load(f)

    if limit:
        return points[:limit]
    return points


@router.post("/calculate-drift-physics", response_model=WagnerPhysicsOutput, summary="Calculate instantaneous analytical drift velocity (Wagner et al. 2017)")
def calculate_drift_physics(payload: WagnerPhysicsInput):
    """Calculate instantaneous analytical drift velocity vector using Wagner et al. (2017) closed-form equations.
    
    Requires:
        - Ocean current (u_w, v_w) in m/s
        - 10m Wind velocity (u_a, v_a) in m/s
        - Iceberg dimensions (L, W) in meters
        - Latitude in decimal degrees (determines Coriolis parameter f)
    """
    result = compute_iceberg_velocity(
        ocean_u=payload.ocean_u,
        ocean_v=payload.ocean_v,
        wind_u=payload.wind_u,
        wind_v=payload.wind_v,
        length_m=payload.length_m,
        width_m=payload.width_m,
        latitude_deg=payload.latitude,
    )
    return WagnerPhysicsOutput(**result)


from ..ml.schemas import HybridForecastResult
from ..ml.hybrid_forecaster import HybridForecaster
from ..ml.residual_model import HybridDriftModel

MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed", "phase3", "ml_residual_model.json")
)

_forecaster_instance: Optional[HybridForecaster] = None

def get_forecaster() -> HybridForecaster:
    global _forecaster_instance
    if _forecaster_instance is None:
        model = HybridDriftModel(MODEL_PATH if os.path.exists(MODEL_PATH) else None)
        _forecaster_instance = HybridForecaster(model)
    return _forecaster_instance


class PredictIcebergDriftRequest(BaseModel):
    iceberg_id: str = Field(..., description="Target iceberg ID (e.g. A68A, B27, A23A)")
    current_latitude: float = Field(..., description="Current origin latitude [-90, -40]")
    current_longitude: float = Field(..., description="Current origin longitude [-180, 180]")
    forecast_hours: int = Field(72, ge=24, le=168, description="Forecast horizon in hours (24, 48, 72)")
    timestamp: Optional[str] = Field(None, description="ISO-8601 origin timestamp")
    length_m: Optional[float] = Field(None, description="Iceberg major axis in meters")
    width_m: Optional[float] = Field(None, description="Iceberg minor axis in meters")
    thickness_m: Optional[float] = Field(250.0, description="Iceberg draft/thickness in meters")
    ocean_u: Optional[float] = Field(None, description="Surface zonal current (m/s)")
    ocean_v: Optional[float] = Field(None, description="Surface meridional current (m/s)")
    wind_u_10m: Optional[float] = Field(None, description="10m zonal wind (m/s)")
    wind_v_10m: Optional[float] = Field(None, description="10m meridional wind (m/s)")
    air_temperature_c: Optional[float] = Field(None, description="2m air temp (deg C)")
    pressure_hpa: Optional[float] = Field(None, description="Surface pressure (hPa)")
    sst_c: Optional[float] = Field(None, description="Sea surface temperature (deg C)")
    sea_ice_concentration: Optional[float] = Field(None, description="Sea ice concentration [0.0, 1.0]")
    bathymetry_depth: Optional[float] = Field(None, description="Seafloor depth in meters (negative)")


@router.post("/predict", response_model=HybridForecastResult, summary="Execute State-Aware Multi-Horizon Hybrid Iceberg Drift Forecast")
def predict_iceberg_drift(req: PredictIcebergDriftRequest):
    """Executes state-aware hybrid physics-ML multi-horizon drift simulation (24h, 48h, 72h).
    
    Integrates:
    - Physical Regime Detection (Grounding / Sea-Ice Lock / Free Drift)
    - Wagner et al. (2017) Analytical Physics Vector
    - ML Residual Correction Vector (Delta u, Delta v)
    - Geodesic Forward Trajectory Propagation
    - Empirical Dispersion Uncertainty Cones
    - Natural-Language AI Decision Explanations
    """
    catalog = _load_catalog()
    berg_info = catalog.get(req.iceberg_id.strip().upper(), {})

    # Auto-fill iceberg dimensions from catalog if not specified in request
    l_m = req.length_m
    if l_m is None and berg_info.get("max_size_major_km"):
        l_m = berg_info["max_size_major_km"] * 1000.0
    l_m = l_m or 10000.0

    w_m = req.width_m
    if w_m is None and berg_info.get("max_size_minor_km"):
        w_m = berg_info["max_size_minor_km"] * 1000.0
    w_m = w_m or 5000.0

    forecaster = get_forecaster()
    result = forecaster.forecast(
        iceberg_id=req.iceberg_id.strip().upper(),
        origin_lat=req.current_latitude,
        origin_lon=req.current_longitude,
        length_m=l_m,
        width_m=w_m,
        thickness_m=req.thickness_m or 250.0,
        ocean_u=req.ocean_u or 0.15,
        ocean_v=req.ocean_v or 0.05,
        wind_u_10m=req.wind_u_10m or 8.0,
        wind_v_10m=req.wind_v_10m or -4.0,
        air_temperature_c=req.air_temperature_c or -10.0,
        pressure_hpa=req.pressure_hpa or 985.0,
        sst_c=req.sst_c or -0.5,
        sea_ice_concentration=req.sea_ice_concentration or 0.15,
        bathymetry_depth=req.bathymetry_depth or -3000.0,
        forecast_horizon_hours=req.forecast_hours,
    )
    return result
