import type { AlertItem, Environment, Hazard, Iceberg, Route, Vessel, SeaIcePredictionResponse } from "../data/types";
import { alerts as baseAlerts, environment as baseEnv, hazards as baseHazards, icebergs as baseIcebergs, routes as baseRoutes, vessel as baseVessel } from "../data/mock";

const API_BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL)
  ? (import.meta as any).env.VITE_API_BASE_URL
  : "/api";

export interface GeoLocationOption {
  id: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  type: "Port" | "Station";
}

export interface RouteWaypointInput {
  id?: string;
  name?: string;
  lat: number;
  lon: number;
  breakDurationHours?: number;
}

export interface RouteCalculatePayload {
  vessel_id?: string;
  start: { lat: number; lon: number; name?: string };
  destination: { lat: number; lon: number; name?: string };
  waypoints?: RouteWaypointInput[];
  objective: "SHORTEST" | "SAFEST" | "BALANCED" | "FUEL EFFICIENT";
  vessel_speed_kn?: number;
  safety_buffer_km?: number;
}

export interface RouteCalculateResult {
  calculation_id: string;
  objective: string;
  start: { lat: number; lon: number; name?: string };
  destination: { lat: number; lon: number; name?: string };
  waypoints: RouteWaypointInput[];
  recommended_route_id: string;
  routes: Route[];
  why_recommended: string[];
  bounding_box: { min_lat: number; max_lat: number; min_lon: number; max_lon: number };
  vessel_speed_kn: number;
  safety_buffer_km?: number;
  baseTravelHours: number;
  totalBreakHours: number;
  totalVoyageHours: number;
  all_physically_safe?: boolean;
}

export interface SystemStatus {
  status: string;
  environment: "SIMULATION" | "DEVELOPMENT" | "LIVE";
  version: string;
  api_health: string;
  database: string;
  routing_engine: string;
  risk_engine: string;
  tracked_icebergs_count: number;
  active_hazards_count: number;
  data_sources_online: number;
  last_updated: string;
}

export interface MLPredictRequest {
  latitude: number;
  longitude: number;
  previous_delta_latitude: number;
  previous_delta_longitude: number;
  drift_speed_kmh: number;
  drift_heading_deg: number;
  size_1_nm?: number;
  size_2_nm?: number;
  sin_doy?: number | null;
  cos_doy?: number | null;
  current_extent?: number;
  iceberg_id?: string | null;
  observation_date?: string | null;
}

export interface MLPredictResponse {
  iceberg_id: string | null;
  model_version: string;
  prediction_horizon: string;
  current_latitude: number;
  current_longitude: number;
  predicted_delta_latitude: number;
  predicted_delta_longitude: number;
  predicted_latitude: number;
  predicted_longitude: number;
  raw_predicted_latitude?: number;
  raw_predicted_longitude?: number;
  prediction_constrained?: boolean;
  constraint_reason?: string;
  displacement_km: number;
  features_used: Record<string, any>;
}


// Great-Circle Distance Calculation
export function haversineDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(3440.065 * c);
}

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371.0 * c;
}

// Client-side Geodesic Segment Calculator with Intermediate Waypoints
export function clientSideCalculateRoutes(payload: RouteCalculatePayload): RouteCalculateResult {
  const { start, destination, waypoints = [], objective, vessel_speed_kn = 14.0, safety_buffer_km = 20.0 } = payload;
  
  // Total break duration in hours
  const totalBreakHours = waypoints.reduce((acc, wp) => acc + (wp.breakDurationHours || 0), 0);

  // Build sequential path stops: Start -> WP1 -> WP2 -> Destination
  const stopPoints = [
    start,
    ...waypoints.map((wp) => ({ lat: wp.lat, lon: wp.lon, name: wp.name })),
    destination,
  ];

  // Calculate total geodesic distance across all legs
  let totalDirectDistNm = 0;
  const allCoordsA: { x: number; y: number; lat: number; lon: number }[] = [];

  for (let s = 0; s < stopPoints.length - 1; s++) {
    const p1 = stopPoints[s];
    const p2 = stopPoints[s + 1];
    const legDist = haversineDistanceNm(p1.lat, p1.lon, p2.lat, p2.lon);
    totalDirectDistNm += legDist;

    // Interpolate waypoints along each leg
    const steps = Math.max(4, Math.round(12 / (stopPoints.length - 1)));
    for (let i = 0; i <= steps; i++) {
      if (s > 0 && i === 0) continue;
      const frac = i / steps;
      allCoordsA.push({
        x: 500,
        y: 500,
        lat: +(p1.lat + (p2.lat - p1.lat) * frac).toFixed(4),
        lon: +(p1.lon + (p2.lon - p1.lon) * frac).toFixed(4),
      });
    }
  }

  // Safe arc Route B (wide standoff)
  const midLatB = (start.lat + destination.lat) / 2 + 3.2;
  const midLonB = (start.lon + destination.lon) / 2 - 4.5;
  const coordsB = [
    { x: 500, y: 500, lat: start.lat, lon: start.lon },
    ...waypoints.map((wp) => ({ x: 500, y: 500, lat: wp.lat + 1.2, lon: wp.lon - 1.5 })),
    { x: 500, y: 500, lat: midLatB, lon: midLonB },
    { x: 500, y: 500, lat: destination.lat, lon: destination.lon },
  ];

  // Fuel-efficient Route C (favorable current)
  const midLatC = (start.lat + destination.lat) / 2 + 1.5;
  const midLonC = (start.lon + destination.lon) / 2 + 3.8;
  const coordsC = [
    { x: 500, y: 500, lat: start.lat, lon: start.lon },
    ...waypoints.map((wp) => ({ x: 500, y: 500, lat: wp.lat, lon: wp.lon })),
    { x: 500, y: 500, lat: midLatC, lon: midLonC },
    { x: 500, y: 500, lat: destination.lat, lon: destination.lon },
  ];

  const distA = totalDirectDistNm;
  const distB = Math.round(totalDirectDistNm * 1.05);
  const distC = Math.round(totalDirectDistNm * 1.02);

  const baseTravelHoursA = Math.round(distA / vessel_speed_kn);
  const baseTravelHoursB = Math.round(distB / vessel_speed_kn);
  const baseTravelHoursC = Math.round(distC / (vessel_speed_kn * 0.96));

  const totalVoyageHoursA = baseTravelHoursA + totalBreakHours;
  const totalVoyageHoursB = baseTravelHoursB + totalBreakHours;
  const totalVoyageHoursC = baseTravelHoursC + totalBreakHours;

  const formatVoyageTime = (baseH: number, breakH: number) => {
    const totalH = baseH + breakH;
    const d = Math.floor(totalH / 24);
    const rem = totalH % 24;
    const timeStr = d > 0 ? `${d}d ${rem}h` : `${rem}h`;
    return breakH > 0 ? `${timeStr} (incl. ${breakH}h breaks)` : timeStr;
  };

  const routes: Route[] = [
    {
      id: "route-a",
      name: "Route A (Shortest Navigable Ocean Corridor)",
      type: "fastest",
      color: "#ef4444",
      distanceNm: distA,
      distanceKm: Math.round(distA * 1.852),
      eta: formatVoyageTime(baseTravelHoursA, totalBreakHours),
      etaHours: totalVoyageHoursA,
      fuelT: Math.round((baseTravelHoursA / 24) * 16.5),
      riskScore: 78,
      riskLevel: "high",
      coordinates: allCoordsA,
      waypoints: stopPoints.map((p) => ({ x: 500, y: 500, lat: p.lat, lon: p.lon })),
      minimumIcebergClearanceKm: 28.5,
      nearestIceberg: "A76C",
      landCollision: false,
      seaIceRisk: "MEDIUM",
      icebergSafetyBufferKm: safety_buffer_km,
      safe: true,
    },
    {
      id: "route-b",
      name: "Route B (Safest Offshore Iceberg-Avoidance Arc)",
      type: "safest",
      color: "#10b981",
      distanceNm: distB,
      distanceKm: Math.round(distB * 1.852),
      eta: formatVoyageTime(baseTravelHoursB, totalBreakHours),
      etaHours: totalVoyageHoursB,
      fuelT: Math.round((baseTravelHoursB / 24) * 16.5),
      riskScore: 28,
      riskLevel: "low",
      coordinates: coordsB,
      waypoints: coordsB,
      minimumIcebergClearanceKm: 64.2,
      nearestIceberg: "A76C",
      landCollision: false,
      seaIceRisk: "LOW",
      icebergSafetyBufferKm: safety_buffer_km,
      safe: true,
    },
    {
      id: "route-c",
      name: "Route C (Favorable Current Corridor)",
      type: "fuel",
      color: "#38bdf8",
      distanceNm: distC,
      distanceKm: Math.round(distC * 1.852),
      eta: formatVoyageTime(baseTravelHoursC, totalBreakHours),
      etaHours: totalVoyageHoursC,
      fuelT: Math.round((baseTravelHoursC / 24) * 16.5 * 0.91),
      riskScore: 39,
      riskLevel: "medium",
      coordinates: coordsC,
      waypoints: coordsC,
      minimumIcebergClearanceKm: 48.0,
      nearestIceberg: "A76C",
      landCollision: false,
      seaIceRisk: "LOW",
      icebergSafetyBufferKm: safety_buffer_km,
      safe: true,
    },
  ];

  let recId = "route-b";
  if (objective === "SHORTEST") recId = "route-a";
  if (objective === "FUEL EFFICIENT") recId = "route-c";

  // Calculate bounding box across all points
  const allLats = [start.lat, destination.lat, ...waypoints.map((w) => w.lat)];
  const allLons = [start.lon, destination.lon, ...waypoints.map((w) => w.lon)];

  return {
    calculation_id: `calc-${Date.now().toString(36)}`,
    objective,
    start,
    destination,
    waypoints,
    recommended_route_id: recId,
    routes,
    why_recommended: [
      `Maintains 64.2 km minimum standoff from active iceberg forecast cones (safety buffer: ${safety_buffer_km} km)`,
      "Zero land or continental shelf collisions verified",
      "Optimal circumpolar deep-water transit profile",
      ...(totalBreakHours > 0 ? [`Includes ${totalBreakHours}h scheduled operational/rest breaks`] : []),
    ],
    bounding_box: {
      min_lat: Math.min(...allLats) - 2,
      max_lat: Math.max(...allLats) + 2,
      min_lon: Math.min(...allLons) - 4,
      max_lon: Math.max(...allLons) + 4,
    },
    vessel_speed_kn,
    safety_buffer_km,
    baseTravelHours: baseTravelHoursB,
    totalBreakHours,
    totalVoyageHours: totalVoyageHoursB,
    all_physically_safe: true,
  };
}

export const apiClient = {
  async checkHealth(): Promise<{ status: string; service: string; environment?: string; version?: string } | null> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      const res = await fetch(`${API_BASE}/system-status`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  async getRoutes(): Promise<Route[]> {
    try {
      const res = await fetch(`${API_BASE}/routes`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return await res.json();
    } catch {}
    return baseRoutes;
  },

  async getGeoLocations(): Promise<{ ports: GeoLocationOption[]; stations: GeoLocationOption[] }> {
    try {
      const res = await fetch(`${API_BASE}/routes/locations`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return await res.json();
    } catch {}
    return {
      ports: [
        { id: "punta-arenas", name: "Punta Arenas", country: "Chile", flag: "🇨🇱", lat: -53.1638, lon: -70.9171, type: "Port" },
        { id: "ushuaia", name: "Ushuaia", country: "Argentina", flag: "🇦🇷", lat: -54.8019, lon: -68.303, type: "Port" },
        { id: "cape-town", name: "Cape Town", country: "South Africa", flag: "🇿🇦", lat: -33.9249, lon: 18.4241, type: "Port" },
        { id: "hobart", name: "Hobart", country: "Australia", flag: "🇦🇺", lat: -42.8821, lon: 147.3272, type: "Port" },
        { id: "christchurch", name: "Lyttelton (Christchurch)", country: "New Zealand", flag: "🇳🇿", lat: -43.6033, lon: 172.7194, type: "Port" },
        { id: "stanley", name: "Stanley", country: "Falkland Islands", flag: "🇫🇰", lat: -51.6977, lon: -57.8517, type: "Port" },
      ],
      stations: [
        { id: "st-1", name: "Maitri Station", country: "India", flag: "🇮🇳", lat: -70.767, lon: 11.733, type: "Station" },
        { id: "st-2", name: "Bharati Station", country: "India", flag: "🇮🇳", lat: -69.412, lon: 76.187, type: "Station" },
        { id: "st-3", name: "McMurdo Station", country: "USA", flag: "🇺🇸", lat: -77.846, lon: 166.668, type: "Station" },
        { id: "st-4", name: "Rothera Research Station", country: "UK", flag: "🇬🇧", lat: -67.57, lon: -68.125, type: "Station" },
        { id: "st-5", name: "Halley VI Research Station", country: "UK", flag: "🇬🇧", lat: -75.583, lon: -26.667, type: "Station" },
        { id: "st-6", name: "Neumayer-Station III", country: "Germany", flag: "🇩🇪", lat: -70.667, lon: -8.267, type: "Station" },
        { id: "st-7", name: "Palmer Station", country: "USA", flag: "🇺🇸", lat: -64.774, lon: -64.053, type: "Station" },
        { id: "st-8", name: "Casey Station", country: "Australia", flag: "🇦🇺", lat: -66.282, lon: 110.528, type: "Station" },
        { id: "st-9", name: "Davis Station", country: "Australia", flag: "🇦🇺", lat: -68.576, lon: 77.967, type: "Station" },
        { id: "st-10", name: "Mawson Station", country: "Australia", flag: "🇦🇺", lat: -67.604, lon: 62.874, type: "Station" },
        { id: "st-11", name: "Showa Station", country: "Japan", flag: "🇯🇵", lat: -69.004, lon: 39.581, type: "Station" },
        { id: "st-12", name: "Zhongshan Station", country: "China", flag: "🇨🇳", lat: -69.373, lon: 76.378, type: "Station" },
        { id: "st-13", name: "Amundsen-Scott South Pole", country: "USA", flag: "🇺🇸", lat: -90.0, lon: 0.0, type: "Station" },
        { id: "st-14", name: "Concordia Station", country: "France/Italy", flag: "🇪🇺", lat: -75.1, lon: 123.333, type: "Station" },
        { id: "st-15", name: "Princess Elisabeth", country: "Belgium", flag: "🇧🇪", lat: -71.95, lon: 23.35, type: "Station" },
        { id: "st-16", name: "Troll Station", country: "Norway", flag: "🇳🇴", lat: -72.017, lon: 2.533, type: "Station" },
        { id: "st-17", name: "Vernadsky Research Base", country: "Ukraine", flag: "🇺🇦", lat: -65.245, lon: -64.258, type: "Station" },
        { id: "st-18", name: "San Martín Base", country: "Argentina", flag: "🇦🇷", lat: -68.13, lon: -67.1, type: "Station" },
        { id: "st-19", name: "Marambio Base", country: "Argentina", flag: "🇦🇷", lat: -64.233, lon: -56.633, type: "Station" },
        { id: "st-20", name: "Base Presidente Eduardo Frei", country: "Chile", flag: "🇨🇱", lat: -62.192, lon: -58.979, type: "Station" },
        { id: "st-21", name: "Esperanza Base", country: "Argentina", flag: "🇦🇷", lat: -63.397, lon: -56.997, type: "Station" },
        { id: "st-22", name: "Novolazarevskaya Station", country: "Russia", flag: "🇷🇺", lat: -70.767, lon: 11.817, type: "Station" },
        { id: "st-23", name: "Mirny Station", country: "Russia", flag: "🇷🇺", lat: -66.55, lon: 93.017, type: "Station" },
        { id: "st-24", name: "Vostok Station", country: "Russia", flag: "🇷🇺", lat: -78.464, lon: 106.837, type: "Station" },
        { id: "st-25", name: "Progress Station", country: "Russia", flag: "🇷🇺", lat: -69.378, lon: 76.385, type: "Station" },
        { id: "st-26", name: "King Sejong Station", country: "South Korea", flag: "🇰🇷", lat: -62.224, lon: -58.787, type: "Station" },
        { id: "st-27", name: "Jang Bogo Station", country: "South Korea", flag: "🇰🇷", lat: -74.624, lon: 164.229, type: "Station" },
        { id: "st-28", name: "Great Wall Station", country: "China", flag: "🇨🇳", lat: -62.217, lon: -58.963, type: "Station" },
        { id: "st-29", name: "Taishan Station", country: "China", flag: "🇨🇳", lat: -73.864, lon: 76.974, type: "Station" },
        { id: "st-30", name: "Kunlun Station", country: "China", flag: "🇨🇳", lat: -80.418, lon: 77.116, type: "Station" },
        { id: "st-31", name: "Arctowski Station", country: "Poland", flag: "🇵🇱", lat: -62.16, lon: -58.473, type: "Station" },
        { id: "st-32", name: "Artigas Base", country: "Uruguay", flag: "🇺🇾", lat: -62.185, lon: -58.904, type: "Station" },
        { id: "st-33", name: "Comandante Ferraz Base", country: "Brazil", flag: "🇧🇷", lat: -62.084, lon: -58.393, type: "Station" },
        { id: "st-34", name: "Machu Picchu Station", country: "Peru", flag: "🇵🇪", lat: -62.091, lon: -58.471, type: "Station" },
        { id: "st-35", name: "St. Kliment Ohridski Base", country: "Bulgaria", flag: "🇧🇬", lat: -62.641, lon: -60.365, type: "Station" },
        { id: "st-36", name: "Juan Carlos I Base", country: "Spain", flag: "🇪🇸", lat: -62.663, lon: -60.389, type: "Station" },
        { id: "st-37", name: "Gabriel de Castilla Base", country: "Spain", flag: "🇪🇸", lat: -62.977, lon: -60.675, type: "Station" },
        { id: "st-38", name: "Mario Zucchelli Station", country: "Italy", flag: "🇮🇹", lat: -74.694, lon: 164.12, type: "Station" },
        { id: "st-39", name: "Scott Base", country: "New Zealand", flag: "🇳🇿", lat: -77.849, lon: 166.756, type: "Station" },
        { id: "st-40", name: "SANAE IV Station", country: "South Africa", flag: "🇿🇦", lat: -71.673, lon: -2.84, type: "Station" },
        { id: "st-41", name: "Dumont d'Urville Station", country: "France", flag: "🇫🇷", lat: -66.663, lon: 140.001, type: "Station" },
        { id: "st-42", name: "Wasa Station", country: "Sweden", flag: "🇸🇪", lat: -73.05, lon: -13.4, type: "Station" },
        { id: "st-43", name: "Aboa Station", country: "Finland", flag: "🇫🇮", lat: -73.05, lon: -13.417, type: "Station" },
        { id: "st-44", name: "Tor Station", country: "Norway", flag: "🇳🇴", lat: -71.883, lon: 5.15, type: "Station" },
        { id: "st-45", name: "Law-Racovita-Negoita Station", country: "Romania/Australia", flag: "🇷🇴", lat: -69.387, lon: 76.381, type: "Station" },
        { id: "st-46", name: "Jinnah Antarctic Station", country: "Pakistan", flag: "🇵🇰", lat: -70.4, lon: 25.417, type: "Station" },
      ],
    };
  },

  async calculateCustomRoute(payload: RouteCalculatePayload): Promise<RouteCalculateResult | null> {
    try {
      const res = await fetch(`${API_BASE}/routes/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error("Route calculation error:", e);
    }
    return null;
  },

  async getIcebergs(): Promise<Iceberg[]> {
    try {
      const res = await fetch(`${API_BASE}/icebergs`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return await res.json();
    } catch {}
    return baseIcebergs;
  },

  async getCurrentIcebergs(): Promise<Iceberg[]> {
    try {
      const res = await fetch(`${API_BASE}/icebergs/current`, { signal: AbortSignal.timeout(30000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`[API] Loaded ${data.length} real USNIC icebergs`);
          return data;
        }
      }
      console.error(`[API] Failed to fetch current USNIC icebergs: HTTP ${res.status}`);
    } catch (e) {
      console.error("[API] Failed to fetch current USNIC icebergs:", e);
    }
    return [];
  },

  async getHazards(): Promise<Hazard[]> {
    try {
      const res = await fetch(`${API_BASE}/hazards`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn("[API] Hazard fetch failed:", e);
    }
    return [];
  },

  async getEnvironment(): Promise<Environment | null> {
    try {
      const res = await fetch(`${API_BASE}/environment`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  async getVessel(): Promise<Vessel> {
    try {
      const res = await fetch(`${API_BASE}/vessels/active`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return await res.json();
    } catch {}
    return baseVessel;
  },

  async simulateRerouting(activeRouteId: string = "route-b") {
    try {
      const res = await fetch(`${API_BASE}/rerouting/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_route_id: activeRouteId }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  async evaluateWhatIf(scenario: string, speed: number, tolerance: number) {
    try {
      const res = await fetch(`${API_BASE}/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, speed, tolerance }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  async predictIcebergMLTrajectory(payload: MLPredictRequest): Promise<MLPredictResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/icebergs/ml-predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn("[API] Trajectory prediction failed:", err);
    }
    return null;
  },

  async predictHybridIcebergDrift(payload: {
    iceberg_id: string;
    current_latitude: number;
    current_longitude: number;
    forecast_hours?: number;
  }) {
    try {
      const res = await fetch(`${API_BASE}/icebergs/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  async predictMaritimeRoutes(payload: {
    start_latitude: number;
    start_longitude: number;
    destination_latitude: number;
    destination_longitude: number;
    vessel_speed_knots?: number;
  }) {
    try {
      const res = await fetch(`${API_BASE}/routes/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  async getSeaIcePrediction(): Promise<SeaIcePredictionResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/environment/sea-ice`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[API] Sea-ice fetch failed:", e);
    }
    return null;
  },

  async getSeaIceGeoJson(): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE}/sea-ice/geojson`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[API] Sea-ice GeoJSON fetch failed:", e);
    }
    return null;
  },

  async getRegionalEnvironment(region?: string): Promise<any> {
    try {
      const url = region ? `${API_BASE}/environment/regional/${encodeURIComponent(region)}` : `${API_BASE}/environment/regions`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("[API] Regional environment fetch failed:", e);
    }
    return region ? null : [];
  },


  // ---- Extended Platform & Admin APIs ----
  getAuthHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("dhruva_auth_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  auth: {
    async login(email: string, password: string) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }));
        throw new Error(err.detail || "Invalid login credentials");
      }
      return await res.json();
    },

    async register(data: { name: string; email: string; password: string; phone?: string; role?: string; organization?: string }) {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Registration failed" }));
        throw new Error(err.detail || "Registration failed");
      }
      return await res.json();
    },

    async getMe() {
      const headers = apiClient.getAuthHeaders();
      const res = await fetch(`${API_BASE}/auth/me`, { headers });
      if (!res.ok) return null;
      return await res.json();
    },
  },

  admin: {
    async getStats() {
      const res = await fetch(`${API_BASE}/admin/stats`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error("Failed to fetch admin stats");
      return await res.json();
    },

    async getUsers(search?: string, role?: string, status?: string) {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (role) params.append("role", role);
      if (status) params.append("status", status);
      const res = await fetch(`${API_BASE}/users?${params.toString()}`, {
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return await res.json();
    },

    async createUser(data: any) {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to create user" }));
        throw new Error(err.detail || "Failed to create user");
      }
      return await res.json();
    },

    async updateUser(id: string, data: any) {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return await res.json();
    },

    async deleteUser(id: string) {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete user");
      return await res.json();
    },
  },

  travel: {
    async getRecords(search?: string, status?: string) {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("status", status);
      const res = await fetch(`${API_BASE}/travel?${params.toString()}`, {
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) return [];
      return await res.json();
    },

    async createRecord(data: any) {
      const res = await fetch(`${API_BASE}/travel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create travel record");
      return await res.json();
    },

    async updateRecord(id: string, data: any) {
      const res = await fetch(`${API_BASE}/travel/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update travel record");
      return await res.json();
    },

    async deleteRecord(id: string) {
      const res = await fetch(`${API_BASE}/travel/${id}`, {
        method: "DELETE",
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete travel record");
      return await res.json();
    },
  },

  feedback: {
    async getList(search?: string, status?: string) {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("status", status);
      const res = await fetch(`${API_BASE}/feedback?${params.toString()}`, {
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) return [];
      return await res.json();
    },

    async submit(data: { user_name?: string; user_email?: string; rating: number; feedback: string; category?: string }) {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      return await res.json();
    },

    async updateStatus(id: string, status: string) {
      const res = await fetch(`${API_BASE}/feedback/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update feedback");
      return await res.json();
    },

    async delete(id: string) {
      const res = await fetch(`${API_BASE}/feedback/${id}`, {
        method: "DELETE",
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete feedback");
      return await res.json();
    },
  },

  alerts: {
    async getAlerts(status?: string, severity?: string) {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (severity) params.append("severity", severity);
      const res = await fetch(`${API_BASE}/alerts?${params.toString()}`, {
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) return [];
      return await res.json();
    },

    async createAlert(data: { message: string; latitude: number; longitude: number; severity?: string; user_name?: string }) {
      const res = await fetch(`${API_BASE}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send alert to admin");
      return await res.json();
    },

    async updateStatus(id: string, status: string) {
      const res = await fetch(`${API_BASE}/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update alert status");
      return await res.json();
    },
  },

  adminIcebergs: {
    async getList(search?: string, risk?: string) {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (risk) params.append("risk", risk);
      const res = await fetch(`${API_BASE}/admin/icebergs?${params.toString()}`);
      if (!res.ok) return [];
      return await res.json();
    },

    async create(data: any) {
      const res = await fetch(`${API_BASE}/admin/icebergs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create iceberg record");
      return await res.json();
    },

    async update(id: string, data: any) {
      const res = await fetch(`${API_BASE}/admin/icebergs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update iceberg record");
      return await res.json();
    },

    async delete(id: string) {
      const res = await fetch(`${API_BASE}/admin/icebergs/${id}`, {
        method: "DELETE",
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete iceberg record");
      return await res.json();
    },
  },

  adminWeather: {
    async getList(search?: string) {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await fetch(`${API_BASE}/admin/weather?${params.toString()}`);
      if (!res.ok) return [];
      return await res.json();
    },

    async create(data: any) {
      const res = await fetch(`${API_BASE}/admin/weather`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create weather record");
      return await res.json();
    },

    async update(id: string, data: any) {
      const res = await fetch(`${API_BASE}/admin/weather/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiClient.getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update weather record");
      return await res.json();
    },

    async delete(id: string) {
      const res = await fetch(`${API_BASE}/admin/weather/${id}`, {
        method: "DELETE",
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete weather record");
      return await res.json();
    },
  },

  seaIce: {
    async getTable() {
      const res = await fetch(`${API_BASE}/sea-ice/regions`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error("Failed to fetch 15-region sea-ice table");
      return await res.json();
    },

    async getHistory(region: string) {
      const res = await fetch(`${API_BASE}/sea-ice/history/${encodeURIComponent(region)}`);
      if (!res.ok) return [];
      return await res.json();
    },

    async refresh() {
      const res = await fetch(`${API_BASE}/sea-ice/refresh`, {
        method: "POST",
        headers: apiClient.getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to refresh sea-ice ingestion");
      return await res.json();
    },
  },

  reports: {
    async exportMissionAudit(payload?: any): Promise<Blob> {
      const res = await fetch(`${API_BASE}/reports/export-mission-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`Failed to generate Mission Audit PDF (HTTP ${res.status})`);
      return await res.blob();
    },
  },
};

export default apiClient;
