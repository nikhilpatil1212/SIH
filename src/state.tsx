import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LayerState } from "./components/map/MapView";
import { alerts as baseAlerts, icebergs as baseIcebergs, routes as baseRoutes } from "./data/mock";
import type { AlertItem, Iceberg, Route } from "./data/types";

// Central client state. Kept intentionally simple (React state) so it can be
// swapped for a data-fetching layer (TanStack Query / Zustand) in Phase 2.
interface NavState {
  routes: Route[];
  icebergs: Iceberg[];
  alerts: AlertItem[];
  selectedRouteId: string;
  recommendedRouteId: string;
  selectedIcebergId: string | null;
  layers: LayerState;
  rerouted: boolean;
  setSelectedRoute: (id: string) => void;
  setSelectedIceberg: (id: string) => void;
  toggleLayer: (k: keyof LayerState) => void;
  simulateObservation: () => void;
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
  const [layers, setLayers] = useState<LayerState>({
    icebergs: true,
    seaice: true,
    currents: true,
    weather: false,
  });

  const toggleLayer = useCallback((k: keyof LayerState) => {
    setLayers((l) => ({ ...l, [k]: !l[k] }));
  }, []);

  // Simulate a new iceberg observation degrading the "safest" route B so that
  // route C becomes the recommended alternative. Pure mock state transition.
  const simulateObservation = useCallback(() => {
    setRerouted(true);
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
          "New iceberg trajectory intersects the predicted Route B corridor in approximately 8 hours. Route C recommended.",
        severity: "critical",
        time: "10:31 UTC",
      },
      ...a,
    ]);
  }, []);

  const reset = useCallback(() => {
    setRoutes(baseRoutes);
    setIcebergs(baseIcebergs);
    setAlerts(baseAlerts);
    setSelectedRoute("route-b");
    setRecommended("route-b");
    setRerouted(false);
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
      setSelectedRoute,
      setSelectedIceberg,
      toggleLayer,
      simulateObservation,
      reset,
    }),
    [routes, icebergs, alerts, selectedRouteId, recommendedRouteId, selectedIcebergId, layers, rerouted, toggleLayer, simulateObservation, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
