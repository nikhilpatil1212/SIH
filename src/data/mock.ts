// Mock data source for Dhruv Sarthi — Antarctic Navigation AI.
// All values are illustrative high-fidelity demo data for maritime decision support.

import type {
  AlertItem,
  CurrentArrow,
  Environment,
  Hazard,
  Iceberg,
  RiskFactor,
  Route,
  SeaIceRegion,
  Vessel,
} from "./types";

const p = (x: number, y: number, lat: number, lon: number) => ({ x, y, lat, lon });

// Antarctic coastline (Weddell Sea sector), mock, drawn along the bottom of the canvas.
export const coastline = [
  p(0, 760, -70.1, -60.0),
  p(120, 720, -70.4, -52.0),
  p(230, 745, -70.7, -45.0),
  p(340, 700, -71.2, -38.0),
  p(430, 730, -71.6, -32.0),
  p(540, 690, -72.1, -25.0),
  p(660, 715, -72.6, -18.0),
  p(770, 680, -73.0, -11.0),
  p(880, 705, -73.4, -4.0),
  p(1000, 675, -73.8, 3.0),
  p(1000, 1000, -78.0, 3.0),
  p(0, 1000, -78.0, -60.0),
];

// A small ice shelf / land promontory jutting into the sea.
export const iceShelf = [
  p(360, 760, -71.4, -37.0),
  p(430, 700, -71.9, -32.0),
  p(500, 720, -72.2, -27.0),
  p(560, 800, -72.0, -23.0),
  p(470, 850, -71.6, -29.0),
  p(380, 830, -71.3, -35.0),
];

export const vessel: Vessel = {
  id: "RV-POLARSTAR",
  name: "RV Polar Star (SARATHI-1)",
  iceClass: "PC6",
  position: p(160, 250, -64.2, -54.3),
  speedKn: 14,
  headingDeg: 247,
  courseDeg: 247,
  status: "Underway",
  mission: "Polar Research & Escort",
};

export const destination = p(830, 560, -71.5, -8.4);

/// Canonical USNIC Tracked Icebergs (Source: U.S. National Ice Center)
export const icebergs: Iceberg[] = [
  {
    id: "A76C",
    position: p(779, -964, -53.73, -29.5),
    observedAt: "27 Aug 2026 (USNIC tracked)",
    speedMs: 0.22,
    headingDeg: 307.9,
    riskLevel: "high",
    predictedPath: [
      p(779, -964, -53.73, -29.5),
      p(768, -940, -53.58, -29.85),
      p(755, -912, -53.42, -30.25),
      p(740, -880, -53.25, -30.70),
      p(722, -845, -53.05, -31.22),
      p(701, -805, -52.82, -31.80),
    ],
    uncertainty: [2.0, 4.0, 7.0, 10.5, 14.5],
    confidence: 88,
    sizeKm: 29.63,
    lengthNm: 16.0,
    widthNm: 7.0,
    region: "Bellingshausen / Weddell Sea (Quadrant A)",
    hasKinematics: true,
  },
  {
    id: "A81",
    position: p(411, -513, -58.74, -49.94),
    observedAt: "27 Aug 2026 (USNIC tracked)",
    speedMs: 0.05,
    headingDeg: 56.3,
    riskLevel: "high",
    predictedPath: [
      p(411, -513, -58.74, -49.94),
      p(415, -518, -58.68, -49.85),
      p(420, -524, -58.61, -49.74),
      p(426, -532, -58.52, -49.60),
      p(433, -541, -58.42, -49.44),
      p(441, -552, -58.30, -49.25),
    ],
    uncertainty: [2.0, 4.0, 7.0, 10.5, 14.5],
    confidence: 91,
    sizeKm: 51.86,
    lengthNm: 28.0,
    widthNm: 25.0,
    region: "Bellingshausen / Weddell Sea (Quadrant A)",
    hasKinematics: true,
  },
  {
    id: "A83",
    position: p(404, -299, -61.12, -50.36),
    observedAt: "27 Aug 2026 (USNIC tracked)",
    speedMs: 0.02,
    headingDeg: 243.7,
    riskLevel: "medium",
    predictedPath: [
      p(404, -299, -61.12, -50.36),
      p(400, -295, -61.16, -50.45),
      p(395, -290, -61.21, -50.56),
      p(389, -284, -61.27, -50.69),
    ],
    uncertainty: [2.0, 4.0, 7.0, 10.5],
    confidence: 84,
    sizeKm: 22.22,
    lengthNm: 12.0,
    widthNm: 7.0,
    region: "Bellingshausen / Weddell Sea (Quadrant A)",
    hasKinematics: true,
  },
  {
    id: "A84",
    position: p(-521, 642, -71.58, -101.73),
    observedAt: "27 Aug 2026 (USNIC tracked)",
    speedMs: 0.1,
    headingDeg: 317.8,
    riskLevel: "medium",
    predictedPath: [
      p(-521, 642, -71.58, -101.73),
      p(-528, 650, -71.50, -101.90),
      p(-536, 660, -71.41, -102.10),
      p(-545, 672, -71.30, -102.35),
    ],
    uncertainty: [2.0, 4.0, 7.0, 10.5],
    confidence: 82,
    sizeKm: 22.22,
    lengthNm: 12.0,
    widthNm: 6.0,
    region: "Bellingshausen / Weddell Sea (Quadrant A)",
    hasKinematics: true,
  },
  {
    id: "A85",
    position: p(349, -143, -62.85, -53.38),
    observedAt: "27 Aug 2026 (USNIC tracked)",
    speedMs: 0.04,
    headingDeg: 183.3,
    riskLevel: "medium",
    predictedPath: [
      p(349, -143, -62.85, -53.38),
      p(348, -135, -62.94, -53.39),
      p(347, -125, -63.05, -53.41),
      p(346, -113, -63.18, -53.43),
    ],
    uncertainty: [2.0, 4.0, 7.0, 10.5],
    confidence: 85,
    sizeKm: 18.52,
    lengthNm: 10.0,
    widthNm: 3.0,
    region: "Bellingshausen / Weddell Sea (Quadrant A)",
    hasKinematics: true,
  },
  {
    id: "B09B",
    position: p(3887, 146, -66.07, 143.15),
    observedAt: "27 Aug 2026 (USNIC tracked)",
    speedMs: 0.0,
    headingDeg: 0.0,
    riskLevel: "high",
    predictedPath: [p(3887, 146, -66.07, 143.15)],
    uncertainty: [2.0, 4.0, 7.0, 10.5],
    confidence: 85,
    sizeKm: 50.0,
    lengthNm: 27.0,
    widthNm: 10.0,
    region: "Amundsen / Ross Sea (Quadrant B)",
    hasKinematics: true,
  },
  {
    id: "B22A",
    position: p(4372, 453, -69.48, 170.13),
    observedAt: "27 Aug 2026 (USNIC tracked)",
    speedMs: 0.0,
    headingDeg: 0.0,
    riskLevel: "high",
    predictedPath: [p(4372, 453, -69.48, 170.13)],
    uncertainty: [2.0, 4.0, 7.0, 10.5],
    confidence: 85,
    sizeKm: 53.71,
    lengthNm: 29.0,
    widthNm: 25.0,
    region: "Amundsen / Ross Sea (Quadrant B)",
    hasKinematics: true,
  },
];

// Low-risk iceberg observation cluster (small dots).
export const icebergCluster = [
  p(700, 380, -67.6, -16.0),
  p(715, 395, -67.8, -15.2),
  p(690, 405, -67.9, -16.5),
  p(722, 372, -67.5, -14.8),
  p(705, 415, -68.1, -15.7),
];

export const seaIceRegions: SeaIceRegion[] = [
  {
    id: "SI-N",
    concentration: 35,
    polygon: [p(120, 120, -63, -56), p(360, 90, -63, -42), p(520, 160, -64, -30), p(400, 220, -65, -36), p(200, 210, -65, -50), p(90, 170, -64, -57)],
  },
  {
    id: "SI-E",
    concentration: 58,
    polygon: [p(720, 220, -66, -14), p(940, 200, -66, -1), p(1000, 320, -68, 3), p(860, 360, -68, -6), p(720, 320, -67, -14)],
  },
  {
    id: "SI-ROSS",
    concentration: 48,
    polygon: [p(800, 120, -72, 170), p(860, 150, -74, 178), p(840, 220, -75, 174), p(780, 180, -73, 168)],
  },
];

export const currents: CurrentArrow[] = [
  { from: p(240, 180, -64, -50), angleDeg: 250, strength: 0.6 },
  { from: p(420, 260, -66, -35), angleDeg: 235, strength: 0.5 },
  { from: p(600, 210, -65, -22), angleDeg: 220, strength: 0.7 },
  { from: p(760, 300, -67, -12), angleDeg: 210, strength: 0.4 },
  { from: p(340, 400, -68, -40), angleDeg: 245, strength: 0.55 },
];

export const routes: Route[] = [
  {
    id: "route-a",
    name: "Route A",
    type: "fastest",
    color: "#3b82f6",
    coordinates: [
      p(160, 250, -64.2, -54.3),
      p(320, 300, -66, -44),
      p(470, 360, -67, -33),
      p(620, 430, -69, -22),
      p(830, 560, -71.5, -8.4),
    ],
    waypoints: [p(320, 300, -66, -44), p(470, 360, -67, -33), p(620, 430, -69, -22)],
    distanceNm: 1240,
    eta: "4d 6h",
    fuelT: 110,
    riskScore: 78,
    riskLevel: "high",
  },
  {
    id: "route-b",
    name: "Route B",
    type: "safest",
    color: "#10b981",
    coordinates: [
      p(160, 250, -64.2, -54.3),
      p(300, 200, -64, -45),
      p(500, 210, -64.5, -30),
      p(700, 300, -66, -16),
      p(830, 560, -71.5, -8.4),
    ],
    waypoints: [p(300, 200, -64, -45), p(500, 210, -64.5, -30), p(700, 300, -66, -16)],
    distanceNm: 1540,
    eta: "5d 12h",
    fuelT: 120,
    riskScore: 32,
    riskLevel: "low",
  },
  {
    id: "route-c",
    name: "Route C",
    type: "fuel",
    color: "#f59e0b",
    coordinates: [
      p(160, 250, -64.2, -54.3),
      p(280, 340, -66, -46),
      p(430, 470, -68.5, -34),
      p(640, 540, -70.5, -20),
      p(830, 560, -71.5, -8.4),
    ],
    waypoints: [p(280, 340, -66, -46), p(430, 470, -68.5, -34), p(640, 540, -70.5, -20)],
    distanceNm: 1680,
    eta: "5d 18h",
    fuelT: 95,
    riskScore: 54,
    riskLevel: "medium",
  },
];

export const riskFactorsByRoute: Record<string, RiskFactor[]> = {
  "route-a": [
    { label: "Iceberg Exposure", level: "high" },
    { label: "Sea-Ice Concentration", level: "medium" },
    { label: "Weather Conditions", level: "medium" },
    { label: "Visibility", level: "low" },
    { label: "Vessel Constraints", level: "ok" },
  ],
  "route-b": [
    { label: "Iceberg Exposure", level: "low" },
    { label: "Sea-Ice Concentration", level: "medium" },
    { label: "Weather Conditions", level: "low" },
    { label: "Visibility", level: "low" },
    { label: "Vessel Constraints", level: "ok" },
  ],
  "route-c": [
    { label: "Iceberg Exposure", level: "medium" },
    { label: "Sea-Ice Concentration", level: "high" },
    { label: "Weather Conditions", level: "medium" },
    { label: "Visibility", level: "medium" },
    { label: "Vessel Constraints", level: "ok" },
  ],
};

export const environment: Environment = {
  seaIceConcentration: 35,
  windSpeedKn: 18,
  windDir: "NE",
  visibilityKm: 2.1,
  currentKn: 0.6,
  currentDir: "SW",
  airTempC: -12,
};

// Active & Predicted Collision Hazards (Real USNIC iceberg IDs & environmental contacts)
export const hazards: Hazard[] = [
  { id: "A76C", type: "Iceberg", location: "53.7°S 29.5°W", severity: "high", predictedTime: "+12h", confidence: 88, affectedRoute: "Route A", status: "active" },
  { id: "A81", type: "Iceberg", location: "58.7°S 49.9°W", severity: "high", predictedTime: "+18h", confidence: 91, affectedRoute: "Route A", status: "active" },
  { id: "A83", type: "Iceberg", location: "61.1°S 50.4°W", severity: "medium", predictedTime: "+24h", confidence: 84, affectedRoute: "Route B", status: "predicted" },
  { id: "A85", type: "Iceberg", location: "62.9°S 53.4°W", severity: "medium", predictedTime: "+30h", confidence: 85, affectedRoute: "Route B", status: "predicted" },
  { id: "SI-E-01", type: "Sea-Ice", location: "68.2°S 29.5°W", severity: "medium", predictedTime: "+18h", confidence: 84, affectedRoute: "Route A", status: "active" },
  { id: "WX-04", type: "Weather", location: "63.5°S 41.0°W", severity: "medium", predictedTime: "+36h", confidence: 78, affectedRoute: "Route B", status: "predicted" },
  { id: "VIS-02", type: "Visibility", location: "70.1°S 12.0°E", severity: "low", predictedTime: "+48h", confidence: 72, affectedRoute: "Route C", status: "predicted" },
];

export const alerts: AlertItem[] = [
  { id: "al-1", title: "CRITICAL ICEBERG PROXIMITY", message: "Tabular iceberg A76C trajectory projected within 1.8 nm of Route A corridor. Immediate reroute recommended.", severity: "critical", time: "10:28 UTC" },
  { id: "al-2", title: "MEGABERG A81 DRIFT SIGNAL", message: "A81 perimeter drift acceleration observed in South Scotia corridor (0.05 m/s, 056°).", severity: "warning", time: "10:12 UTC" },
  { id: "al-3", title: "SEA-ICE CONVERGENCE", message: "Dynamic pack-ice compression increasing along Route A eastern waypoint 3.", severity: "info", time: "09:47 UTC" },
];

export const systemMeta = {
  lastUpdated: "27 Aug 2026 10:30 UTC",
  utc: "10:30 UTC",
};
