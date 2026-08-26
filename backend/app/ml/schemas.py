"""Pydantic data schemas for Dhruv Sarthi ML and Hybrid Physics-AI layers."""

from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


class CanonicalMLFeatureRecord(BaseModel):
    """Canonical feature row combining iceberg state, physics, environmental forcing, and targets."""
    iceberg_id: str
    calendar_date: str
    timestamp: datetime
    latitude: float
    longitude: float
    length_m: float
    width_m: float
    thickness_m: float = 250.0
    aspect_ratio: float
    harmonic_length_m: float
    size_source: str
    size_is_imputed: bool
    is_direct_fix: bool
    
    # Kinematics history
    observed_velocity_u: float
    observed_velocity_v: float
    observed_speed_km_day: float
    observed_bearing_deg: Optional[float] = None
    is_stationary: bool
    
    # Environmental forcing
    ocean_u: Optional[float] = None
    ocean_v: Optional[float] = None
    wind_u_10m: Optional[float] = None
    wind_v_10m: Optional[float] = None
    wind_speed_10m: Optional[float] = None
    wind_angle_deg: Optional[float] = None
    air_temperature_c: Optional[float] = None
    pressure_hpa: Optional[float] = None
    specific_humidity: Optional[float] = None
    sst_c: Optional[float] = None
    sea_ice_concentration: Optional[float] = None
    bathymetry_depth: Optional[float] = None
    draft_to_depth_ratio: Optional[float] = None
    
    # Wave parameters
    significant_wave_height: Optional[float] = None
    peak_wave_period: Optional[float] = None
    wave_direction_deg: Optional[float] = None

    # Analytical physics baseline
    wagner_velocity_u: float
    wagner_velocity_v: float
    wagner_speed_km_day: float
    wagner_bearing_deg: float
    physical_regime: str = "FREE_DRIFT"

    # Supervised Targets (Strictly future t + 24h)
    target_future_velocity_u: Optional[float] = None
    target_future_velocity_v: Optional[float] = None
    residual_target_u: Optional[float] = None
    residual_target_v: Optional[float] = None
    target_is_direct_fix: Optional[bool] = None


class HybridForecastWaypoint(BaseModel):
    """Spatiotemporal forecast waypoint along forward predicted trajectory."""
    horizon_hours: int
    forecast_timestamp: str
    latitude: float
    longitude: float
    hybrid_velocity_u_m_s: float
    hybrid_velocity_v_m_s: float
    hybrid_speed_km_day: float
    hybrid_bearing_deg: float
    wagner_velocity_u_m_s: float
    wagner_velocity_v_m_s: float
    ml_residual_u_m_s: float
    ml_residual_v_m_s: float
    physical_regime: str
    uncertainty_radius_km: float
    confidence_score: float
    dominant_forcing: str


class HybridForecastResult(BaseModel):
    """Complete multi-horizon hybrid physics-ML forecast result."""
    iceberg_id: str
    origin_timestamp: str
    origin_latitude: float
    origin_longitude: float
    physical_regime: str
    forecast_horizon_hours: int
    waypoints: List[HybridForecastWaypoint]
    ai_explanation: str
    dominant_environmental_factors: Dict[str, Any]
    provenance_metadata: Dict[str, Any]


class RouteWaypoint(BaseModel):
    latitude: float
    longitude: float
    leg_distance_nmi: float = 0.0
    segment_risk_score: float = 0.0
    nearest_iceberg_dist_km: float = 999.0
    nearest_iceberg_id: Optional[str] = None
    sea_ice_concentration: float = 0.0
    water_depth_m: float = 3000.0


class RouteRiskEvaluation(BaseModel):
    """Navigation route risk evaluation and alternative recommendation."""
    route_id: str
    route_name: str
    strategy: str  # "safest", "fastest", "balanced"
    waypoints: List[RouteWaypoint]
    total_distance_nmi: float
    estimated_duration_hours: float
    overall_risk_score: float  # 0 to 100
    risk_level: str  # "LOW", "MODERATE", "ELEVATED", "CRITICAL"
    iceberg_collision_risk: float
    sea_ice_hazard: float
    shallow_bathymetry_hazard: float
    gale_wind_hazard: float
    major_hazards_list: List[str]
    is_recommended: bool
