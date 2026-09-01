// Domain types for POLAR NAVIGATOR.
// Phase 1: shapes mirror the future API contract so mock data can be swapped
// for real satellite / ML service responses with minimal UI changes.

export type RiskLevel = "low" | "medium" | "high";
export type Severity = "info" | "warning" | "critical";

/** Map-space point. x/y are normalized 0..1000 canvas coordinates.
 *  lat/lon carry the equivalent (mock) geographic reference. */
export interface GeoPoint {
  x: number;
  y: number;
  lat: number;
  lon: number;
}

export interface Vessel {
  id: string;
  name: string;
  iceClass: string;
  position: GeoPoint;
  speedKn: number;
  headingDeg: number;
  courseDeg: number;
  status: string;
  mission: string;
}

export interface Iceberg {
  id: string;
  position: GeoPoint;
  observedAt: string;
  observationTimestamp?: string;
  dataAgeDays?: number;
  updateFrequency?: string;
  source?: string;
  sourceStatus?: string;
  speedMs: number;
  headingDeg: number;
  riskLevel: RiskLevel;
  /** predicted trajectory sampled forward in time */
  predictedPath: GeoPoint[];
  /** raw unconstrained prediction trajectory before land mask validation */
  rawPredictedPath?: GeoPoint[];
  /** baseline constant-velocity forecast for comparison */
  baselineForecast?: GeoPoint[];
  /** true if raw trajectory was geographically constrained along ocean coastline */
  predictionConstrained?: boolean;
  /** reason for constraint e.g. LAND_INTERSECTION */
  constraintReason?: string;
  /** half-width (canvas units) of the uncertainty corridor per predicted point */
  uncertainty: number[];

  confidence: number;
  sizeKm: number;
  lengthNm?: number;
  widthNm?: number;
  areaSqNm?: number;
  region?: string;
  hasKinematics?: boolean;
  previous_delta_latitude?: number;
  previous_delta_longitude?: number;
  metadata?: {
    source: string;
    last_update: string;
    data_frequency: string;
    tracking_criteria?: string;
    observation_type?: string;
    forecast_horizon?: string;
  };
}


export type RouteType = "fastest" | "safest" | "fuel";

export interface Route {
  id: string;
  name: string;
  type: RouteType;
  color: string;
  coordinates: GeoPoint[];
  waypoints: GeoPoint[];
  distanceNm: number;
  distanceKm?: number;
  eta: string;
  etaHours?: number;
  fuelT: number;
  riskScore: number;
  riskLevel: RiskLevel;
  minimumIcebergClearanceKm?: number;
  nearestIceberg?: string;
  landCollision?: boolean;
  seaIceRisk?: string;
  icebergSafetyBufferKm?: number;
  safe?: boolean;
}


export interface RiskFactor {
  label: string;
  level: RiskLevel | "ok";
}

export interface SeaIceRegion {
  id: string;
  polygon: GeoPoint[];
  concentration: number;
}

export interface CurrentArrow {
  from: GeoPoint;
  angleDeg: number;
  strength: number;
}

export interface Hazard {
  id: string;
  type: "Iceberg" | "Sea-Ice" | "Weather" | "Visibility" | "Ocean";
  location: string;
  severity: RiskLevel;
  predictedTime: string;
  confidence: number;
  affectedRoute: string;
  status: "active" | "predicted";
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  time: string;
}

export interface Environment {
  seaIceConcentration: number;
  windSpeedKn: number;
  windDir: string;
  visibilityKm: number;
  currentKn: number;
  currentDir: string;
  airTempC: number;
}

// ---- Phase 2 types ----

export type Horizon = "0h" | "6h" | "12h" | "24h" | "48h" | "72h";

export interface PredictedPosition {
  horizon: Horizon;
  time: string;
  lat: number;
  lon: number;
}

/** Iceberg risk relative to the vessel / active route. */
export interface IcebergRiskAssessment {
  distanceNm: number;
  closestApproach: string;
  intersection: "possible" | "unlikely" | "likely";
  confidence: number;
  risk: RiskLevel;
}

export interface SeaIcePrediction {
  region: string;
  currentConcentration: number;
  predictions: { horizon: Horizon; concentration: number }[];
  confidence: number;
  routeImpact: RiskLevel;
  affectedRoute: string;
  /** normalized 0..1000 canvas polygon for the region on the map */
  polygon: GeoPoint[];
}

export interface EnvForecastPoint {
  horizon: Horizon;
  time: string;
  airTempC: number;
  seaTempC: number;
  windSpeedKn: number;
  windDir: string;
  waveHeightM: number;
  visibilityKm: number;
  currentKn: number;
  currentDir: string;
  seaIceConcentration: number;
}

export interface SupportTicket {
  id: string;
  category: string;
  priority: string;
  subject: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
}

export interface FAQEntry {
  q: string;
  a: string;
  category: string;
}

export interface SeaIceHorizonData {
  horizon: Horizon;
  source_product: string;
  timestamp: string;
  spatial_resolution: string;
  units: string;
  avg_concentration: number;
  min_concentration: number;
  max_concentration: number;
  regions: SeaIcePrediction[];
}

export interface SeaIcePredictionResponse {
  horizons: Record<Horizon, SeaIceHorizonData>;
}

export interface SeaIceRegionItem {
  region: string;
  current_sic: number;
  sic_min: number;
  sic_max: number;
  spatial_coverage: number;
  valid_grid_cells: number;
  forecast: {
    "1d": number;
    "3d": number;
    "7d": number;
    "14d": number;
    "30d": number;
    [key: string]: number;
  };
  change_7d: number;
  confidence: number;
  risk: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" | string;
  data_source: string;
  last_updated: string;
}

export interface SeaIceTableResponse {
  observation_timestamp: string;
  data_source: string;
  regions_monitored: number;
  regions: SeaIceRegionItem[];
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_trips: number;
  active_trips: number;
  pending_feedback: number;
  open_help_alerts: number;
  iceberg_records: number;
  latest_weather_update: string;
  latest_sea_ice_update: string;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "USER" | string;
  status: "ACTIVE" | "INACTIVE" | string;
  organization?: string;
  created_at?: string;
  last_login?: string;
}

export interface TravelItem {
  id: string;
  user_id?: string;
  user_name?: string;
  ship_name: string;
  travel_id: string;
  departure_time: string;
  estimated_arrival_time: string;
  required_time?: string;
  destination: string;
  latitude: number;
  longitude: number;
  departure_location: string;
  departure_latitude: number;
  departure_longitude: number;
  status: "IN_TRANSIT" | "SCHEDULED" | "ARRIVED" | "ANCHORED" | "DELAYED" | string;
  updated_at?: string;
}

export interface FeedbackItem {
  id: string;
  user_id?: string;
  user_name: string;
  user_email?: string;
  rating: number;
  feedback: string;
  category: string;
  status: "PENDING" | "REVIEWED" | string;
  submitted_at: string;
}

export interface HelpAlertItem {
  id: string;
  user_id?: string;
  user_name: string;
  message: string;
  latitude: number;
  longitude: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | string;
  created_at: string;
  updated_at?: string;
}

export interface IcebergTableItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  size_km: number;
  movement_speed_kn: number;
  movement_heading_deg: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | string;
  confidence: number;
  source: string;
  last_updated: string;
}

export interface WeatherTableItem {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  wind_speed_kn: number;
  wind_direction_deg: number;
  visibility_km: number;
  pressure_hpa: number;
  conditions: string;
  source: string;
  observation_time: string;
}


