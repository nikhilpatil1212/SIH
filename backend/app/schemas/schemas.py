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

class RouteWaypointInput(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    lat: float
    lon: float
    breakDurationHours: Optional[float] = 0.0

class RouteCalculateRequest(BaseModel):
    vessel_id: Optional[str] = "vessel-sarathi-1"
    start: GeoCoordinate
    destination: GeoCoordinate
    waypoints: Optional[List[RouteWaypointInput]] = []
    objective: Optional[str] = "SAFEST"
    vessel_speed_kn: Optional[float] = 14.0

class RouteCalculateResponse(BaseModel):
    calculation_id: str
    objective: str
    start: GeoCoordinate
    destination: GeoCoordinate
    waypoints: Optional[List[RouteWaypointInput]] = []
    recommended_route_id: str
    routes: List[RouteSchema]
    why_recommended: List[str]
    bounding_box: Dict[str, float]
    vessel_speed_kn: float
    baseTravelHours: Optional[float] = 0.0
    totalBreakHours: Optional[float] = 0.0
    totalVoyageHours: Optional[float] = 0.0

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
    trigger_hazard_id: Optional[str] = "A81"

class ReroutingSimulateResponse(BaseModel):
    rerouted: bool
    trigger_description: str
    old_route_id: str
    new_recommended_route_id: str
    old_risk_score: int
    new_risk_score: int
    routes: List[RouteSchema]
    alert: Dict[str, Any]

# ─────────────────────────────────────────────────────────────────────────────
# Auth & User Schemas
# ─────────────────────────────────────────────────────────────────────────────
class UserRegisterRequest(BaseModel):
    username: str
    name: str
    email: str
    password: str
    organization: Optional[str] = "National Centre for Polar and Ocean Research"
    role: Optional[str] = "Researcher"

class UserLoginRequest(BaseModel):
    username_or_email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    name: str
    email: str
    organization: str
    role: str
    status: str
    created_at: Optional[str] = None
    last_login: Optional[str] = None

class UserAdminCreateRequest(BaseModel):
    username: str
    name: str
    email: str
    password: str
    organization: Optional[str] = "NCPOR Mission Control"
    role: str = "Researcher"
    status: str = "Active"

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserResponse

# ─────────────────────────────────────────────────────────────────────────────
# Mission Voyage Schemas
# ─────────────────────────────────────────────────────────────────────────────
class MissionVoyageSchema(BaseModel):
    id: str
    ship_name: str
    ship_no: str
    ship_ice_class: str = "PC6"
    start_destination: str
    end_destination: str
    no_of_break_points: int = 6
    departure_time: str
    expected_arrival_time: str
    expected_travel_duration: str
    distance_nm: float = 2450.0
    fuel_expected_tons: float = 184.2
    status: str = "UNDERWAY"

class MissionVoyageCreateUpdate(BaseModel):
    ship_name: str
    ship_no: str
    ship_ice_class: str = "PC6"
    start_destination: str
    end_destination: str
    no_of_break_points: int = 6
    departure_time: str
    expected_arrival_time: str
    expected_travel_duration: str
    distance_nm: Optional[float] = 2450.0
    fuel_expected_tons: Optional[float] = 184.2
    status: Optional[str] = "UNDERWAY"

# ─────────────────────────────────────────────────────────────────────────────
# Iceberg Registry Schemas
# ─────────────────────────────────────────────────────────────────────────────
class IcebergRecordSchema(BaseModel):
    id: str
    name: str
    sector: str
    latitude: float
    longitude: float
    length_nm: float
    width_nm: float
    area_sqnm: float
    size_km: float
    speed_ms: float
    heading_deg: float
    risk_level: str
    confidence: float
    last_updated: str

class IcebergRecordCreateUpdate(BaseModel):
    name: str
    sector: str = "Antarctic Waters"
    latitude: float
    longitude: float
    length_nm: float
    width_nm: float
    area_sqnm: float
    size_km: float
    speed_ms: float = 0.3
    heading_deg: float = 0.0
    risk_level: str = "medium"
    confidence: float = 85.0
    last_updated: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────
# User Feedback Schemas
# ─────────────────────────────────────────────────────────────────────────────
class FeedbackCreateRequest(BaseModel):
    user_id: Optional[str] = None
    user_name: str
    user_email: str
    category: str = "General Feedback"
    rating: int = 5
    subject: str
    message: str

class FeedbackResponse(BaseModel):
    id: int
    user_id: Optional[str] = None
    user_name: str
    user_email: str
    category: str
    rating: int
    subject: str
    message: str
    status: str
    created_at: str

class FeedbackStatusUpdateRequest(BaseModel):
    status: str

