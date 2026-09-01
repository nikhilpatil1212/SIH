/**
 * High-Precision Antarctic & Southern Ocean Land/Ocean Mask.
 * 
 * Accurately distinguishes:
 * - Antarctic Continent & Grounded Ice Sheet (INVALID for iceberg navigation)
 * - Southern Ocean & Seasonal Floating Sea Ice (VALID for iceberg drift)
 * - Sub-Antarctic Islands (INVALID)
 * 
 * Provides trajectory validation and physical hydrodynamic coastal deflection
 * ensuring all predicted iceberg waypoints stay in valid ocean water.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

export interface GeoPointWithCoords {
  x?: number;
  y?: number;
  lat: number;
  lon: number;
}

// High-resolution Antarctic Continental Coastline Boundary (lon, northernmost continental latitude)
// Coordinates south of this boundary (i.e. lat <= coast_lat) are on continental land/grounded ice sheet.
export const ANTARCTIC_COASTLINE_TABLE: [number, number][] = [
  [-180.0, -78.0],
  [-175.0, -78.4],
  [-170.0, -78.5],
  [-165.0, -78.2],
  [-160.0, -77.8],
  [-155.0, -77.2],
  [-150.0, -76.2],
  [-145.0, -75.8],
  [-140.0, -75.2],
  [-135.0, -74.8],
  [-130.0, -74.2],
  [-125.0, -73.8],
  [-120.0, -73.5],
  [-115.0, -73.8],
  [-110.0, -74.2],
  [-105.0, -74.8],
  [-100.0, -73.2],
  [-95.0, -72.6],
  [-90.0, -72.8],
  [-85.0, -73.2],
  [-80.0, -73.5],
  [-75.0, -73.0],
  [-72.0, -71.2],
  [-70.0, -69.0],
  [-68.0, -67.2],
  [-66.0, -65.5],
  [-64.0, -64.2],
  [-63.0, -63.8],
  [-60.0, -63.3], // Prime Head / Trinity Peninsula
  [-57.0, -63.2], // Tip of Peninsula
  [-55.0, -64.2],
  [-58.0, -65.5],
  [-60.0, -68.0],
  [-61.0, -71.0],
  [-62.0, -74.0],
  [-55.0, -77.5],
  [-50.0, -78.2],
  [-45.0, -78.0],
  [-40.0, -77.5],
  [-35.0, -76.5],
  [-30.0, -75.8],
  [-25.0, -74.5],
  [-20.0, -73.2],
  [-15.0, -72.0],
  [-10.0, -70.8],
  [-5.0, -70.5],
  [0.0, -70.2],
  [5.0, -70.0],
  [10.0, -70.2],
  [15.0, -70.5],
  [20.0, -70.6],
  [25.0, -70.4],
  [30.0, -69.8],
  [35.0, -69.2],
  [40.0, -68.6],
  [45.0, -67.4],
  [50.0, -66.8], // Cape Ann / Enderby Land
  [55.0, -66.2],
  [60.0, -67.0],
  [65.0, -67.4],
  [70.0, -68.2],
  [73.0, -69.6], // Amery Ice Shelf / Prydz Bay
  [76.0, -69.2],
  [80.0, -68.0],
  [85.0, -66.4],
  [90.0, -66.2],
  [95.0, -65.8],
  [100.0, -65.4],
  [105.0, -65.8],
  [110.0, -66.3],
  [115.0, -66.2],
  [120.0, -65.6],

  [125.0, -65.8],
  [130.0, -66.0],
  [135.0, -66.2],
  [140.0, -66.4],
  [145.0, -66.8],
  [150.0, -67.8],
  [155.0, -68.6],
  [160.0, -69.8],
  [165.0, -71.2],
  [170.0, -72.4],
  [175.0, -74.8],
  [180.0, -78.0],
];

// Complex Peninsula Polygon for detailed ray casting (lat, lon)
export const ANTARCTIC_PENINSULA_POLYGON: [number, number][] = [
  [-63.2, -57.3],
  [-63.4, -56.8],
  [-64.5, -58.5],
  [-66.0, -60.5],
  [-68.5, -62.5],
  [-71.5, -64.0],
  [-73.5, -68.0],
  [-73.5, -75.0],
  [-71.5, -74.0],
  [-69.5, -71.5],
  [-67.5, -68.0],
  [-65.8, -64.8],
  [-64.5, -61.5],
  [-63.8, -58.8],
  [-63.2, -57.3],
];

// Major Sub-Antarctic Island Obstacles: [name, lat, lon, radius_km]
export const SUB_ANTARCTIC_ISLANDS: [string, number, number, number][] = [
  ["Falkland Islands", -51.75, -59.5, 75.0],
  ["South Georgia", -54.4, -36.6, 90.0],
  ["South Sandwich Islands", -58.5, -26.3, 60.0],
  ["South Orkney Islands", -60.6, -45.5, 50.0],
  ["South Shetland Islands", -62.5, -59.5, 50.0],
  ["Bouvet Island", -54.42, 3.35, 25.0],
  ["Prince Edward Islands", -46.88, 37.85, 35.0],
  ["Crozet Islands", -46.42, 51.85, 45.0],
  ["Kerguelen Islands", -49.35, 69.35, 80.0],
  ["Heard Island", -53.1, 73.5, 40.0],
  ["Macquarie Island", -54.6, 158.85, 30.0],
  ["Campbell Island", -52.55, 169.15, 25.0],
  ["Auckland Islands", -50.7, 166.1, 35.0],
  ["Peter I Island", -68.85, -90.6, 25.0],
];

export function wrapLon(lon: number): number {
  return (((lon + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) * Math.sin(dphi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) * Math.sin(dlambda / 2);
  return 2 * R * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

export function initialBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dlambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dlambda);
  return (((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

export function destinationPoint(lat: number, lon: number, bearingDeg: number, distanceKm: number): [number, number] {
  const R = 6371.0;
  const delta = distanceKm / R;
  const theta = (bearingDeg * Math.PI) / 180;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lon * Math.PI) / 180;

  const sinPhi2 = Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));
  const y = Math.sin(theta) * Math.sin(delta) * Math.cos(phi1);
  const x = Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2);
  const lambda2 = lambda1 + Math.atan2(y, x);

  const lat2 = (phi2 * 180) / Math.PI;
  const lon2 = wrapLon((lambda2 * 180) / Math.PI);
  return [lat2, lon2];
}

export function getAntarcticCoastlineLat(lon: number): number {
  const wlon = wrapLon(lon);
  for (let i = 0; i < ANTARCTIC_COASTLINE_TABLE.length - 1; i++) {
    const [l1, lat1] = ANTARCTIC_COASTLINE_TABLE[i];
    const [l2, lat2] = ANTARCTIC_COASTLINE_TABLE[i + 1];
    if (l1 <= wlon && wlon <= l2) {
      const frac = l2 !== l1 ? (wlon - l1) / (l2 - l1) : 0;
      return lat1 + frac * (lat2 - lat1);
    }
  }
  return -70.0;
}

export function pointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  const n = polygon.length;
  let inside = false;
  let [p1Lat, p1Lon] = polygon[0];
  for (let i = 1; i <= n; i++) {
    const [p2Lat, p2Lon] = polygon[i % n];
    if (Math.min(p1Lon, p2Lon) < lon && lon <= Math.max(p1Lon, p2Lon)) {
      if (lat <= Math.max(p1Lat, p2Lat)) {
        let latInters = p1Lat;
        if (p1Lon !== p2Lon) {
          latInters = ((lon - p1Lon) * (p2Lat - p1Lat)) / (p2Lon - p1Lon) + p1Lat;
        }
        if (p1Lat === p2Lat || lat <= latInters) {
          inside = !inside;
        }
      }
    }
    p1Lat = p2Lat;
    p1Lon = p2Lon;
  }
  return inside;
}

/**
 * Determine if a geographic coordinate (lat, lon) is in valid ocean water.
 * Returns true for ocean & seasonal floating sea ice; returns false for Antarctic continent/land.
 */
export function isOceanCoordinate(lat: number, lon: number): boolean {
  if (lat > -40.0) return true;
  if (lat <= -82.0) return false;

  // 1. Check Sub-Antarctic Islands
  for (const [, islLat, islLon, radKm] of SUB_ANTARCTIC_ISLANDS) {
    const d = haversineKm(lat, lon, islLat, islLon);
    if (d <= radKm) return false;
  }

  // 2. Check Antarctic Peninsula high-resolution polygon
  if (lon >= -75.0 && lon <= -55.0 && lat <= -63.0) {
    if (pointInPolygon(lat, lon, ANTARCTIC_PENINSULA_POLYGON)) {
      return false;
    }
  }

  // 3. Check Northernmost Continental Coastline
  const coastLat = getAntarcticCoastlineLat(lon);
  if (lat <= coastLat - 0.02) {
    return false;
  }

  return true;
}

export function isPointOnLand(lat: number, lon: number): boolean {
  return !isOceanCoordinate(lat, lon);
}

/**
 * Verify whether a straight line segment between two points intersects land.
 */
export function doesSegmentCrossLand(lat1: number, lon1: number, lat2: number, lon2: number, steps: number = 8): boolean {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const latT = lat1 + t * (lat2 - lat1);
    const lonT = wrapLon(lon1 + t * (lon2 - lon1));
    if (!isOceanCoordinate(latT, lonT)) {
      return true;
    }
  }
  return false;
}

/**
 * Constrain a single trajectory forward step to valid ocean water.
 * If the raw target intersects land, applies coastal tangential hydrodynamic deflection.
 */
export function constrainTrajectoryStep(
  prevLat: number,
  prevLon: number,
  rawTargetLat: number,
  rawTargetLon: number
): { lat: number; lon: number; constrained: boolean } {
  // If already ocean-valid and segment is unobstructed, return raw target
  if (isOceanCoordinate(rawTargetLat, rawTargetLon) && !doesSegmentCrossLand(prevLat, prevLon, rawTargetLat, rawTargetLon, 8)) {
    return { lat: rawTargetLat, lon: rawTargetLon, constrained: false };
  }

  const distKm = Math.max(1.0, haversineKm(prevLat, prevLon, rawTargetLat, rawTargetLon));
  const rawBearing = initialBearingDeg(prevLat, prevLon, rawTargetLat, rawTargetLon);

  // Search angular deflections (prioritizing open-ocean / westward coastal flow)
  for (let angleOffset = 15; angleOffset <= 165; angleOffset += 15) {
    for (const sign of [-1, 1]) {
      const testBearing = (rawBearing + sign * angleOffset + 360) % 360;
      const [testLat, testLon] = destinationPoint(prevLat, prevLon, testBearing, distKm);

      if (isOceanCoordinate(testLat, testLon) && !doesSegmentCrossLand(prevLat, prevLon, testLat, testLon, 6)) {
        return {
          lat: +testLat.toFixed(5),
          lon: +testLon.toFixed(5),
          constrained: true,
        };
      }
    }
  }

  // Fallback: project seaward/northward off the local coastline with 15km clearance
  const coastLat = getAntarcticCoastlineLat(prevLon);
  const safeLat = Math.max(prevLat + 0.05, coastLat + 0.15);
  return {
    lat: +safeLat.toFixed(5),
    lon: +prevLon.toFixed(5),
    constrained: true,
  };
}

/**
 * Constrain an entire multi-point iceberg trajectory (NOW, +6H, +12H, +24H, +48H, +72H).
 * Returns the sanitized ocean-valid trajectory along with constraint diagnostic metadata.
 */
export function constrainTrajectoryToOcean<T extends GeoPointWithCoords>(
  rawPoints: T[]
): { path: T[]; constrained: boolean; reason?: string } {
  if (!rawPoints || rawPoints.length === 0) {
    return { path: [], constrained: false };
  }

  let wasConstrained = false;
  const resultPath: T[] = [];

  // Step 0: Ensure starting origin point is in ocean
  let currentLat = rawPoints[0].lat;
  let currentLon = rawPoints[0].lon;
  if (!isOceanCoordinate(currentLat, currentLon)) {
    const coastLat = getAntarcticCoastlineLat(currentLon);
    currentLat = coastLat + 0.08; // 8km offshore
    wasConstrained = true;
  }

  resultPath.push({
    ...rawPoints[0],
    lat: +currentLat.toFixed(5),
    lon: +currentLon.toFixed(5),
  });

  // Step 1..N: Incrementally validate and constrain each horizon
  for (let i = 1; i < rawPoints.length; i++) {
    const rawTarget = rawPoints[i];
    const prevPt = resultPath[i - 1];

    const stepResult = constrainTrajectoryStep(prevPt.lat, prevPt.lon, rawTarget.lat, rawTarget.lon);
    if (stepResult.constrained) {
      wasConstrained = true;
    }

    resultPath.push({
      ...rawTarget,
      lat: stepResult.lat,
      lon: stepResult.lon,
    });
  }

  return {
    path: resultPath,
    constrained: wasConstrained,
    reason: wasConstrained ? "LAND_INTERSECTION" : undefined,
  };
}
