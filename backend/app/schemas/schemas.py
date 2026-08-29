from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class GeoCoordinate(BaseModel):
    lat: float
    lon: float
    name: Optional[str] = None

class GeoPoint(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    lat: float
    lon: float

class VesselSchema(BaseModel):
    id: str
    name: str
    iceClass: str = "PC6"
    position: GeoPoint
    speedKn: float
    headingDeg: float
    courseDeg: float
    status: str
    mission: str

class IcebergSchema(BaseModel):
    id: str
    position: GeoPoint
    observedAt: str
    speedMs: float
    headingDeg: float
    riskLevel: str
    predictedPath: List[GeoPoint]
    uncertainty: List[float] = []
    confidence: float
    sizeKm: float

class RouteSchema(BaseModel):
    id: str
    name: str
    type: str
    color: str
    coordinates: List[GeoPoint]
    waypoints: List[GeoPoint]
    distanceNm: float
    distanceKm: Optional[float] = None
    eta: str
    etaHours: Optional[float] = None
    fuelT: float
    riskScore: int
    riskLevel: str
    minimumIcebergClearanceKm: Optional[float] = None
    nearestIceberg: Optional[str] = None
    landCollision: Optional[bool] = False
    seaIceRisk: Optional[str] = "LOW"
    icebergSafetyBufferKm: Optional[float] = 20.0
    safe: Optional[bool] = True

class RouteCalculateRequest(BaseModel):
    vessel_id: Optional[str] = "vessel-sarathi-1"
    start: GeoCoordinate
    destination: GeoCoordinate
    waypoints: Optional[List[Dict[str, Any]]] = []
    objective: str = "SAFEST"
    vessel_speed_kn: Optional[float] = 14.0
    safety_buffer_km: Optional[float] = 20.0

class RouteCalculateResponse(BaseModel):
    calculation_id: str
    objective: str
    start: GeoCoordinate
    destination: GeoCoordinate
    recommended_route_id: str
    routes: List[RouteSchema]
    why_recommended: List[str]
    bounding_box: Dict[str, float]
    vessel_speed_kn: float
    safety_buffer_km: Optional[float] = 20.0
    baseTravelHours: Optional[int] = 0
    totalBreakHours: Optional[int] = 0
    totalVoyageHours: Optional[int] = 0
    all_physically_safe: Optional[bool] = True

class HazardSchema(BaseModel):
    id: str
    type: str
    location: str
    severity: str
    predictedTime: str
    confidence: float
    affectedRoute: str
    status: str

class EnvironmentSchema(BaseModel):
    seaIceConcentration: float
    windSpeedKn: float
    windDir: str
    visibilityKm: float
    currentKn: float
    currentDir: str
    airTempC: float

class SystemStatusResponse(BaseModel):
    status: str = "ONLINE"
    environment: str = "SIMULATION"
    version: str = "1.2.0"
    api_health: str = "HEALTHY"
    database: str = "CONNECTED"
    routing_engine: str = "OPERATIONAL"
    risk_engine: str = "ACTIVE"
    tracked_icebergs_count: int
    active_hazards_count: int
    data_sources_online: int
    last_updated: str

class DataSourceSchema(BaseModel):
    id: str
    name: str
    type: str
    description: str
    source_url: str
    status: str
    last_updated: str

class WhatIfRequest(BaseModel):
    scenario: str
    speed: float = 14.0
    tolerance: int = 50
    departure: str = "2026-08-26T10:30"

class WhatIfResponse(BaseModel):
    eta: str
    fuel: int
    risk: int
    recommended: str
    distance_nm: float
    scenario_label: str

class ReroutingSimulateRequest(BaseModel):
    active_route_id: str = "route-b"
    trigger_hazard_id: Optional[str] = "A76C"


class ReroutingSimulateResponse(BaseModel):
    rerouted: bool
    trigger_description: str
    old_route_id: str
    new_recommended_route_id: str
    old_risk_score: int
    new_risk_score: int
    routes: List[RouteSchema]
    alert: Dict[str, Any]

class SeaIcePredictionPoint(BaseModel):
    horizon: str
    concentration: float

class SeaIceRegionForecast(BaseModel):
    region: str
    currentConcentration: float
    predictions: List[SeaIcePredictionPoint]
    confidence: float
    routeImpact: str
    affectedRoute: str
    polygon: List[GeoPoint]

class SeaIceHorizonData(BaseModel):
    horizon: str
    source_product: str
    timestamp: str
    spatial_resolution: str
    units: str
    avg_concentration: float
    min_concentration: float
    max_concentration: float
    regions: List[SeaIceRegionForecast]

class SeaIcePredictionResponse(BaseModel):
    horizons: Dict[str, SeaIceHorizonData]

