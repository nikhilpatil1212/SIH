import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LayerState } from "./components/map/MapView";
import { alerts as baseAlerts, icebergs as baseIcebergs, routes as baseRoutes } from "./data/mock";
import type { AlertItem, Iceberg, Route } from "./data/types";
import apiClient, { type RouteCalculatePayload } from "./api/client";

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

interface NavState {
  routes: Route[];
  icebergs: Iceberg[];
  alerts: AlertItem[];
  selectedRouteId: string;
  recommendedRouteId: string;
  selectedIcebergId: string | null;
  layers: LayerState;
  rerouted: boolean;
  activeBoundingBox: BoundingBox | null;
  activeStartPoint: NamedPoint | null;
  activeDestinationPoint: NamedPoint | null;
  whyRecommended: string[];
  isCalculating: boolean;
  setSelectedRoute: (id: string) => void;
  setSelectedIceberg: (id: string) => void;
  toggleLayer: (k: keyof LayerState) => void;
  simulateObservation: () => Promise<void>;
  calculateNewRoutes: (payload: RouteCalculatePayload) => Promise<void>;
  setActiveBoundingBox: (bbox: BoundingBox | null) => void;
  reset: () => void;
}

const Ctx = createContext<NavState | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<Route[]>(baseRoutes);
  const [icebergs, setIcebergs] = useState<Iceberg[]>(baseIcebergs);
  const [alerts, setAlerts] = useState<AlertItem[]>(baseAlerts);
  const [selectedRouteId, setSelectedRoute] = useState("route-b");
  const [recommendedRouteId, setRecommended] = useState("route-b");
  const [selectedIcebergId, setSelectedIceberg] = useState<string | null>("IBG-1247");
  const [rerouted, setRerouted] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeBoundingBox, setActiveBoundingBox] = useState<BoundingBox | null>(null);
  const [activeStartPoint, setActiveStartPoint] = useState<NamedPoint | null>({
    lat: -33.92,
    lon: 18.42,
    name: "Port of Cape Town",
  });
  const [activeDestinationPoint, setActiveDestinationPoint] = useState<NamedPoint | null>({
    lat: -70.77,
    lon: 11.73,
    name: "Maitri Station (India)",
  });
  const [whyRecommended, setWhyRecommended] = useState<string[]>([
    "Lower iceberg encounter probability (↓ 41% vs direct)",
    "Marginal pack-ice concentration buffer (28% vs 64%)",
    "Maintains 15+ nm safety standoff from active hazard clusters",
  ]);

  const [layers, setLayers] = useState<LayerState>({
    icebergs: true,
    seaice: true,
    currents: true,
    weather: false,
  });

  const toggleLayer = useCallback((k: keyof LayerState) => {
    setLayers((l) => ({ ...l, [k]: !l[k] }));
  }, []);

  // Calculate Routes with real backend API & geodesic fallback
  const calculateNewRoutes = useCallback(async (payload: RouteCalculatePayload) => {
    setIsCalculating(true);
    try {
      const result = await apiClient.calculateRoutes(payload);
      setRoutes(result.routes);
      setRecommended(result.recommended_route_id);
      setSelectedRoute(result.recommended_route_id);
      setWhyRecommended(result.why_recommended);
      setActiveBoundingBox(result.bounding_box);
      setActiveStartPoint(result.start);
      setActiveDestinationPoint(result.destination);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  // Tactical Re-routing simulation
  const simulateObservation = useCallback(async () => {
    const res = await apiClient.simulateRerouting(selectedRouteId);
    setRerouted(true);
    if (res) {
      setRoutes(res.routes);
      setRecommended(res.new_recommended_route_id);
      setSelectedRoute(res.new_recommended_route_id);
      setAlerts((a) => [res.alert as AlertItem, ...a]);
    } else {
      setRoutes((rs) =>
        rs.map((r) =>
          r.id === "route-b"
            ? { ...r, riskScore: 67, riskLevel: "high" }
            : r.id === "route-c"
              ? { ...r, riskScore: 41, riskLevel: "medium" }
              : r,
        ),
      );
      setRecommended("route-c");
      setSelectedRoute("route-c");
      setAlerts((a) => [
        {
          id: `al-${Date.now()}`,
          title: "ROUTE RISK ESCALATED",
          message:
            "New tabular iceberg trajectory intersects predicted Route B corridor in ~8 hours. Route C recommended.",
          severity: "critical",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...a,
      ]);
    }
  }, [selectedRouteId]);

  const reset = useCallback(() => {
    setRoutes(baseRoutes);
    setIcebergs(baseIcebergs);
    setAlerts(baseAlerts);
    setSelectedRoute("route-b");
    setRecommended("route-b");
    setRerouted(false);
    setActiveBoundingBox(null);
  }, []);

  const value = useMemo(
    () => ({
      routes,
      icebergs,
      alerts,
      selectedRouteId,
      recommendedRouteId,
      selectedIcebergId,
      layers,
      rerouted,
      activeBoundingBox,
      activeStartPoint,
      activeDestinationPoint,
      whyRecommended,
      isCalculating,
      setSelectedRoute,
      setSelectedIceberg,
      toggleLayer,
      simulateObservation,
      calculateNewRoutes,
      setActiveBoundingBox,
      reset,
    }),
    [
      routes,
      icebergs,
      alerts,
      selectedRouteId,
      recommendedRouteId,
      selectedIcebergId,
      layers,
      rerouted,
      activeBoundingBox,
      activeStartPoint,
      activeDestinationPoint,
      whyRecommended,
      isCalculating,
      setSelectedRoute,
      setSelectedIceberg,
      toggleLayer,
      simulateObservation,
      calculateNewRoutes,
      setActiveBoundingBox,
      reset,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
