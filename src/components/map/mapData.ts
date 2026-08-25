// Builders that turn the domain mock data (see src/data) into GeoJSON for
// MapLibre. Everything is keyed on real lon/lat so the basemap and tiles can be
// swapped for a dedicated polar basemap without touching these shapes.

import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { GeoPoint, Iceberg, Route } from "../../data/types";
import { icebergPredictedPositions } from "../../data/phase2";
import { RISK_COLORS } from "../ui/primitives";

export type Horizon = "0h" | "6h" | "12h" | "24h" | "48h" | "72h";

export const HORIZON_FRACTION: Record<Horizon, number> = {
  "0h": 0,
  "6h": 0.12,
  "12h": 0.25,
  "24h": 0.45,
  "48h": 0.75,
  "72h": 1,
};

type LL = [number, number]; // [lon, lat]

const ll = (p: GeoPoint): LL => [p.lon, p.lat];

// Sub-polyline covering fraction f of the total length, interpolating the end.
function slice(coords: LL[], f: number): LL[] {
  if (coords.length < 2 || f >= 1) return coords;
  if (f <= 0) return [coords[0]];
  const segs = coords.slice(1).map((c, i) => Math.hypot(c[0] - coords[i][0], c[1] - coords[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let target = total * f;
  const out: LL[] = [coords[0]];
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const t = segs[i] === 0 ? 0 : target / segs[i];
      out.push([coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t]);
      break;
    }
    target -= segs[i];
    out.push(coords[i + 1]);
  }
  return out;
}

// Uncertainty corridor polygon around a path, widths in degrees per point.
function corridor(coords: LL[], widths: number[]): LL[] {
  const left: LL[] = [];
  const right: LL[] = [];
  for (let i = 0; i < coords.length; i++) {
    const prev = coords[Math.max(0, i - 1)];
    const next = coords[Math.min(coords.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = widths[i] ?? 0;
    left.push([coords[i][0] + nx * w, coords[i][1] + ny * w]);
    right.push([coords[i][0] - nx * w, coords[i][1] - ny * w]);
  }
  return [...left, ...right.reverse(), left[0]];
}

export function circlePolygon(center: LL, radiusDeg: number, steps = 48): LL[] {
  const ring: LL[] = [];
  // Correct longitude radius for latitude compression.
  const latAdj = Math.max(0.2, Math.cos((center[1] * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring.push([center[0] + (Math.cos(a) * radiusDeg) / latAdj, center[1] + Math.sin(a) * radiusDeg]);
  }
  return ring;
}

// ---- Feature collections ----

export function routeLines(routes: Route[], selectedId: string): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: routes.map((r) => ({
      type: "Feature",
      properties: { id: r.id, name: r.name, type: r.type, color: r.color, selected: r.id === selectedId },
      geometry: { type: "LineString", coordinates: r.coordinates.map(ll) },
    })),
  };
}

export function predictedShipLine(route: Route): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: route.coordinates.slice(0, 3).map(ll) },
      },
    ],
  };
}

export function waypointPoints(route: Route): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: route.coordinates.map((c, i) => ({
      type: "Feature",
      properties: {
        index: i,
        name: i === 0 ? "Origin" : i === route.coordinates.length - 1 ? "Destination" : `Waypoint ${i}`,
        lat: c.lat,
        lon: c.lon,
        eta: i === 0 ? "Departure" : `+${i * 18}h`,
        legNm: i === 0 ? 0 : Math.round(route.distanceNm / (route.coordinates.length - 1)),
        risk: route.riskLevel,
      },
      geometry: { type: "Point", coordinates: ll(c) },
    })),
  };
}

// Iceberg current position (marker source handled separately) — trajectory +
// corridor grown to the selected horizon fraction.
export function icebergTrajectories(icebergs: Iceberg[], f: number): FeatureCollection {
  const features: Feature[] = [];
  for (const ib of icebergs) {
    const coords = ib.predictedPath.map(ll);
    const path = f <= 0 ? [coords[0], coords[0]] : slice(coords, f);
    // widths: canvas units -> degrees (~ /12), scaled by how far along we are.
    const widths = ib.uncertainty.slice(0, path.length).map((u) => (u / 12) * (0.35 + f * 0.65));
    const color = RISK_COLORS[ib.riskLevel];
    features.push({
      type: "Feature",
      properties: { kind: "corridor", color },
      geometry: { type: "Polygon", coordinates: [corridor(path, widths)] } as Polygon,
    });
    features.push({
      type: "Feature",
      properties: { kind: "path", color },
      geometry: { type: "LineString", coordinates: path } as LineString,
    });
  }
  return { type: "FeatureCollection", features };
}

/** Interpolated iceberg positions at the selected horizon (for markers). */
export function icebergPositionsAt(icebergs: Iceberg[], f: number): { ib: Iceberg; lon: number; lat: number }[] {
  return icebergs.map((ib) => {
    const c = slice(ib.predictedPath.map(ll), Math.max(0.0001, f));
    const end = c.at(-1)!;
    return { ib, lon: end[0], lat: end[1] };
  });
}

export function seaIceFills(
  regions: { region?: string; id?: string; polygon: GeoPoint[]; concentration: number }[],
): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: regions.map((r) => ({
      type: "Feature",
      properties: { concentration: r.concentration, color: seaIceColor(r.concentration), name: r.region ?? r.id },
      geometry: { type: "Polygon", coordinates: [[...r.polygon.map(ll), ll(r.polygon[0])]] },
    })),
  };
}

export function seaIceColor(c: number): string {
  if (c < 10) return "#a9dfe9";
  if (c < 30) return "#8ccfe0";
  if (c < 50) return "#55d6e8";
  if (c < 70) return "#3b82f6";
  return "#2563eb";
}

// Localized hazard zones from higher-risk icebergs.
export function hazardZones(icebergs: Iceberg[], f: number): FeatureCollection<Polygon> {
  const positions = icebergPositionsAt(icebergs, f).filter((p) => p.ib.riskLevel !== "low");
  return {
    type: "FeatureCollection",
    features: positions.map((p) => ({
      type: "Feature",
      properties: { color: RISK_COLORS[p.ib.riskLevel], risk: p.ib.riskLevel },
      geometry: { type: "Polygon", coordinates: [circlePolygon([p.lon, p.lat], p.ib.riskLevel === "high" ? 1.6 : 1.1)] },
    })),
  };
}

export { icebergPredictedPositions };
