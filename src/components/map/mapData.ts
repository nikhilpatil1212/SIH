// Builders that turn the domain mock data (see src/data) into GeoJSON for
// MapLibre. Everything is keyed on real lon/lat so the basemap and tiles can be
// swapped for a dedicated polar basemap without touching these shapes.

export interface GeoJsonGeometry {
  type: string;
  coordinates: any;
}

export interface Feature<G extends GeoJsonGeometry = GeoJsonGeometry, P = Record<string, any>> {
  type: "Feature";
  geometry: G;
  properties: P;
}

export interface FeatureCollection<G extends GeoJsonGeometry = GeoJsonGeometry, P = Record<string, any>> {
  type: "FeatureCollection";
  features: Feature<G, P>[];
}

export interface Point extends GeoJsonGeometry {
  type: "Point";
  coordinates: [number, number];
}

export interface LineString extends GeoJsonGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface Polygon extends GeoJsonGeometry {
  type: "Polygon";
  coordinates: [number, number][][];
}

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

// Generate N-gon polygon for a circle in degree space.
function circlePolygon(center: LL, radiusDeg: number, segments = 24): LL[] {
  const pts: LL[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    pts.push([center[0] + Math.cos(angle) * radiusDeg, center[1] + Math.sin(angle) * (radiusDeg * 0.45)]);
  }
  return pts;
}

export function routeLines(routes: Route[], selectedId: string): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: routes.map((r) => ({
      type: "Feature",
      properties: {
        id: r.id,
        name: r.name,
        color: r.color,
        selected: r.id === selectedId,
        risk: r.riskLevel,
        score: r.riskScore,
      },
      geometry: {
        type: "LineString",
        coordinates: r.coordinates.map(ll),
      },
    })),
  };
}

export function waypointPoints(routes: Route[], selectedId: string): FeatureCollection<Point> {
  const selected = routes.find((r) => r.id === selectedId) ?? routes[0];
  return {
    type: "FeatureCollection",
    features: selected.waypoints.map((w, i) => ({
      type: "Feature",
      properties: { name: `WP${i + 1}`, routeId: selected.id, color: selected.color },
      geometry: { type: "Point", coordinates: ll(w) },
    })),
  };
}

export function predictedShipLine(route: Route): FeatureCollection<LineString> {
  const coords = route.coordinates.slice(0, 3).map(ll);
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { color: "#55d6e8" },
        geometry: { type: "LineString", coordinates: coords },
      },
    ],
  };
}

export function icebergTrajectories(icebergs: Iceberg[], f: number): FeatureCollection<LineString | Polygon> {
  const features: Feature<LineString | Polygon>[] = [];
  for (const ib of icebergs) {
    const full = ib.predictedPath.map(ll);
    const sliced = slice(full, Math.max(0.0001, f));
    const widthsDeg = ib.uncertainty.slice(0, sliced.length).map((u) => u * 0.04);

    features.push({
      type: "Feature",
      properties: { id: ib.id, kind: "corridor", color: RISK_COLORS[ib.riskLevel] },
      geometry: { type: "Polygon", coordinates: [corridor(sliced, widthsDeg)] },
    });

    features.push({
      type: "Feature",
      properties: { id: ib.id, kind: "trajectory", color: RISK_COLORS[ib.riskLevel] },
      geometry: { type: "LineString", coordinates: sliced },
    });
  }
  return { type: "FeatureCollection", features };
}

/** Interpolated iceberg positions at the selected horizon (for markers). */
export function icebergPositionsAt(icebergs: Iceberg[], f: number): { ib: Iceberg; lon: number; lat: number }[] {
  return icebergs.map((ib) => {
    const c = slice(ib.predictedPath.map(ll), Math.max(0.0001, f));
    const end = c[c.length - 1]!;
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
