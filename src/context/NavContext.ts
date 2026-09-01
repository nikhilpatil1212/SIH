import { createContext, useContext } from "react";
import type { LayerState } from "../components/map/MapView";
import type { AlertItem, Hazard, Iceberg, Route, SeaIcePredictionResponse } from "../data/types";
import type { RouteCalculatePayload } from "../api/client";

export interface BoundingBox {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

export interface NamedPoint {
  lat: number;
  lon: number;
  name?: string;
}

export interface OperationalWaypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  breakDurationHours: number;
}

export interface NavState {
  routes: Route[];
  icebergs: Iceberg[];
  usnicIcebergs: Iceberg[];
  hazards: Hazard[];
  alerts: AlertItem[];
  selectedRouteId: string;
  recommendedRouteId: string;
  selectedIcebergId: string | null;
  selectedUsnicIcebergId: string | null;

  layers: LayerState;
  rerouted: boolean;
  hasActiveRoute: boolean;
  distanceUnit: "NM" | "KM";
  activeBoundingBox: BoundingBox | null;
  activeStartPoint: NamedPoint | null;
  activeDestinationPoint: NamedPoint | null;
  waypoints: OperationalWaypoint[];
  whyRecommended: string[];
  isCalculating: boolean;
  baseTravelHours: number;
  totalBreakHours: number;
  totalVoyageHours: number;
  predictionLoading: boolean;
  predictionError: string | null;
  predictionsCache: Record<string, { lat: number; lon: number; displacement_km: number }>;
  seaIcePrediction: SeaIcePredictionResponse | null;
  seaIceGeoJson: any;
  regionalEnvironment: any[];
  setSelectedRoute: (id: string) => void;
  setSelectedIceberg: (id: string) => void;
  setSelectedUsnicIcebergId: (id: string | null) => void;
  toggleLayer: (k: keyof LayerState) => void;
  toggleDistanceUnit: () => void;
  setDistanceUnit: (unit: "NM" | "KM") => void;
  formatDistance: (distNm?: number | null) => string;
  addWaypoint: (wp: Omit<OperationalWaypoint, "id">) => void;
  removeWaypoint: (id: string) => void;
  updateWaypoint: (id: string, updates: Partial<OperationalWaypoint>) => void;
  simulateObservation: () => Promise<void>;
  calculateNewRoutes: (payload: RouteCalculatePayload) => Promise<void>;
  clearActiveRoute: () => void;
  setActiveBoundingBox: (bbox: BoundingBox | null) => void;
  reset: () => void;
}

export const NavContext = createContext<NavState | null>(null);

export function useOptionalNav(): NavState | null {
  return useContext(NavContext);
}

export function useNav(): NavState {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}

