// Phase 2 mock data — prediction dashboards, environmental intelligence, support.
// High-fidelity Antarctic navigation decision support models.

import { icebergs, seaIceRegions } from "./mock";
import type {
  EnvForecastPoint,
  FAQEntry,
  Horizon,
  IcebergRiskAssessment,
  PredictedPosition,
  SeaIcePrediction,
  SupportTicket,
} from "./types";

export const HORIZONS: Horizon[] = ["6h", "12h", "24h", "48h", "72h"];

export const HORIZON_TIME: Record<Horizon, string> = {
  "0h": "26 Aug 2026 10:00 UTC",
  "6h": "26 Aug 2026 16:00 UTC",
  "12h": "26 Aug 2026 22:00 UTC",
  "24h": "27 Aug 2026 10:00 UTC",
  "48h": "28 Aug 2026 10:00 UTC",
  "72h": "29 Aug 2026 10:00 UTC",
};

// Predicted lat/lon per horizon, keyed by iceberg id.
export const icebergPredictedPositions: Record<string, PredictedPosition[]> = Object.fromEntries(
  icebergs.map((ib) => {
    const last = ib.predictedPath[ib.predictedPath.length - 1]!;
    const first = ib.predictedPath[0];
    const lerp = (t: number, key: "lat" | "lon") => +(first[key] + (last[key] - first[key]) * t).toFixed(2);
    const positions: PredictedPosition[] = [
      { horizon: "0h", time: HORIZON_TIME["0h"], lat: first.lat, lon: first.lon },
      { horizon: "6h", time: HORIZON_TIME["6h"], lat: lerp(0.12, "lat"), lon: lerp(0.12, "lon") },
      { horizon: "12h", time: HORIZON_TIME["12h"], lat: lerp(0.25, "lat"), lon: lerp(0.25, "lon") },
      { horizon: "24h", time: HORIZON_TIME["24h"], lat: lerp(0.45, "lat"), lon: lerp(0.45, "lon") },
      { horizon: "48h", time: HORIZON_TIME["48h"], lat: lerp(0.75, "lat"), lon: lerp(0.75, "lon") },
      { horizon: "72h", time: HORIZON_TIME["72h"], lat: last.lat, lon: last.lon },
    ];
    return [ib.id, positions];
  }),
);

export const icebergRisk: Record<string, IcebergRiskAssessment> = {
  "IBG-1247": { distanceNm: 18, closestApproach: "+14h", intersection: "possible", confidence: 89, risk: "high" },
  "IBG-A23A": { distanceNm: 34, closestApproach: "+11h", intersection: "possible", confidence: 94, risk: "high" },
  "IBG-1183": { distanceNm: 46, closestApproach: "+38h", intersection: "unlikely", confidence: 81, risk: "medium" },
  "IBG-B15K": { distanceNm: 78, closestApproach: "+44h", intersection: "unlikely", confidence: 86, risk: "medium" },
  "IBG-D28": { distanceNm: 52, closestApproach: "+29h", intersection: "unlikely", confidence: 84, risk: "medium" },
  "IBG-C19A": { distanceNm: 110, closestApproach: "+60h", intersection: "unlikely", confidence: 79, risk: "low" },
  "IBG-0842": { distanceNm: 22, closestApproach: "+16h", intersection: "possible", confidence: 88, risk: "high" },
  "IBG-1405": { distanceNm: 41, closestApproach: "+32h", intersection: "unlikely", confidence: 82, risk: "medium" },
  "IBG-0996": { distanceNm: 62, closestApproach: "+52h", intersection: "unlikely", confidence: 76, risk: "low" },
  "IBG-1290": { distanceNm: 33, closestApproach: "+26h", intersection: "possible", confidence: 79, risk: "medium" },
};

export const seaIcePredictions: SeaIcePrediction[] = [
  {
    region: "Weddell Sea",
    currentConcentration: 42,
    predictions: [
      { horizon: "24h", concentration: 45 },
      { horizon: "48h", concentration: 51 },
      { horizon: "72h", concentration: 58 },
    ],
    confidence: 85,
    routeImpact: "medium",
    affectedRoute: "Route C",
    polygon: seaIceRegions[0].polygon,
  },
  {
    region: "Eastern Approach",
    currentConcentration: 58,
    predictions: [
      { horizon: "24h", concentration: 60 },
      { horizon: "48h", concentration: 64 },
      { horizon: "72h", concentration: 69 },
    ],
    confidence: 82,
    routeImpact: "high",
    affectedRoute: "Route B",
    polygon: seaIceRegions[1].polygon,
  },
  {
    region: "Ross Sea Channel",
    currentConcentration: 48,
    predictions: [
      { horizon: "24h", concentration: 52 },
      { horizon: "48h", concentration: 57 },
      { horizon: "72h", concentration: 63 },
    ],
    confidence: 80,
    routeImpact: "medium",
    affectedRoute: "Route A",
    polygon: seaIceRegions[2].polygon,
  },
];

// Basin-averaged concentration used for the timeline summary cards.
export const seaIceBasin: { horizon: Horizon; avg: number; min: number; max: number }[] = [
  { horizon: "0h", avg: 35, min: 12, max: 62 },
  { horizon: "24h", avg: 38, min: 14, max: 66 },
  { horizon: "48h", avg: 42, min: 18, max: 71 },
  { horizon: "72h", avg: 46, min: 22, max: 78 },
];

export const environmentForecast: EnvForecastPoint[] = [
  { horizon: "0h", time: "Now", airTempC: -12, seaTempC: -1.6, windSpeedKn: 18, windDir: "NE", waveHeightM: 2.4, visibilityKm: 2.1, currentKn: 0.6, currentDir: "SW", seaIceConcentration: 35 },
  { horizon: "6h", time: "+6h", airTempC: -13, seaTempC: -1.6, windSpeedKn: 21, windDir: "NE", waveHeightM: 2.8, visibilityKm: 1.8, currentKn: 0.6, currentDir: "SW", seaIceConcentration: 36 },
  { horizon: "12h", time: "+12h", airTempC: -14, seaTempC: -1.7, windSpeedKn: 24, windDir: "ENE", waveHeightM: 3.2, visibilityKm: 1.4, currentKn: 0.7, currentDir: "SW", seaIceConcentration: 37 },
  { horizon: "24h", time: "+24h", airTempC: -15, seaTempC: -1.7, windSpeedKn: 20, windDir: "E", waveHeightM: 2.9, visibilityKm: 1.9, currentKn: 0.7, currentDir: "SSW", seaIceConcentration: 38 },
  { horizon: "48h", time: "+48h", airTempC: -16, seaTempC: -1.8, windSpeedKn: 17, windDir: "SE", waveHeightM: 2.3, visibilityKm: 2.6, currentKn: 0.6, currentDir: "SSW", seaIceConcentration: 42 },
  { horizon: "72h", time: "+72h", airTempC: -14, seaTempC: -1.7, windSpeedKn: 15, windDir: "SE", waveHeightM: 1.9, visibilityKm: 3.4, currentKn: 0.5, currentDir: "S", seaIceConcentration: 46 },
];

export const dashboardKpis = [
  { label: "Tracked Icebergs", value: "247", accent: "#8ccfe0", tag: "AI TELEMETRY" },
  { label: "Active Collision Hazards", value: "8", accent: "#ff5c5c", tag: "IMPACT WARNING" },
  { label: "Polar Pack Ice", value: "38%", accent: "#55d6e8", tag: "SAT RADAR" },
  { label: "Voyage Risk Index", value: "32/100", accent: "#10b981", tag: "SAFE CORRIDOR" },
  { label: "Neural Forecast Confidence", value: "91%", accent: "#55d6e8", tag: "AI ENSEMBLE" },
];

export const supportStatus = {
  state: "Operational",
  avgResponse: "< 2 hours",
  openTickets: 2,
};

export const supportTickets: SupportTicket[] = [
  { id: "SUP-2026-00119", category: "Prediction Issue", priority: "Medium", subject: "Uncertainty corridor rendering", status: "in-progress", createdAt: "25 Aug 2026" },
  { id: "SUP-2026-00121", category: "Map Issue", priority: "Low", subject: "Layer toggle persistence", status: "open", createdAt: "26 Aug 2026" },
];

export const helpCategories = [
  "Getting Started",
  "Navigation & Corridors",
  "Iceberg AI Drift",
  "Sea-Ice Predictions",
  "Route Optimization",
  "Risk Index Formulation",
  "Dynamic Re-Routing",
  "Sensors & Satellites",
  "Mission Reports",
  "Platform Settings",
];

export const faqEntries: FAQEntry[] = [
  { category: "Iceberg AI Drift", q: "How does Dhruv Sarthi predict iceberg drift trajectories?", a: "Dhruv Sarthi couples high-resolution Synthetic Aperture Radar (SAR) and altimetry feeds with physics-informed neural network (PINN) ocean dynamics. It computes ocean surface drag, wind-stress forcing, Coriolis acceleration, and iceberg keel bathymetric interaction over 72-hour forecast horizons." },
  { category: "Risk Index Formulation", q: "How is the prediction confidence and risk scored?", a: "Forecast confidence is derived from ensemble variance across numerical meteorological and current models. Risk scores (0–100) factor vessel Polar Code hull limits (e.g. PC6), iceberg closing velocity, sea-ice compression pressure, and maneuver standoff envelopes." },
  { category: "Iceberg AI Drift", q: "What does the 95% spatial uncertainty envelope represent?", a: "Because Southern Ocean wind fields and mesoscale eddies have non-linear turbulence, the forecast trajectory includes a probabilistic expansion corridor that widens over the 6h, 12h, 24h, 48h, and 72h horizons." },
  { category: "Sea-Ice Predictions", q: "How does sea-ice concentration affect corridor safety?", a: "Concentrations above 40% significantly increase hull friction, structural compression, and risk of besetment. Dhruv Sarthi automatically routes through lead fractures and marginal ice zones." },
  { category: "Route Optimization", q: "What trade-offs are balanced between Route A, B, and C?", a: "Route A minimizes transit time, Route B avoids high-risk iceberg drift corridors by keeping to deeper open leads, and Route C optimizes specific fuel consumption against head currents and pack ice resistance." },
  { category: "Dynamic Re-Routing", q: "What triggers autonomous re-route recommendations?", a: "If a newly observed or accelerating iceberg (such as IBG-1247 or A23A) has an uncertainty corridor intersecting the active waypoint within 12 hours, the platform elevates alert levels and dispatches an alternative safe corridor." },
  { category: "Sensors & Satellites", q: "What telemetry sources feed into the system?", a: "Multi-satellite SAR constellations (Sentinel-1, NISAR), MODIS/VIIRS multi-spectral optical data, AMSR-2 microwave radiometry, and shipboard Doppler sonar telemetry." },
];
