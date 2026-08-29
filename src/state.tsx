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
import type { AlertItem, Iceberg, Route, SeaIcePredictionResponse } from "./data/types";
import apiClient, {
  clientSideCalculateRoutes,
  type RouteCalculatePayload,
  type RouteWaypointInput,
  type MLPredictRequest,
  type MLPredictResponse,
} from "./api/client";

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

interface NavState {
  routes: Route[];
  icebergs: Iceberg[];
  usnicIcebergs: Iceberg[];
  alerts: AlertItem[];
  selectedRouteId: string;
  recommendedRouteId: string;
  selectedIcebergId: string | null;
  selectedUsnicIcebergId: string | null;
  layers: LayerState;
  rerouted: boolean;
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
  setSelectedRoute: (id: string) => void;
  setSelectedIceberg: (id: string) => void;
  setSelectedUsnicIcebergId: (id: string | null) => void;
  toggleLayer: (k: keyof LayerState) => void;
  addWaypoint: (wp: Omit<OperationalWaypoint, "id">) => void;
  removeWaypoint: (id: string) => void;
  updateWaypoint: (id: string, updates: Partial<OperationalWaypoint>) => void;
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

  const [waypoints, setWaypoints] = useState<OperationalWaypoint[]>([]);
  const [baseTravelHours, setBaseTravelHours] = useState(177);
  const [totalBreakHours, setTotalBreakHours] = useState(0);
  const [totalVoyageHours, setTotalVoyageHours] = useState(177);

  const [predictionLoading, setPredictionLoading] = useState<boolean>(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [predictionsCache, setPredictionsCache] = useState<Record<string, { lat: number; lon: number; displacement_km: number }>>({});

  const [usnicIcebergs, setUsnicIcebergs] = useState<Iceberg[]>([]);
  const [selectedUsnicIcebergId, setSelectedUsnicIcebergId] = useState<string | null>(null);
  const [seaIcePrediction, setSeaIcePrediction] = useState<SeaIcePredictionResponse | null>(null);

  const fetchPrediction = useCallback(async (ibg: Iceberg) => {
    if (!ibg) return;

    setPredictionLoading(true);
    setPredictionError(null);

    if (ibg.hasKinematics === false) {
      setPredictionLoading(false);
      setPredictionError("No historical track data available for kinematics");
      return;
    }

    try {
      const drift_speed_kmh = ibg.speedMs * 3.6;
      const drift_heading_deg = ibg.headingDeg;

      // Project backward to get previous_delta_latitude and previous_delta_longitude
      const dist_24h_km = ibg.speedMs * 86.4; // 24 hours distance in km
      const heading_rad = (drift_heading_deg * Math.PI) / 180.0;
      const lat_rad = (ibg.position.lat * Math.PI) / 180.0;

      const prev_delta_lat = -(dist_24h_km * Math.cos(heading_rad)) / 111.32;
      const prev_delta_lon = -(dist_24h_km * Math.sin(heading_rad)) / (111.32 * Math.cos(lat_rad));

      const size_1_nm = ibg.lengthNm !== undefined ? ibg.lengthNm : ibg.sizeKm / 1.852;
      const size_2_nm = ibg.widthNm !== undefined ? ibg.widthNm : size_1_nm / 2.0;

      const payload: MLPredictRequest = {
        latitude: ibg.position.lat,
        longitude: ibg.position.lon,
        previous_delta_latitude: ibg.previous_delta_latitude !== undefined ? ibg.previous_delta_latitude : prev_delta_lat,
        previous_delta_longitude: ibg.previous_delta_longitude !== undefined ? ibg.previous_delta_longitude : prev_delta_lon,
        drift_speed_kmh: ibg.hasKinematics ? ibg.speedMs * 3.6 : drift_speed_kmh,
        drift_heading_deg: ibg.hasKinematics ? ibg.headingDeg : drift_heading_deg,
        size_1_nm: size_1_nm,
        size_2_nm: size_2_nm,
        current_extent: 11.5,
        iceberg_id: ibg.id,
        observation_date: new Date().toISOString().split("T")[0],
      };

      const result = await apiClient.predictIcebergMLTrajectory(payload);
      if (result) {
        // Generate the 6-point path using interpolation and extrapolation
        const dlat = result.predicted_latitude - ibg.position.lat;
        const dlon = result.predicted_longitude - ibg.position.lon;

        const scaleX = 18;
        const scaleY = -90;
        const pred_x = ibg.position.x + dlon * scaleX;
        const pred_y = ibg.position.y + dlat * scaleY;

        const dx = pred_x - ibg.position.x;
        const dy = pred_y - ibg.position.y;

        const wrapLon = (lon: number) => {
          return (((lon + 180) % 360) + 360) % 360 - 180;
        };

        const getPt = (t: number) => ({
          x: +(ibg.position.x + dx * t).toFixed(1),
          y: +(ibg.position.y + dy * t).toFixed(1),
          lat: +(ibg.position.lat + dlat * t).toFixed(5),
          lon: +wrapLon(ibg.position.lon + dlon * t).toFixed(5),
        });

        const newPath = [
          getPt(0),       // 0h
          getPt(6 / 24),  // 6h
          getPt(12 / 24), // 12h
          getPt(24 / 24), // 24h (Real ML prediction)
          getPt(48 / 24), // 48h (Extrapolated)
          getPt(72 / 24), // 72h (Extrapolated)
        ];

        const updateList = (prevList: Iceberg[]) =>
          prevList.map((item) => {
            if (item.id === ibg.id) {
              return {
                ...item,
                predictedPath: newPath,
              };
            }
            return item;
          });

        setIcebergs(updateList);
        setUsnicIcebergs(updateList);

        setPredictionsCache((prev) => ({
          ...prev,
          [ibg.id]: {
            lat: result.predicted_latitude,
            lon: result.predicted_longitude,
            displacement_km: result.displacement_km,
          },
        }));
      } else {
        setPredictionError("Prediction unavailable");
      }
    } catch (err) {
      console.error("Failed to fetch ML prediction:", err);
      setPredictionError("Prediction unavailable");
    } finally {
      setPredictionLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadIcebergs = async () => {
      try {
        const data = await apiClient.getCurrentIcebergs();
        if (data && data.length > 0) {
          setUsnicIcebergs(data);
          const defaultBerg = data.find((i) => i.hasKinematics) || data[0];
          if (defaultBerg) {
            setSelectedUsnicIcebergId(defaultBerg.id);
          }
        }
      } catch (err) {
        console.error("Failed to load current USNIC icebergs:", err);
      }
    };
    loadIcebergs();
  }, []);

  useEffect(() => {
    const loadSeaIce = async () => {
      try {
        const data = await apiClient.getSeaIcePrediction();
        if (data) {
          setSeaIcePrediction(data);
        }
      } catch (err) {
        console.error("Failed to load real sea-ice data:", err);
      }
    };
    loadSeaIce();
  }, []);

  useEffect(() => {
    if (selectedUsnicIcebergId) {
      const ibg = usnicIcebergs.find((i) => i.id === selectedUsnicIcebergId);
      if (ibg && !predictionsCache[selectedUsnicIcebergId]) {
        fetchPrediction(ibg);
      }
    }
  }, [selectedUsnicIcebergId, fetchPrediction, predictionsCache, usnicIcebergs]);

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

  const addWaypoint = useCallback((wp: Omit<OperationalWaypoint, "id">) => {
    const id = `wp-${Date.now()}`;
    setWaypoints((prev) => [...prev, { ...wp, id }]);
  }, []);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const updateWaypoint = useCallback((id: string, updates: Partial<OperationalWaypoint>) => {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  }, []);

  useEffect(() => {
    if (selectedIcebergId) {
      const ibg = icebergs.find((i) => i.id === selectedIcebergId);
      if (ibg && !predictionsCache[selectedIcebergId]) {
        fetchPrediction(ibg);
      }
    }
  }, [selectedIcebergId, fetchPrediction, predictionsCache, icebergs]);

  // Calculate Routes with real backend API & geodesic fallback

  const calculateNewRoutes = useCallback(async (payload: RouteCalculatePayload) => {
    setIsCalculating(true);
    try {
      const result = (await apiClient.calculateCustomRoute(payload)) || clientSideCalculateRoutes(payload);
      setRoutes(result.routes);
      setRecommended(result.recommended_route_id);
      setSelectedRoute(result.recommended_route_id);
      setWhyRecommended(result.why_recommended);
      setActiveBoundingBox(result.bounding_box);
      setActiveStartPoint(result.start);
      setActiveDestinationPoint(result.destination);
      setBaseTravelHours(result.baseTravelHours);
      setTotalBreakHours(result.totalBreakHours);
      setTotalVoyageHours(result.totalVoyageHours);
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
    setWaypoints([]);
    setTotalBreakHours(0);
  }, []);

  const value = useMemo(
    () => ({
      routes,
      icebergs,
      usnicIcebergs,
      alerts,
      selectedRouteId,
      recommendedRouteId,
      selectedIcebergId,
      selectedUsnicIcebergId,
      layers,
      rerouted,
      activeBoundingBox,
      activeStartPoint,
      activeDestinationPoint,
      waypoints,
      whyRecommended,
      isCalculating,
      baseTravelHours,
      totalBreakHours,
      totalVoyageHours,
      predictionLoading,
      predictionError,
      predictionsCache,
      seaIcePrediction,
      setSelectedRoute,
      setSelectedIceberg,
      setSelectedUsnicIcebergId,
      toggleLayer,
      addWaypoint,
      removeWaypoint,
      updateWaypoint,
      simulateObservation,
      calculateNewRoutes,
      setActiveBoundingBox,
      reset,
    }),
    [
      routes,
      icebergs,
      usnicIcebergs,
      alerts,
      selectedRouteId,
      recommendedRouteId,
      selectedIcebergId,
      selectedUsnicIcebergId,
      layers,
      rerouted,
      activeBoundingBox,
      activeStartPoint,
      activeDestinationPoint,
      waypoints,
      whyRecommended,
      isCalculating,
      baseTravelHours,
      totalBreakHours,
      totalVoyageHours,
      predictionLoading,
      predictionError,
      predictionsCache,
      seaIcePrediction,
      setSelectedRoute,
      setSelectedIceberg,
      setSelectedUsnicIcebergId,
      toggleLayer,
      addWaypoint,
      removeWaypoint,
      updateWaypoint,
      simulateObservation,
      calculateNewRoutes,
      setActiveBoundingBox,
      reset,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOptionalNav() {
  return useContext(Ctx);
}

export function useNav() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
