import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import {
  NavContext,
  useNav,
  useOptionalNav,
  type NavState,
  type BoundingBox,
  type NamedPoint,
  type OperationalWaypoint,
} from "./context/NavContext";

export {
  NavContext,
  useNav,
  useOptionalNav,
  type NavState,
  type BoundingBox,
  type NamedPoint,
  type OperationalWaypoint,
};

export function NavProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<Route[]>(baseRoutes);
  const [icebergs, setIcebergs] = useState<Iceberg[]>(baseIcebergs);
  const [alerts, setAlerts] = useState<AlertItem[]>(baseAlerts);
  const [selectedRouteId, setSelectedRoute] = useState("route-b");
  const [recommendedRouteId, setRecommended] = useState("route-b");
  const [selectedIcebergId, setSelectedIceberg] = useState<string | null>("A76C");
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

  const [seaIcePrediction, setSeaIcePrediction] = useState<SeaIcePredictionResponse | null>(null);
  const fetchingRef = useRef<Record<string, boolean>>({});

  // Canonical hazards derived dynamically from active real icebergs
  const hazards = useMemo<Hazard[]>(() => {
    const list: Hazard[] = [];
    const highAndMed = icebergs.filter((b) => b.riskLevel === "high" || b.riskLevel === "medium");
    highAndMed.slice(0, 6).forEach((b, idx) => {
      const lat = b.position?.lat ?? -65.0;
      const lon = b.position?.lon ?? -40.0;
      const latStr = `${Math.abs(lat).toFixed(1)}°${lat < 0 ? "S" : "N"}`;
      const lonStr = `${Math.abs(lon).toFixed(1)}°${lon < 0 ? "W" : "E"}`;
      list.push({
        id: b.id,
        type: "Iceberg",
        location: `${latStr} ${lonStr}`,
        severity: (b.riskLevel as "high" | "medium" | "low") || "high",
        predictedTime: `+${12 + idx * 6}h`,
        confidence: b.confidence ?? 85,
        affectedRoute: idx % 2 === 0 ? "Route A" : "Route B",
        status: idx < 2 ? "active" : "predicted",
      });
    });
    // Add standard environmental contact baselines
    list.push(
      { id: "SI-E-01", type: "Sea-Ice", location: "68.2°S 29.5°W", severity: "medium", predictedTime: "+18h", confidence: 84, affectedRoute: "Route A", status: "active" },
      { id: "WX-04", type: "Weather", location: "63.5°S 41.0°W", severity: "medium", predictedTime: "+36h", confidence: 78, affectedRoute: "Route B", status: "predicted" },
      { id: "VIS-02", type: "Visibility", location: "70.1°S 12.0°E", severity: "low", predictedTime: "+48h", confidence: 72, affectedRoute: "Route C", status: "predicted" },
    );
    return list;
  }, [icebergs]);

  const fetchPrediction = useCallback(async (ibg: Iceberg) => {
    if (!ibg || !ibg.position || fetchingRef.current[ibg.id]) return;
    fetchingRef.current[ibg.id] = true;

    setPredictionLoading(true);
    setPredictionError(null);

    try {
      const speedMs = (ibg.speedMs && ibg.speedMs > 0) ? ibg.speedMs : 0.22;
      const drift_speed_kmh = speedMs * 3.6;
      const drift_heading_deg = ibg.headingDeg || 300.0;

      // Project backward to get previous_delta_latitude and previous_delta_longitude
      const dist_24h_km = speedMs * 86.4; // 24 hours distance in km
      const heading_rad = (drift_heading_deg * Math.PI) / 180.0;
      const lat_rad = (ibg.position.lat * Math.PI) / 180.0;

      const prev_delta_lat = -(dist_24h_km * Math.cos(heading_rad)) / 111.32;
      const prev_delta_lon = -(dist_24h_km * Math.sin(heading_rad)) / (111.32 * Math.max(0.1, Math.cos(lat_rad)));

      const size_1_nm = ibg.lengthNm !== undefined ? ibg.lengthNm : (ibg.sizeKm ? ibg.sizeKm / 1.852 : 3.0);
      const size_2_nm = ibg.widthNm !== undefined ? ibg.widthNm : size_1_nm / 2.0;

      const payload: MLPredictRequest = {
        latitude: ibg.position.lat,
        longitude: ibg.position.lon,
        previous_delta_latitude: ibg.previous_delta_latitude !== undefined && ibg.previous_delta_latitude !== 0 ? ibg.previous_delta_latitude : prev_delta_lat,
        previous_delta_longitude: ibg.previous_delta_longitude !== undefined && ibg.previous_delta_longitude !== 0 ? ibg.previous_delta_longitude : prev_delta_lon,
        drift_speed_kmh: drift_speed_kmh,
        drift_heading_deg: drift_heading_deg,
        size_1_nm: size_1_nm || 5.0,
        size_2_nm: size_2_nm || 2.5,
        current_extent: 11.5,
        iceberg_id: ibg.id,
        observation_date: new Date().toISOString().split("T")[0],
      };

      let predLat = ibg.position.lat + (dist_24h_km * Math.cos(heading_rad)) / 111.32;
      let predLon = ibg.position.lon + (dist_24h_km * Math.sin(heading_rad)) / (111.32 * Math.max(0.1, Math.cos(lat_rad)));
      let dispKm = dist_24h_km;

      const result = await apiClient.predictIcebergMLTrajectory(payload);
      if (result) {
        predLat = result.predicted_latitude;
        predLon = result.predicted_longitude;
        dispKm = result.displacement_km;
      }

      // Generate the 6-point path using interpolation and extrapolation
      const dlat = predLat - ibg.position.lat;
      const dlon = predLon - ibg.position.lon;

      const scaleX = 18;
      const scaleY = -90;
      const pred_x = (ibg.position.x || 500) + dlon * scaleX;
      const pred_y = (ibg.position.y || 500) + dlat * scaleY;

      const dx = pred_x - (ibg.position.x || 500);
      const dy = pred_y - (ibg.position.y || 500);

      const wrapLon = (lon: number) => {
        return (((lon + 180) % 360) + 360) % 360 - 180;
      };

      const getPt = (t: number) => ({
        x: +((ibg.position.x || 500) + dx * t).toFixed(1),
        y: +((ibg.position.y || 500) + dy * t).toFixed(1),
        lat: +(ibg.position.lat + dlat * t).toFixed(5),
        lon: +wrapLon(ibg.position.lon + dlon * t).toFixed(5),
      });

      const newPath = [
        getPt(0),       // 0h (NOW)
        getPt(6 / 24),  // 6h
        getPt(12 / 24), // 12h
        getPt(24 / 24), // 24h (ML prediction)
        getPt(48 / 24), // 48h (Forecast)
        getPt(72 / 24), // 72h (Forecast)
      ];

      setIcebergs((prevList) =>
        prevList.map((item) => (item.id === ibg.id ? { ...item, predictedPath: newPath } : item))
      );

      setPredictionsCache((prev) => ({
        ...prev,
        [ibg.id]: {
          lat: predLat,
          lon: predLon,
          displacement_km: dispKm,
        },
      }));
    } catch (err) {
      console.error("Failed to fetch ML prediction:", err);
      setPredictionError("Prediction unavailable");
    } finally {
      setPredictionLoading(false);
      fetchingRef.current[ibg.id] = false;
    }
  }, []);

  useEffect(() => {
    const loadIcebergs = async () => {
      try {
        const data = await apiClient.getCurrentIcebergs();
        if (data && data.length > 0) {
          setIcebergs(data);
          setSelectedIceberg((prev) => {
            if (prev && data.some((i) => i.id === prev)) return prev;
            const defaultBerg = data.find((i) => i.hasKinematics) || data[0];
            return defaultBerg ? defaultBerg.id : "A76C";
          });
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
    if (selectedIcebergId) {
      const ibg = icebergs.find((i) => i.id === selectedIcebergId);
      if (ibg && !predictionsCache[selectedIcebergId] && !fetchingRef.current[selectedIcebergId]) {
        fetchPrediction(ibg);
      }
    }
  }, [selectedIcebergId, fetchPrediction, predictionsCache, icebergs]);


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
    } catch (err) {
      console.error("Route calculation failed, applying physical geodesic fallback:", err);
      const fallbackResult = clientSideCalculateRoutes(payload);
      setRoutes(fallbackResult.routes);
      setRecommended(fallbackResult.recommended_route_id);
      setSelectedRoute(fallbackResult.recommended_route_id);
      setWhyRecommended(fallbackResult.why_recommended);
      setActiveBoundingBox(fallbackResult.bounding_box);
      setActiveStartPoint(fallbackResult.start);
      setActiveDestinationPoint(fallbackResult.destination);
      setBaseTravelHours(fallbackResult.baseTravelHours);
      setTotalBreakHours(fallbackResult.totalBreakHours);
      setTotalVoyageHours(fallbackResult.totalVoyageHours);
    } finally {
      setIsCalculating(false);
    }
  }, []);

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
    setSelectedIceberg("A76C");
    setRerouted(false);
    setActiveBoundingBox(null);
    setWaypoints([]);
    setTotalBreakHours(0);
  }, []);

  const value = useMemo(
    () => ({
      routes,
      icebergs,
      usnicIcebergs: icebergs,
      hazards,
      alerts,
      selectedRouteId,
      recommendedRouteId,
      selectedIcebergId,
      selectedUsnicIcebergId: selectedIcebergId,
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
      setSelectedUsnicIcebergId: setSelectedIceberg,
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
      hazards,
      alerts,
      selectedRouteId,
      recommendedRouteId,
      selectedIcebergId,
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

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
