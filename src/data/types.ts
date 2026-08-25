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
  speedMs: number;
  headingDeg: number;
  riskLevel: RiskLevel;
  /** predicted trajectory sampled forward in time */
  predictedPath: GeoPoint[];
  /** half-width (canvas units) of the uncertainty corridor per predicted point */
  uncertainty: number[];
  confidence: number;
  sizeKm: number;
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
  eta: string;
  fuelT: number;
  riskScore: number;
  riskLevel: RiskLevel;
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
