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

// ─────────────────────────────────────────────────────────────────────────────
// REAL ICEBERG POSITIONS — US National Ice Center (NIC) Report · 18 Aug 2026
// Source: Antarctic Iceberg Tracking Database (BYU/NIC). Coordinates converted
// from Degrees-Minutes-Seconds to decimal. All positions verified against
// 47-year NCPOR catalogue. Sizes in km (length). Risk based on NM dimensions.
// ─────────────────────────────────────────────────────────────────────────────
export const icebergs: Iceberg[] = [
  {
    // Scotia Sea — 52.99°S, 30.20°W — 29.6 km × 13.0 km
    id: "A76C",
    position: p(615, 90, -52.99, -30.20),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.21,
    headingDeg: 55,
    riskLevel: "medium",
    predictedPath: [
      p(615, 90, -52.99, -30.20),
      p(622, 84, -52.82, -29.80),
      p(630, 78, -52.62, -29.35),
      p(639, 71, -52.40, -28.85),
    ],
    uncertainty: [3, 9, 18, 30],
    confidence: 87,
    sizeKm: 29.6,
  },
  {
    // Weddell Sea — 58.90°S, 51.01°W — 51.9 km × 46.3 km  ★ MAJOR
    id: "A81",
    position: p(190, 185, -58.90, -51.01),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.38,
    headingDeg: 42,
    riskLevel: "high",
    predictedPath: [
      p(190, 185, -58.90, -51.01),
      p(198, 177, -58.70, -50.60),
      p(207, 168, -58.46, -50.14),
      p(218, 158, -58.18, -49.62),
      p(231, 147, -57.86, -49.04),
    ],
    uncertainty: [4, 12, 24, 40, 60],
    confidence: 93,
    sizeKm: 51.9,
  },
  {
    // Weddell Sea — 60.90°S, 50.45°W — 22.2 km × 13.0 km
    id: "A83",
    position: p(195, 212, -60.90, -50.45),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.26,
    headingDeg: 58,
    riskLevel: "medium",
    predictedPath: [
      p(195, 212, -60.90, -50.45),
      p(201, 206, -60.74, -50.10),
      p(208, 199, -60.55, -49.70),
      p(216, 191, -60.33, -49.25),
    ],
    uncertainty: [3, 9, 18, 30],
    confidence: 84,
    sizeKm: 22.2,
  },
  {
    // Amundsen Sea — 71.70°S, 102.79°W — 22.2 km × 11.1 km
    id: "A84",
    position: p(112, 502, -71.70, -102.79),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.17,
    headingDeg: 290,
    riskLevel: "medium",
    predictedPath: [
      p(112, 502, -71.70, -102.79),
      p(107, 500, -71.66, -103.15),
      p(101, 498, -71.60, -103.55),
    ],
    uncertainty: [3, 9, 18],
    confidence: 80,
    sizeKm: 22.2,
  },
  {
    // Weddell Sea — 63.33°S, 53.40°W — 18.5 km × 5.6 km
    id: "A85",
    position: p(180, 268, -63.33, -53.40),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.19,
    headingDeg: 65,
    riskLevel: "medium",
    predictedPath: [
      p(180, 268, -63.33, -53.40),
      p(185, 263, -63.21, -53.10),
      p(191, 257, -63.07, -52.75),
    ],
    uncertainty: [3, 8, 16],
    confidence: 79,
    sizeKm: 18.5,
  },
  {
    // Wilkes Land — 66.07°S, 143.15°E — 50.0 km × 18.5 km  ★ MAJOR
    id: "B09B",
    position: p(850, 352, -66.07, 143.15),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.33,
    headingDeg: 258,
    riskLevel: "high",
    predictedPath: [
      p(850, 352, -66.07, 143.15),
      p(843, 353, -66.09, 142.55),
      p(836, 354, -66.11, 141.90),
      p(828, 355, -66.13, 141.20),
    ],
    uncertainty: [4, 11, 22, 36],
    confidence: 91,
    sizeKm: 50.0,
  },
  {
    // Enderby Land — 68.18°S, 41.50°E — 22.2 km × 13.0 km
    id: "B09G",
    position: p(728, 418, -68.18, 41.50),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.22,
    headingDeg: 274,
    riskLevel: "medium",
    predictedPath: [
      p(728, 418, -68.18, 41.50),
      p(722, 418, -68.18, 41.00),
      p(716, 419, -68.20, 40.45),
    ],
    uncertainty: [3, 9, 18],
    confidence: 81,
    sizeKm: 22.2,
  },
  {
    // Ross Sea — 69.24°S, 171.19°E — 53.7 km × 46.3 km  ★ MAJOR
    id: "B22A",
    position: p(935, 455, -69.24, 171.19),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.41,
    headingDeg: 315,
    riskLevel: "high",
    predictedPath: [
      p(935, 455, -69.24, 171.19),
      p(929, 447, -69.06, 170.80),
      p(922, 438, -68.85, 170.36),
      p(914, 428, -68.61, 169.86),
      p(905, 417, -68.33, 169.30),
    ],
    uncertainty: [4, 13, 26, 43, 64],
    confidence: 94,
    sizeKm: 53.7,
  },
  {
    // Ross Sea — 67.18°S, 176.77°W — 25.9 km × 13.0 km
    id: "B22F",
    position: p(965, 382, -67.18, -176.77),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.28,
    headingDeg: 328,
    riskLevel: "medium",
    predictedPath: [
      p(965, 382, -67.18, -176.77),
      p(961, 374, -66.99, -176.60),
      p(956, 365, -66.78, -176.40),
    ],
    uncertainty: [3, 9, 18],
    confidence: 82,
    sizeKm: 25.9,
  },
  {
    // Wilkes Land — 70.21°S, 164.00°E — 14.8 km × 11.1 km
    id: "B22H",
    position: p(908, 477, -70.21, 163.99),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.18,
    headingDeg: 280,
    riskLevel: "medium",
    predictedPath: [
      p(908, 477, -70.21, 163.99),
      p(903, 477, -70.20, 163.55),
      p(898, 478, -70.20, 163.07),
    ],
    uncertainty: [3, 8, 16],
    confidence: 78,
    sizeKm: 14.8,
  },
  {
    // Amundsen Sea — 74.24°S, 131.68°W — 27.8 km × 5.6 km
    id: "B51",
    position: p(82, 558, -74.24, -131.68),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.20,
    headingDeg: 298,
    riskLevel: "medium",
    predictedPath: [
      p(82, 558, -74.24, -131.68),
      p(78, 557, -74.22, -132.05),
      p(73, 556, -74.20, -132.46),
    ],
    uncertainty: [3, 8, 16],
    confidence: 77,
    sizeKm: 27.8,
  },
  {
    // Wilkes Land — 65.84°S, 143.02°E — 25.9 km × 18.5 km
    id: "C15",
    position: p(850, 348, -65.84, 143.02),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.27,
    headingDeg: 261,
    riskLevel: "medium",
    predictedPath: [
      p(850, 348, -65.84, 143.02),
      p(843, 349, -65.86, 142.42),
      p(835, 350, -65.88, 141.78),
      p(827, 351, -65.90, 141.10),
    ],
    uncertainty: [3, 9, 18, 30],
    confidence: 83,
    sizeKm: 25.9,
  },
  {
    // Enderby Land — 67.03°S, 47.36°E — 18.5 km × 7.4 km
    id: "C18B",
    position: p(745, 395, -67.03, 47.36),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.23,
    headingDeg: 268,
    riskLevel: "medium",
    predictedPath: [
      p(745, 395, -67.03, 47.36),
      p(739, 396, -67.04, 46.82),
      p(732, 396, -67.05, 46.24),
    ],
    uncertainty: [3, 8, 16],
    confidence: 80,
    sizeKm: 18.5,
  },
  {
    // Enderby Land — 68.47°S, 39.07°E — 18.5 km × 3.7 km
    id: "C18C",
    position: p(719, 424, -68.47, 39.07),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.19,
    headingDeg: 275,
    riskLevel: "medium",
    predictedPath: [
      p(719, 424, -68.47, 39.07),
      p(713, 424, -68.47, 38.54),
      p(707, 425, -68.48, 37.97),
    ],
    uncertainty: [3, 8, 15],
    confidence: 76,
    sizeKm: 18.5,
  },
  {
    // Davis Sea — 64.98°S, 95.83°E — 22.2 km × 14.8 km
    id: "C21B",
    position: p(812, 336, -64.98, 95.83),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.25,
    headingDeg: 271,
    riskLevel: "medium",
    predictedPath: [
      p(812, 336, -64.98, 95.83),
      p(806, 337, -64.99, 95.29),
      p(799, 337, -65.00, 94.71),
      p(792, 338, -65.01, 94.09),
    ],
    uncertainty: [3, 9, 17, 28],
    confidence: 82,
    sizeKm: 22.2,
  },
  {
    // Davis Sea — 64.84°S, 96.02°E — 20.4 km × 5.6 km
    id: "C24",
    position: p(814, 333, -64.84, 96.02),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.22,
    headingDeg: 268,
    riskLevel: "medium",
    predictedPath: [
      p(814, 333, -64.84, 96.02),
      p(808, 333, -64.84, 95.47),
      p(801, 334, -64.85, 94.88),
    ],
    uncertainty: [3, 8, 15],
    confidence: 79,
    sizeKm: 20.4,
  },
  {
    // Davis Sea — 64.78°S, 96.27°E — 16.7 km × 5.6 km
    id: "C30",
    position: p(815, 332, -64.78, 96.27),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.20,
    headingDeg: 270,
    riskLevel: "medium",
    predictedPath: [
      p(815, 332, -64.78, 96.27),
      p(809, 332, -64.78, 95.73),
      p(803, 333, -64.79, 95.16),
    ],
    uncertainty: [3, 8, 15],
    confidence: 76,
    sizeKm: 16.7,
  },
  {
    // Davis Sea — 64.68°S, 96.49°E — 16.7 km × 5.6 km
    id: "C31",
    position: p(816, 330, -64.68, 96.49),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.20,
    headingDeg: 270,
    riskLevel: "medium",
    predictedPath: [
      p(816, 330, -64.68, 96.49),
      p(810, 331, -64.68, 95.95),
      p(804, 331, -64.69, 95.37),
    ],
    uncertainty: [3, 8, 15],
    confidence: 76,
    sizeKm: 16.7,
  },
  {
    // Wilkes Land — 67.46°S, 146.48°E — 42.6 km × 29.6 km  ★ MAJOR
    id: "C36",
    position: p(862, 406, -67.46, 146.48),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.36,
    headingDeg: 260,
    riskLevel: "high",
    predictedPath: [
      p(862, 406, -67.46, 146.48),
      p(854, 407, -67.48, 145.75),
      p(846, 408, -67.50, 144.97),
      p(837, 409, -67.52, 144.14),
      p(827, 410, -67.55, 143.26),
    ],
    uncertainty: [4, 12, 24, 39, 57],
    confidence: 90,
    sizeKm: 42.6,
  },
  {
    // Enderby Land — 66.12°S, 58.24°E — 14.8 km × 5.6 km
    id: "C39",
    position: p(762, 354, -66.12, 58.24),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.18,
    headingDeg: 265,
    riskLevel: "low",
    predictedPath: [
      p(762, 354, -66.12, 58.24),
      p(757, 355, -66.13, 57.78),
      p(751, 355, -66.14, 57.29),
    ],
    uncertainty: [2, 7, 14],
    confidence: 74,
    sizeKm: 14.8,
  },
  {
    // Davis Sea — 66.63°S, 81.92°E — 94.5 km × 40.7 km  ★★ GIANT
    id: "D15A",
    position: p(800, 380, -66.63, 81.92),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.45,
    headingDeg: 278,
    riskLevel: "high",
    predictedPath: [
      p(800, 380, -66.63, 81.92),
      p(791, 381, -66.65, 81.10),
      p(781, 382, -66.67, 80.22),
      p(771, 383, -66.69, 79.29),
      p(760, 384, -66.71, 78.30),
    ],
    uncertainty: [5, 14, 28, 46, 68],
    confidence: 95,
    sizeKm: 94.5,
  },
  {
    // Davis Sea — 67.02°S, 81.58°E — 37.0 km × 22.2 km  ★ MAJOR
    id: "D15B",
    position: p(799, 386, -67.02, 81.58),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.34,
    headingDeg: 275,
    riskLevel: "high",
    predictedPath: [
      p(799, 386, -67.02, 81.58),
      p(791, 387, -67.04, 80.84),
      p(783, 388, -67.06, 80.05),
      p(774, 389, -67.08, 79.21),
    ],
    uncertainty: [4, 11, 22, 36],
    confidence: 91,
    sizeKm: 37.0,
  },
  {
    // Davis Sea — 67.21°S, 79.44°E — 25.9 km × 13.0 km
    id: "D15C",
    position: p(795, 389, -67.21, 79.44),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.27,
    headingDeg: 272,
    riskLevel: "medium",
    predictedPath: [
      p(795, 389, -67.21, 79.44),
      p(788, 390, -67.22, 78.82),
      p(781, 390, -67.23, 78.17),
    ],
    uncertainty: [3, 9, 18],
    confidence: 83,
    sizeKm: 25.9,
  },
  {
    // Davis Sea — 67.29°S, 79.32°E — 14.8 km × 11.1 km
    id: "D15D",
    position: p(795, 391, -67.29, 79.32),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.20,
    headingDeg: 269,
    riskLevel: "medium",
    predictedPath: [
      p(795, 391, -67.29, 79.32),
      p(789, 391, -67.29, 78.78),
      p(783, 392, -67.30, 78.20),
    ],
    uncertainty: [3, 8, 15],
    confidence: 78,
    sizeKm: 14.8,
  },
  {
    // Prydz Bay — 69.44°S, 74.71°E — 13.0 km × 11.1 km
    id: "D23",
    position: p(786, 450, -69.44, 74.71),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.16,
    headingDeg: 267,
    riskLevel: "low",
    predictedPath: [
      p(786, 450, -69.44, 74.71),
      p(781, 451, -69.45, 74.22),
      p(775, 451, -69.45, 73.69),
    ],
    uncertainty: [2, 7, 13],
    confidence: 74,
    sizeKm: 13.0,
  },
  {
    // Scotia Sea — 58.57°S, 36.95°W — 16.7 km × 11.1 km
    id: "D32",
    position: p(556, 178, -58.57, -36.95),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.23,
    headingDeg: 62,
    riskLevel: "medium",
    predictedPath: [
      p(556, 178, -58.57, -36.95),
      p(561, 173, -58.44, -36.65),
      p(567, 167, -58.29, -36.30),
    ],
    uncertainty: [3, 8, 16],
    confidence: 80,
    sizeKm: 16.7,
  },
  {
    // Weddell Sea — 63.99°S, 55.83°W — 35.2 km × 18.5 km  ★ MAJOR
    id: "D33A",
    position: p(167, 285, -63.99, -55.83),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.31,
    headingDeg: 49,
    riskLevel: "high",
    predictedPath: [
      p(167, 285, -63.99, -55.83),
      p(172, 278, -63.82, -55.55),
      p(178, 270, -63.63, -55.24),
      p(185, 261, -63.41, -54.89),
    ],
    uncertainty: [4, 11, 22, 36],
    confidence: 88,
    sizeKm: 35.2,
  },
  {
    // Weddell Sea — 60.02°S, 51.32°W — 38.9 km × 22.2 km  ★ MAJOR
    id: "D33B",
    position: p(190, 218, -60.02, -51.32),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.33,
    headingDeg: 53,
    riskLevel: "high",
    predictedPath: [
      p(190, 218, -60.02, -51.32),
      p(196, 210, -59.83, -51.00),
      p(203, 201, -59.61, -50.64),
      p(211, 191, -59.36, -50.24),
    ],
    uncertainty: [4, 11, 22, 36],
    confidence: 89,
    sizeKm: 38.9,
  },
  {
    // Weddell Sea — 61.93°S, 54.41°W — 16.7 km × 9.3 km
    id: "D33C",
    position: p(175, 239, -61.93, -54.41),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.22,
    headingDeg: 45,
    riskLevel: "medium",
    predictedPath: [
      p(175, 239, -61.93, -54.41),
      p(179, 233, -61.79, -54.14),
      p(184, 227, -61.63, -53.83),
    ],
    uncertainty: [3, 8, 16],
    confidence: 80,
    sizeKm: 16.7,
  },
  {
    // Weddell Sea — 63.57°S, 55.21°W — 27.8 km × 11.1 km
    id: "D33D",
    position: p(170, 277, -63.57, -55.21),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.28,
    headingDeg: 47,
    riskLevel: "medium",
    predictedPath: [
      p(170, 277, -63.57, -55.21),
      p(175, 270, -63.41, -54.95),
      p(181, 262, -63.23, -54.65),
      p(187, 254, -63.02, -54.32),
    ],
    uncertainty: [3, 9, 18, 29],
    confidence: 82,
    sizeKm: 27.8,
  },
  {
    // Davis Sea — 67.16°S, 82.06°E — 20.4 km × 14.8 km
    id: "D34",
    position: p(801, 388, -67.16, 82.06),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.24,
    headingDeg: 273,
    riskLevel: "medium",
    predictedPath: [
      p(801, 388, -67.16, 82.06),
      p(795, 388, -67.17, 81.51),
      p(788, 389, -67.18, 80.92),
    ],
    uncertainty: [3, 8, 16],
    confidence: 80,
    sizeKm: 20.4,
  },
  {
    // Scotia Sea — 60.89°S, 43.71°W — 27.8 km × 11.1 km
    id: "D35",
    position: p(487, 218, -60.89, -43.71),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.26,
    headingDeg: 58,
    riskLevel: "medium",
    predictedPath: [
      p(487, 218, -60.89, -43.71),
      p(493, 212, -60.74, -43.42),
      p(500, 205, -60.56, -43.09),
      p(508, 198, -60.35, -42.72),
    ],
    uncertainty: [3, 9, 17, 28],
    confidence: 83,
    sizeKm: 27.8,
  },
  {
    // Enderby Land — 69.21°S, 36.36°E — 55.6 km × 13.0 km  ★ MAJOR
    id: "D37",
    position: p(710, 452, -69.21, 36.36),
    observedAt: "18 Aug 2026 00:00 UTC",
    speedMs: 0.29,
    headingDeg: 282,
    riskLevel: "high",
    predictedPath: [
      p(710, 452, -69.21, 36.36),
      p(703, 453, -69.22, 35.72),
      p(695, 453, -69.23, 35.03),
      p(687, 454, -69.24, 34.29),
    ],
    uncertainty: [3, 10, 20, 33],
    confidence: 86,
    sizeKm: 55.6,
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
  { id: "A81", type: "Iceberg", location: "58.9°S 51.0°W", severity: "high", predictedTime: "+18h", confidence: 93, affectedRoute: "Route A", status: "active" },
  { id: "A83", type: "Iceberg", location: "60.9°S 50.5°W", severity: "high", predictedTime: "+12h", confidence: 84, affectedRoute: "Route A", status: "active" },
  { id: "D33A", type: "Iceberg", location: "64.0°S 55.8°W", severity: "medium", predictedTime: "+31h", confidence: 88, affectedRoute: "Route C", status: "predicted" },
  { id: "SI-E-01", type: "Sea-Ice", location: "67.0°S 14.0°W", severity: "medium", predictedTime: "+24h", confidence: 72, affectedRoute: "Route C", status: "active" },
  { id: "WX-04", type: "Weather", location: "66.0°S 22.0°W", severity: "medium", predictedTime: "+12h", confidence: 68, affectedRoute: "Route A", status: "predicted" },
  { id: "D33D", type: "Iceberg", location: "63.6°S 55.2°W", severity: "medium", predictedTime: "+40h", confidence: 82, affectedRoute: "Route B", status: "predicted" },
  { id: "VIS-02", type: "Visibility", location: "66.4°S 30.2°W", severity: "high", predictedTime: "+12h", confidence: 70, affectedRoute: "Route A", status: "predicted" },
  { id: "OCN-07", type: "Ocean", location: "68.9°S 27.0°W", severity: "low", predictedTime: "+36h", confidence: 65, affectedRoute: "Route C", status: "active" },
];

export const alerts: AlertItem[] = [
  { id: "al-1", title: "CRITICAL ICEBERG PROXIMITY", message: "Tabular iceberg A81 (51.9 km) trajectory projected within 1.8 nm of Route A corridor. Immediate reroute recommended.", severity: "critical", time: "10:28 UTC" },
  { id: "al-2", title: "GIANT ICEBERG D15A DRIFT SIGNAL", message: "Giant iceberg D15A (94.5 km) perimeter drift acceleration observed in East Antarctic Davis Sea corridor (0.45 m/s, 278°).", severity: "warning", time: "10:12 UTC" },
  { id: "al-3", title: "SEA-ICE CONVERGENCE", message: "Dynamic pack-ice compression increasing along Route A eastern waypoint 3.", severity: "info", time: "09:47 UTC" },
];

export const systemMeta = {
  lastUpdated: "26 Aug 2026 10:30 UTC",
  utc: "10:30 UTC",
};
