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

// Realistic mock iceberg locations distributed across major Antarctic maritime sectors
export const icebergs: Iceberg[] = [
  {
    id: "IBG-1247",
    position: p(470, 330, -66.8, -33.1),
    observedAt: "26 Aug 2026 10:00 UTC",
    speedMs: 0.42,
    headingDeg: 215,
    riskLevel: "high",
    predictedPath: [
      p(470, 330, -66.8, -33.1),
      p(455, 375, -67.2, -33.9),
      p(438, 425, -67.7, -34.7),
      p(418, 480, -68.2, -35.6),
      p(396, 540, -68.8, -36.6),
    ],
    uncertainty: [4, 12, 24, 40, 60],
    confidence: 89,
    sizeKm: 3.2,
  },
  {
    id: "IBG-A23A",
    position: p(210, 140, -60.8, -46.5),
    observedAt: "26 Aug 2026 09:45 UTC",
    speedMs: 0.68,
    headingDeg: 78,
    riskLevel: "high",
    predictedPath: [
      p(210, 140, -60.8, -46.5),
      p(235, 130, -60.5, -45.2),
      p(262, 120, -60.1, -43.8),
      p(290, 110, -59.7, -42.2),
      p(320, 100, -59.2, -40.5),
    ],
    uncertainty: [5, 14, 28, 46, 68],
    confidence: 94,
    sizeKm: 42.0,
  },
  {
    id: "IBG-1183",
    position: p(640, 300, -66.0, -21.0),
    observedAt: "26 Aug 2026 09:20 UTC",
    speedMs: 0.28,
    headingDeg: 190,
    riskLevel: "medium",
    predictedPath: [
      p(640, 300, -66.0, -21.0),
      p(636, 350, -66.4, -21.4),
      p(630, 405, -66.9, -21.9),
      p(622, 465, -67.4, -22.5),
    ],
    uncertainty: [3, 10, 20, 34],
    confidence: 81,
    sizeKm: 1.8,
  },
  {
    id: "IBG-B15K",
    position: p(820, 180, -73.2, 176.4),
    observedAt: "26 Aug 2026 08:30 UTC",
    speedMs: 0.36,
    headingDeg: 310,
    riskLevel: "medium",
    predictedPath: [
      p(820, 180, -73.2, 176.4),
      p(800, 160, -72.7, 175.1),
      p(778, 140, -72.1, 173.8),
      p(755, 120, -71.5, 172.4),
    ],
    uncertainty: [4, 11, 23, 38],
    confidence: 86,
    sizeKm: 8.5,
  },
  {
    id: "IBG-D28",
    position: p(760, 420, -67.5, 74.3),
    observedAt: "26 Aug 2026 07:50 UTC",
    speedMs: 0.44,
    headingDeg: 285,
    riskLevel: "medium",
    predictedPath: [
      p(760, 420, -67.5, 74.3),
      p(740, 410, -67.3, 72.8),
      p(718, 400, -67.0, 71.2),
      p(695, 390, -66.7, 69.5),
    ],
    uncertainty: [3, 10, 22, 36],
    confidence: 84,
    sizeKm: 18.2,
  },
  {
    id: "IBG-C19A",
    position: p(680, 150, -65.4, 141.2),
    observedAt: "26 Aug 2026 06:15 UTC",
    speedMs: 0.22,
    headingDeg: 260,
    riskLevel: "low",
    predictedPath: [
      p(680, 150, -65.4, 141.2),
      p(665, 148, -65.3, 139.8),
      p(648, 145, -65.1, 138.2),
    ],
    uncertainty: [2, 8, 16],
    confidence: 79,
    sizeKm: 12.4,
  },
  {
    id: "IBG-0842",
    position: p(310, 520, -71.1, -104.2),
    observedAt: "26 Aug 2026 08:10 UTC",
    speedMs: 0.52,
    headingDeg: 340,
    riskLevel: "high",
    predictedPath: [
      p(310, 520, -71.1, -104.2),
      p(305, 470, -70.5, -104.8),
      p(298, 420, -69.9, -105.5),
      p(290, 370, -69.2, -106.3),
    ],
    uncertainty: [4, 13, 26, 42],
    confidence: 88,
    sizeKm: 5.6,
  },
  {
    id: "IBG-1405",
    position: p(250, 390, -70.4, -79.8),
    observedAt: "26 Aug 2026 07:40 UTC",
    speedMs: 0.31,
    headingDeg: 15,
    riskLevel: "medium",
    predictedPath: [
      p(250, 390, -70.4, -79.8),
      p(253, 345, -69.9, -79.5),
      p(258, 300, -69.3, -79.1),
    ],
    uncertainty: [3, 9, 19],
    confidence: 82,
    sizeKm: 4.1,
  },
  {
    id: "IBG-0996",
    position: p(180, 200, -63.5, -56.8),
    observedAt: "26 Aug 2026 08:40 UTC",
    speedMs: 0.19,
    headingDeg: 205,
    riskLevel: "low",
    predictedPath: [
      p(180, 200, -63.5, -56.8),
      p(172, 240, -63.9, -57.3),
      p(163, 285, -64.3, -57.8),
    ],
    uncertainty: [3, 9, 18],
    confidence: 76,
    sizeKm: 1.2,
  },
  {
    id: "IBG-1290",
    position: p(560, 430, -68.3, -25.6),
    observedAt: "26 Aug 2026 07:10 UTC",
    speedMs: 0.35,
    headingDeg: 230,
    riskLevel: "medium",
    predictedPath: [
      p(560, 430, -68.3, -25.6),
      p(540, 470, -68.7, -26.4),
      p(517, 515, -69.2, -27.3),
    ],
    uncertainty: [3, 11, 22],
    confidence: 79,
    sizeKm: 2.1,
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

export const hazards: Hazard[] = [
  { id: "IBG-1247", type: "Iceberg", location: "66.8°S 33.1°W", severity: "high", predictedTime: "+18h", confidence: 89, affectedRoute: "Route A", status: "active" },
  { id: "IBG-A23A", type: "Iceberg", location: "60.8°S 46.5°W", severity: "high", predictedTime: "+12h", confidence: 94, affectedRoute: "Route A", status: "active" },
  { id: "IBG-1290", type: "Iceberg", location: "68.3°S 25.6°W", severity: "medium", predictedTime: "+31h", confidence: 79, affectedRoute: "Route C", status: "predicted" },
  { id: "SI-E-01", type: "Sea-Ice", location: "67.0°S 14.0°W", severity: "medium", predictedTime: "+24h", confidence: 72, affectedRoute: "Route C", status: "active" },
  { id: "WX-04", type: "Weather", location: "66.0°S 22.0°W", severity: "medium", predictedTime: "+12h", confidence: 68, affectedRoute: "Route A", status: "predicted" },
  { id: "IBG-1183", type: "Iceberg", location: "66.0°S 21.0°W", severity: "medium", predictedTime: "+40h", confidence: 81, affectedRoute: "Route B", status: "predicted" },
  { id: "VIS-02", type: "Visibility", location: "66.4°S 30.2°W", severity: "high", predictedTime: "+12h", confidence: 70, affectedRoute: "Route A", status: "predicted" },
  { id: "OCN-07", type: "Ocean", location: "68.9°S 27.0°W", severity: "low", predictedTime: "+36h", confidence: 65, affectedRoute: "Route C", status: "active" },
];

export const alerts: AlertItem[] = [
  { id: "al-1", title: "CRITICAL ICEBERG PROXIMITY", message: "Tabular iceberg IBG-1247 trajectory projected within 1.8 nm of Route A corridor. Immediate reroute recommended.", severity: "critical", time: "10:28 UTC" },
  { id: "al-2", title: "MEGABERG A23A DRIFT SIGNAL", message: "A23A perimeter drift acceleration observed in South Scotia corridor (0.68 m/s, 078°).", severity: "warning", time: "10:12 UTC" },
  { id: "al-3", title: "SEA-ICE CONVERGENCE", message: "Dynamic pack-ice compression increasing along Route A eastern waypoint 3.", severity: "info", time: "09:47 UTC" },
];

export const systemMeta = {
  lastUpdated: "26 Aug 2026 10:30 UTC",
  utc: "10:30 UTC",
};
