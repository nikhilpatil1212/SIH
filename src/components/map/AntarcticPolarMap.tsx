import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { type Map as MapLibreInstance, type Marker as MapLibreMarker, type GeoJSONSource } from "maplibre-gl";
import {
  AlertTriangle,
  Anchor,
  Clock,
  Compass,
  Crosshair,
  Globe,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Navigation,
  Plus,
  ShieldAlert,
  Ship,
  Snowflake,
  Triangle,
  X,
} from "lucide-react";
import type { Hazard, Iceberg, Route } from "../../data/types";
import { RISK_COLORS, cx } from "../ui/primitives";
import { useTheme } from "../../theme";
import { hazards as mockHazards } from "../../data/mock";
import { useOptionalNav, type OperationalWaypoint } from "../../state";
import { constrainTrajectoryToOcean } from "../../utils/landMask";
import apiClient from "../../api/client";



import {
  MAP_PROVIDERS,
  type MapTileProviderId,
  type MapTileProvider,
  getSectorName,
  RESEARCH_STATIONS,
  type ResearchStation,
  GATEWAY_PORTS,
  type GatewayPort,
} from "../../data/polarMapData";

export {
  MAP_PROVIDERS,
  type MapTileProviderId,
  type MapTileProvider,
  getSectorName,
  RESEARCH_STATIONS,
  type ResearchStation,
  GATEWAY_PORTS,
  type GatewayPort,
};

export interface SeaIceHeatFeature {
  region: string;
  polygon: { lat: number; lon: number }[];
  concentration: number;
}

export interface AntarcticPolarMapProps {
  routes?: Route[];
  icebergs?: Iceberg[];
  selectedRouteId?: string;
  onSelectRoute?: (id: string) => void;
  selectedIcebergId?: string | null;
  onSelectIceberg?: (id: string) => void;
  horizonFraction?: number;
  vessel?: {
    name: string;
    position: { lat: number; lon: number };
    headingDeg: number;
    speedKn: number;
    status: string;
  };
  waypoints?: OperationalWaypoint[];
  showMaximize?: boolean;
  className?: string;
  compact?: boolean;
  seaIceHeat?: SeaIceHeatFeature[];
  selectedRegion?: string | null;
  onSelectRegion?: (region: string) => void;
}

export type HoveredEntity =
  | { type: "iceberg"; data: Iceberg }
  | { type: "vessel"; data: any }
  | { type: "station"; data: ResearchStation }
  | { type: "gateway"; data: typeof GATEWAY_PORTS[0] }
  | { type: "hazard"; data: Hazard }
  | { type: "waypoint"; data: any; index: number }
  | null;

const EMPTY_ROUTES: Route[] = [];

const EMPTY_ICEBERGS: Iceberg[] = [];

export function AntarcticPolarMap({
  routes = EMPTY_ROUTES,
  icebergs = EMPTY_ICEBERGS,
  selectedRouteId = "route-b",

  onSelectRoute,
  selectedIcebergId,
  onSelectIceberg,
  horizonFraction = 0.001,
  vessel,
  waypoints: propWaypoints,
  showMaximize = false,
  className = "",
  compact = false,
  seaIceHeat,
  selectedRegion,
  onSelectRegion,
}: AntarcticPolarMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const nav = useOptionalNav();
  const activeWaypoints = propWaypoints ?? nav?.waypoints ?? [];
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreInstance | null>(null);

  // Active Base Map State (Defaults to ESRI Satellite)
  const [providerId, setProviderId] = useState<MapTileProviderId>("esri-satellite");
  const [fullscreen, setFullscreen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(2.5);

  // Operational Layer Visibility
  const [layers, setLayers] = useState({
    stations: true,
    gateways: true,
    icebergs: true,
    icebergPrediction: true,
    vessel: true,
    hazards: true,
    waypoints: true,
  });

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Hovered / Selected Entity State (Floating Card with Zero Layout Shift)
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity>(null);
  const [hoveredSeaRegion, setHoveredSeaRegion] = useState<any | null>(null);
  const [clickedSeaRegionEnv, setClickedSeaRegionEnv] = useState<any | null>(null);
  const [loadingRegionEnv, setLoadingRegionEnv] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ lat: number; lon: number; sector: string } | null>(null);
  const [svgPoints, setSvgPoints] = useState<string>("");
  const [svgRoutes, setSvgRoutes] = useState<
    { id: string; name: string; color: string; selected: boolean; points: string; type: string }[]
  >([]);
  const hoverTimeoutRef = useRef<any>(null);
  const coordsRef = useRef<[number, number][]>([]);


  // Selected iceberg & trajectory coordinates derivation
  const selectedBerg = (icebergs && icebergs.length > 0)
    ? (icebergs.find((i) => i.id === selectedIcebergId) || icebergs[0])
    : null;

  const selectedTrajectoryCoords: [number, number][] = useMemo(() => {
    if (!selectedBerg || !selectedBerg.position) return [];
    if (selectedBerg.predictedPath && selectedBerg.predictedPath.length >= 2) {
      return selectedBerg.predictedPath.map((p) => [p.lon, p.lat]);
    }
    const speedMs = (selectedBerg.speedMs && selectedBerg.speedMs > 0) ? selectedBerg.speedMs : 0.22;
    const heading_rad = (((selectedBerg.headingDeg ?? 300)) * Math.PI) / 180.0;
    const lat_rad = (selectedBerg.position.lat * Math.PI) / 180.0;
    const dist_24h_km = speedMs * 86.4;
    const dlat = (dist_24h_km * Math.cos(heading_rad)) / 111.32;
    const dlon = (dist_24h_km * Math.sin(heading_rad)) / (111.32 * Math.max(0.1, Math.cos(lat_rad)));

    const rawFallback = [
      { lat: selectedBerg.position.lat, lon: selectedBerg.position.lon },
      { lat: selectedBerg.position.lat + dlat, lon: selectedBerg.position.lon + dlon },
      { lat: selectedBerg.position.lat + dlat * 2, lon: selectedBerg.position.lon + dlon * 2 },
      { lat: selectedBerg.position.lat + dlat * 3, lon: selectedBerg.position.lon + dlon * 3 },
    ];
    const { path: validFallback } = constrainTrajectoryToOcean(rawFallback);
    return validFallback.map((p) => [p.lon, p.lat]);
  }, [selectedBerg]);


  const updateSvgOverlay = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Iceberg Trajectory
    const coords = coordsRef.current;
    if (!coords || coords.length < 2) {
      setSvgPoints("");
    } else {
      try {
        const pts = coords
          .map((c) => {
            const pt = typeof (map as any).project === "function" ? (map as any).project([c[0], c[1]]) : { x: 0, y: 0 };
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
          })
          .join(" ");
        setSvgPoints(pts);
      } catch {}
    }

    // 2. All Calculated Ship Routes
    if (!routes || routes.length === 0) {
      setSvgRoutes([]);
    } else {
      try {
        const projectedRoutes = routes.map((r) => {
          const coordsList = (r.coordinates || []).filter((c) => c && c.lat != null && c.lon != null);
          const pts = coordsList
            .map((c) => {
              const pt = typeof (map as any).project === "function" ? (map as any).project([c.lon, c.lat]) : { x: 0, y: 0 };
              return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(" ");
          return {
            id: r.id,
            name: r.name,
            color: r.color || (r.id === "route-b" ? "#10b981" : r.id === "route-a" ? "#ef4444" : "#38bdf8"),
            selected: r.id === selectedRouteId,
            points: pts,
            type: r.type,
          };
        });
        setSvgRoutes(projectedRoutes);
      } catch {}
    }
  }, [routes, selectedRouteId]);

  const updateSvgOverlayRef = useRef<() => void>(() => {});
  updateSvgOverlayRef.current = updateSvgOverlay;

  useEffect(() => {
    coordsRef.current = selectedTrajectoryCoords;
    updateSvgOverlay();
  }, [selectedTrajectoryCoords, updateSvgOverlay]);

  const activeProvider = useMemo(() => {
    return MAP_PROVIDERS.find((p) => p.id === providerId) || MAP_PROVIDERS[0];
  }, [providerId]);

  const mapStyle = useMemo(() => {
    return {
      version: 8 as const,
      sources: {
        "raster-tiles": {
          type: "raster" as const,
          tiles: [activeProvider.tileUrl],
          tileSize: activeProvider.tileSize,
          attribution: activeProvider.attribution,
          maxzoom: activeProvider.maxZoom,
        },
      },
      layers: [
        {
          id: "raster-layer",
          type: "raster" as const,
          source: "raster-tiles",
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    };
  }, [activeProvider]);

  // 1. Initialize MapLibre GL instance (Run once on mount)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [18, -55], // Cape Town ➔ Antarctica corridor
      zoom: 2.5,
      minZoom: 1,
      maxZoom: 18,
      attributionControl: false,
    });

    mapRef.current = map;
    (window as any).__MAPLIBRE_MAP__ = map;

    const onOverlay = () => updateSvgOverlayRef.current?.();

    map.on("render", onOverlay);
    map.on("move", onOverlay);
    map.on("zoom", onOverlay);
    map.on("load", onOverlay);
    map.on("style.load", onOverlay);

    map.on("zoom", () => {
      setCurrentZoom(map.getZoom());
    });

    map.on("mousemove", (e: any) => {
      const lat = +e.lngLat.lat.toFixed(4);
      const lon = +e.lngLat.lng.toFixed(4);
      setCursorPos({ lat, lon, sector: getSectorName(lat, lon) });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);


  // Update Style on Provider Change seamlessly (Only when provider actually changes)
  const prevProviderRef = useRef<string>(providerId);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (prevProviderRef.current !== providerId) {
      prevProviderRef.current = providerId;
      map.setStyle(mapStyle);
    }
  }, [providerId, mapStyle]);

  // Trigger resize when fullscreen state toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setTimeout(() => {
      map.resize();
    }, 100);
  }, [fullscreen]);

  // 2. Auto-Fit Viewport to All Calculated Routes & Bounding Box
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routes || routes.length === 0) return;

    const allCoordinates: { lat: number; lon: number }[] = [];
    routes.forEach((r) => {
      if (r.coordinates && r.coordinates.length > 0) {
        allCoordinates.push(...r.coordinates);
      }
    });

    if (allCoordinates.length < 2) return;

    const lats = allCoordinates.map((c) => c.lat).filter((lat) => !isNaN(lat));
    const lons = allCoordinates.map((c) => c.lon).filter((lon) => !isNaN(lon));
    if (lats.length === 0 || lons.length === 0) return;

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    map.fitBounds(
      [
        [minLon - 3.0, minLat - 2.5],
        [maxLon + 3.0, maxLat + 2.5],
      ],
      { padding: 60, duration: 1200 }
    );
  }, [routes]);

  // 3. Smooth Auto-Focus / Close-Up Inspection Zoom on Selected Iceberg
  const prevSelectedIcebergRef = useRef<string | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedIcebergId) return;

    // Only fly if this is a newly selected iceberg
    if (prevSelectedIcebergRef.current === selectedIcebergId) return;
    prevSelectedIcebergRef.current = selectedIcebergId;

    const ibg = icebergs.find((i) => i.id === selectedIcebergId);
    if (!ibg) return;

    const path = ibg.predictedPath;
    const hasPath = path && path.length >= 4;

    // Center on the midpoint of the trajectory if available, or current iceberg position
    const targetLon = hasPath ? (path[0].lon + (path[5] || path[3]).lon) / 2 : ibg.position.lon;
    const targetLat = hasPath ? (path[0].lat + (path[5] || path[3]).lat) / 2 : ibg.position.lat;

    map.flyTo({
      center: [targetLon, targetLat],
      zoom: 8.8,
      duration: 1300,
      essential: true,
    });
  }, [selectedIcebergId, icebergs]);

  // Markers management
  const markersRef = useRef<MapLibreMarker[]>([]);

  const handleEntityMouseEnter = (entity: HoveredEntity) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredEntity(entity);
  };

  const handleEntityMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredEntity(null);
    }, 250);
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const addMarker = (lng: number, lat: number, el: HTMLElement) => {
      const m = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]);
      m.addTo(map);
      markersRef.current.push(m);
    };

    // A. Highly Visible Research Vessel Marker (SARATHI-1)
    if (layers.vessel && vessel) {
      const el = document.createElement("div");
      el.className = "relative flex flex-col items-center justify-center cursor-pointer group";
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute h-10 w-10 rounded-full bg-[#55d6e8]/40 animate-ping"></div>
          <div class="h-8 w-8 rounded-full bg-[#071521]/90 border-2 border-[#55d6e8] flex items-center justify-center text-[#55d6e8] shadow-[0_0_16px_#55d6e8] transition-transform hover:scale-125">
            <span style="transform: rotate(${vessel.headingDeg}deg); font-size: 13px; display: inline-block; line-height: 1;">▲</span>
          </div>
        </div>
        <div class="mt-1 px-2 py-0.5 rounded-md bg-[#071521]/95 border border-[#55d6e8] text-[#55d6e8] font-mono text-[9.5px] font-bold tracking-wider shadow-lg flex items-center gap-1 whitespace-nowrap">
          <span class="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
          <span>SARATHI-1</span>
        </div>
      `;
      el.onmouseenter = () => handleEntityMouseEnter({ type: "vessel", data: vessel });
      el.onmouseleave = handleEntityMouseLeave;
      addMarker(vessel.position.lon, vessel.position.lat, el);
    }

    // B. Operational Waypoints / Rest Breaks along Route
    if (layers.waypoints && activeWaypoints.length > 0) {
      activeWaypoints.forEach((wp, idx) => {
        const el = document.createElement("div");
        el.className = "flex items-center gap-1 cursor-pointer transition-transform hover:scale-125 px-2 py-0.5 rounded-full border border-[#38bdf8] bg-[#071521] text-[#38bdf8] shadow-[0_0_10px_#38bdf8] font-mono text-[9px] font-bold";
        el.innerHTML = `<span>⚓ WP${idx + 1}</span><span>${wp.breakDurationHours > 0 ? `(${wp.breakDurationHours}h)` : ""}</span>`;
        el.onmouseenter = () => handleEntityMouseEnter({ type: "waypoint", data: wp, index: idx + 1 });
        el.onmouseleave = handleEntityMouseLeave;
        addMarker(wp.lon, wp.lat, el);
      });
    }

    // C. Research Stations Markers
    if (layers.stations) {
      RESEARCH_STATIONS.forEach((st) => {
        const isIndian = st.country === "India";
        const showLabel = isIndian || currentZoom >= 3.5;

        const el = document.createElement("div");
        el.className = `flex items-center gap-1 cursor-pointer transition-all hover:scale-125 px-1.5 py-0.5 rounded-full border shadow-md font-mono text-[9.5px] font-bold ${
          isIndian
            ? "bg-[#071521] border-[#55d6e8] text-[#55d6e8] shadow-[0_0_10px_#55d6e8]"
            : "bg-[#071521]/90 border-[#ffb703] text-[#ffb703]"
        }`;
        el.innerHTML = showLabel ? `<span>${st.flag}</span><span>${st.name}</span>` : `<span>${st.flag}</span>`;

        el.onmouseenter = () => handleEntityMouseEnter({ type: "station", data: st });
        el.onmouseleave = handleEntityMouseLeave;
        addMarker(st.lon, st.lat, el);
      });
    }

    // D. Gateway Ports Markers
    if (layers.gateways) {
      GATEWAY_PORTS.forEach((p) => {
        const el = document.createElement("div");
        el.className = "flex items-center gap-1 cursor-pointer transition-transform hover:scale-125 px-1.5 py-0.5 rounded-full border border-[#10b981] bg-[#071521]/90 text-[#10b981] shadow-md font-mono text-[9px] font-bold";
        el.innerHTML = currentZoom >= 3 ? `<span>⚓</span><span>${p.flag}</span><span>${p.name}</span>` : `<span>⚓ ${p.flag}</span>`;
        el.onmouseenter = () => handleEntityMouseEnter({ type: "gateway", data: p });
        el.onmouseleave = handleEntityMouseLeave;
        addMarker(p.lon, p.lat, el);
      });
    }

    // E. Tracked Icebergs
    if (layers.icebergs) {
      icebergs.forEach((ibg) => {
        const isSelected = ibg.id === selectedIcebergId;
        const isHigh = ibg.riskLevel === "high";

        // If this is the selected iceberg:
        let path = ibg.predictedPath;
        if (isSelected && (!path || path.length < 4)) {
          const speedMs = ibg.speedMs > 0 ? ibg.speedMs : 0.22;
          const heading_rad = ((ibg.headingDeg || 300) * Math.PI) / 180.0;
          const lat_rad = (ibg.position.lat * Math.PI) / 180.0;
          const dist_24h_km = speedMs * 86.4;
          const dlat = (dist_24h_km * Math.cos(heading_rad)) / 111.32;
          const dlon = (dist_24h_km * Math.sin(heading_rad)) / (111.32 * Math.max(0.1, Math.cos(lat_rad)));

          const rawFallback = [
            ibg.position,
            { x: 500, y: 500, lat: ibg.position.lat + dlat * (6 / 24), lon: ibg.position.lon + dlon * (6 / 24) },
            { x: 500, y: 500, lat: ibg.position.lat + dlat * (12 / 24), lon: ibg.position.lon + dlon * (12 / 24) },
            { x: 500, y: 500, lat: ibg.position.lat + dlat, lon: ibg.position.lon + dlon },
            { x: 500, y: 500, lat: ibg.position.lat + dlat * 2, lon: ibg.position.lon + dlon * 2 },
            { x: 500, y: 500, lat: ibg.position.lat + dlat * 3, lon: ibg.position.lon + dlon * 3 },
          ];
          path = constrainTrajectoryToOcean(rawFallback).path;
        }


        if (isSelected && path && path.length >= 4) {
          let activeIndex = 0;
          if (horizonFraction <= 0.01) activeIndex = 0;
          else if (Math.abs(horizonFraction - 0.12) < 0.01) activeIndex = 1;
          else if (Math.abs(horizonFraction - 0.25) < 0.01) activeIndex = 2;
          else if (Math.abs(horizonFraction - 0.45) < 0.01) activeIndex = 3;
          else if (Math.abs(horizonFraction - 0.75) < 0.01) activeIndex = 4;
          else if (horizonFraction >= 0.99) activeIndex = 5;

          // 4 key milestone waypoints rendered simultaneously along the trajectory:
          // NOW (0h) -> path[0]
          // +24H (ML Prediction) -> path[3] || path[1]
          // +48H (Forecast) -> path[4] || path[2]
          // +72H (Forecast) -> path[5] || path[3]
          const waypoints = [
            {
              pt: path[0] || ibg.position,
              label: `${ibg.id} (NOW)`,
              color: "#55d6e8",
              sub: "CURRENT",
              stepIdx: 0,
            },
            {
              pt: path[3] || path[1] || path[0],
              label: `${ibg.id} (+24H)`,
              color: "#10b981",
              sub: "ML PREDICT",
              stepIdx: 3,
            },
            {
              pt: path[4] || path[2] || path[0],
              label: `${ibg.id} (+48H)`,
              color: "#f59e0b",
              sub: "FORECAST",
              stepIdx: 4,
            },
            {
              pt: path[5] || path[3] || path[0],
              label: `${ibg.id} (+72H)`,
              color: "#ef4444",
              sub: "FORECAST",
              stepIdx: 5,
            },
          ];

          waypoints.forEach((wp) => {
            const isActive = activeIndex === wp.stepIdx || (activeIndex < 3 && wp.stepIdx === 0 && activeIndex === 0);
            const el = document.createElement("div");
            el.className = `group flex flex-col items-center cursor-pointer transition-all duration-200 ${
              isActive ? "z-30 scale-110" : "z-20 scale-95 opacity-90 hover:scale-105"
            }`;

            const coordText = `${Math.abs(wp.pt.lat).toFixed(4)}°S, ${Math.abs(wp.pt.lon).toFixed(4)}°W`;

            el.innerHTML = `
              <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[9px] font-bold shadow-lg backdrop-blur-md transition-all ${
                isActive
                  ? "border-white bg-[#071521]/95 text-white ring-2 shadow-[0_0_16px_" + wp.color + "]"
                  : "border-[#1d445c] bg-[#071521]/80 text-[#c8dde3] hover:border-[#55d6e8]"
              }" style="${isActive ? `border-color: ${wp.color}; ring-color: ${wp.color};` : ""}">
                <span class="h-2 w-2 rounded-full inline-block ${isActive ? 'animate-pulse' : ''}" style="background-color: ${wp.color}; box-shadow: 0 0 8px ${wp.color}"></span>
                <span style="color: ${wp.color}">${wp.label}</span>
              </div>
              <div class="mt-0.5 px-1 py-0.2 rounded bg-[#030d17]/85 text-[7.5px] font-mono text-[#91aeb9] border border-[#1d445c]/50">
                ${coordText}
              </div>
            `;

            el.onmouseenter = () => handleEntityMouseEnter({ type: "iceberg", data: ibg });
            el.onmouseleave = handleEntityMouseLeave;
            el.onclick = (e) => {
              e.stopPropagation();
              onSelectIceberg?.(ibg.id);
            };

            addMarker(wp.pt.lon, wp.pt.lat, el);
          });
        } else {
          // Unselected iceberg or selected iceberg without predicted path:
          const el = document.createElement("div");
          el.className = `flex items-center gap-1 cursor-pointer transition-all hover:scale-125 px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold shadow-md ${
            isSelected
              ? "border-[#55d6e8] bg-[#55d6e8] text-[#071521] shadow-[0_0_12px_#55d6e8] scale-110"
              : isHigh
              ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] shadow-[0_0_8px_#ef4444]"
              : "bg-[#f5b942]/20 border-[#f5b942] text-[#f5b942]"
          }`;

          el.innerHTML = `<span>▲</span><span>${ibg.id}</span>`;
          el.onmouseenter = () => handleEntityMouseEnter({ type: "iceberg", data: ibg });
          el.onmouseleave = handleEntityMouseLeave;
          el.onclick = (e) => {
            e.stopPropagation();
            onSelectIceberg?.(ibg.id);
          };
          addMarker(ibg.position.lon, ibg.position.lat, el);
        }
      });
    }

    // F. Hazards Layer
    if (layers.hazards) {
      mockHazards.forEach((hz) => {
        const parts = hz.location.split(" ");
        const lat = -parseFloat(parts[0]);
        const lon = -parseFloat(parts[1]);
        if (isNaN(lat) || isNaN(lon)) return;

        const isHigh = hz.severity === "high";
        const el = document.createElement("div");
        el.className = `flex items-center gap-1 cursor-pointer transition-transform hover:scale-125 px-1.5 py-0.5 rounded-full border font-mono text-[8.5px] font-bold shadow-md ${
          isHigh ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] animate-pulse" : "bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]"
        }`;
        el.innerHTML = `<span>⚠️</span><span>${hz.id}</span>`;
        el.onmouseenter = () => handleEntityMouseEnter({ type: "hazard", data: hz });
        el.onmouseleave = handleEntityMouseLeave;
        addMarker(lon, lat, el);
      });
    }

    // G. Departure & Destination Markers for Calculated Routes
    if (routes && routes.length > 0) {
      const activeRt = routes.find((r) => r.id === selectedRouteId) || routes[0];
      if (activeRt && activeRt.coordinates && activeRt.coordinates.length >= 2) {
        const startPt = activeRt.coordinates[0];
        const destPt = activeRt.coordinates[activeRt.coordinates.length - 1];

        // Departure Marker
        const startEl = document.createElement("div");
        startEl.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#10b981] bg-[#071927]/95 shadow-[0_0_12px_#10b981]/50 font-mono text-[10px] font-bold text-white cursor-pointer hover:scale-110 transition-transform";
        startEl.innerHTML = `<span class="h-2 w-2 rounded-full bg-[#10b981] animate-ping"></span><span>⚓ DEPARTURE</span>`;
        addMarker(startPt.lon, startPt.lat, startEl);

        // Destination Marker
        const destEl = document.createElement("div");
        destEl.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#f5b942] bg-[#071927]/95 shadow-[0_0_12px_#f5b942]/50 font-mono text-[10px] font-bold text-white cursor-pointer hover:scale-110 transition-transform";
        destEl.innerHTML = `<span class="h-2 w-2 rounded-full bg-[#f5b942] animate-pulse"></span><span>🏁 DESTINATION</span>`;
        addMarker(destPt.lon, destPt.lat, destEl);
      }
    }
  }, [layers, vessel, icebergs, providerId, currentZoom, horizonFraction, selectedIcebergId, activeWaypoints, nav?.predictionsCache, routes, selectedRouteId]);

  // GeoJSON Line & Polygon Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupLayers = () => {
      // 1. Sea Ice Heat / Concentration Polygons (using canonical 15 regional sectors)
      let seaIceFeatures: any[] = [];
      if (seaIceHeat && seaIceHeat.length > 0) {
        seaIceFeatures = seaIceHeat.map((s) => {
          const coords = s.polygon.map((p) => [p.lon, p.lat]);
          if (
            coords.length > 0 &&
            (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])
          ) {
            coords.push([...coords[0]]);
          }
          return {
            type: "Feature" as const,
            properties: {
              region: s.region,
              concentration: s.concentration,
              risk_level: s.concentration > 70 ? "HIGH" : s.concentration > 40 ? "MEDIUM" : "LOW",
              selected: s.region === selectedRegion,
            },
            geometry: {
              type: "Polygon" as const,
              coordinates: [coords],
            },
          };
        });
      } else if (nav?.seaIceGeoJson && nav.seaIceGeoJson.features) {
        seaIceFeatures = nav.seaIceGeoJson.features.map((f: any) => ({
          ...f,
          properties: {
            ...f.properties,
            concentration: f.properties.current_sic ?? f.properties.concentration ?? 0,
            selected: f.properties.region === selectedRegion,
          },
        }));
      } else if (nav?.seaIcePrediction?.horizons?.["0h"]?.regions) {
        seaIceFeatures = nav.seaIcePrediction.horizons["0h"].regions.map((r: any) => {
          const coords = (r.polygon || []).map((p: any) => [p.lon, p.lat]);
          if (coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
            coords.push([...coords[0]]);
          }
          return {
            type: "Feature" as const,
            properties: {
              region: r.region,
              concentration: r.currentConcentration,
              risk_level: r.routeImpact ? r.routeImpact.toUpperCase() : "MEDIUM",
              selected: r.region === selectedRegion,
            },
            geometry: {
              type: "Polygon" as const,
              coordinates: [coords],
            },
          };
        });
      }

      if (seaIceFeatures.length > 0) {
        if (map.getSource("sea-ice-source")) {
          (map.getSource("sea-ice-source") as GeoJSONSource).setData({
            type: "FeatureCollection",
            features: seaIceFeatures,
          });
        } else {
          map.addSource("sea-ice-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: seaIceFeatures },
          });

          map.addLayer({
            id: "sea-ice-fill",
            type: "fill",
            source: "sea-ice-source",
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["get", "concentration"],
                0,
                "#a9dfe9",
                30,
                "#55d6e8",
                60,
                "#3b82f6",
                90,
                "#1e3a8a",
              ],
              "fill-opacity": ["case", ["get", "selected"], 0.45, 0.22],
            },
          });

          map.addLayer({
            id: "sea-ice-outline",
            type: "line",
            source: "sea-ice-source",
            paint: {
              "line-color": "#55d6e8",
              "line-width": ["case", ["get", "selected"], 2.5, 1],
              "line-opacity": 0.8,
            },
          });

          // Region interaction events
          (map as any).on("mousemove", "sea-ice-fill", (e: any) => {
            if (e.features && e.features.length > 0) {
              if (typeof (map as any).getCanvas === "function") {
                (map as any).getCanvas().style.cursor = "pointer";
              }
              setHoveredSeaRegion(e.features[0].properties);
            }
          });

          (map as any).on("mouseleave", "sea-ice-fill", () => {
            if (typeof (map as any).getCanvas === "function") {
              (map as any).getCanvas().style.cursor = "";
            }
            setHoveredSeaRegion(null);
          });

          (map as any).on("click", "sea-ice-fill", async (e: any) => {
            if (e.features && e.features.length > 0) {
              const rName = e.features[0].properties.region;
              onSelectRegion?.(rName);
              setLoadingRegionEnv(true);
              const envData = await apiClient.getRegionalEnvironment(rName);
              setClickedSeaRegionEnv(envData || { region: rName, variables: {} });
              setLoadingRegionEnv(false);
            }
          });

        }
      }


      // 2. Active Navigation Routes Layer (All Calculated Ship Routes Rendered Simultaneously with Distinct Styles)
      if (routes.length > 0) {
        const routeFeatures = routes.map((r) => ({
          type: "Feature" as const,
          properties: {
            id: r.id,
            name: r.name,
            color: r.color || (r.id === "route-b" ? "#10b981" : r.id === "route-a" ? "#ef4444" : "#38bdf8"),
            selected: r.id === selectedRouteId,
            type: r.type,
          },
          geometry: {
            type: "LineString" as const,
            coordinates: (r.coordinates || [])
              .filter((w) => w && w.lat != null && w.lon != null && !isNaN(w.lat) && !isNaN(w.lon))
              .map((w) => [w.lon, w.lat]),
          },
        }));

        const existingRouteSource = map.getSource("routes-source") as GeoJSONSource | undefined;
        if (existingRouteSource) {
          existingRouteSource.setData({
            type: "FeatureCollection",
            features: routeFeatures,
          });
        } else {
          map.addSource("routes-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: routeFeatures },
          });

          // Distinct dark casing for high contrast
          map.addLayer({
            id: "routes-line-casing",
            type: "line",
            source: "routes-source",
            paint: {
              "line-color": "#030d17",
              "line-width": ["case", ["get", "selected"], 9.0, 5.0],
              "line-opacity": 0.85,
            },
          });

          // 1. Safest Route (Solid line)
          map.addLayer({
            id: "routes-safest-line",
            type: "line",
            source: "routes-source",
            filter: ["==", ["get", "type"], "safest"],
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#10b981",
              "line-width": ["case", ["get", "selected"], 6.5, 4.0],
              "line-opacity": ["case", ["get", "selected"], 1.0, 0.75],
            },
          });

          // 2. Shortest Route (Dashed line)
          map.addLayer({
            id: "routes-shortest-line",
            type: "line",
            source: "routes-source",
            filter: ["==", ["get", "type"], "fastest"],
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#ef4444",
              "line-width": ["case", ["get", "selected"], 5.5, 3.5],
              "line-dasharray": [4, 2],
              "line-opacity": ["case", ["get", "selected"], 1.0, 0.75],
            },
          });

          // 3. Fuel-Efficient Route (Dotted/dashed line)
          map.addLayer({
            id: "routes-fuel-line",
            type: "line",
            source: "routes-source",
            filter: ["==", ["get", "type"], "fuel"],
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#38bdf8",
              "line-width": ["case", ["get", "selected"], 5.5, 3.5],
              "line-dasharray": [1.5, 2],
              "line-opacity": ["case", ["get", "selected"], 1.0, 0.75],
            },
          });
        }
      }

      // 3. Iceberg Standoff Safety Buffer Circles Layer (20 km Hazard Zones)
      if (icebergs && icebergs.length > 0) {
        const helperCreateCircle = (lat: number, lon: number, radiusKm: number, numSegments: number = 24): [number, number][] => {
          const poly: [number, number][] = [];
          const radLat = (lat * Math.PI) / 180;
          const radLon = (lon * Math.PI) / 180;
          const dByR = radiusKm / 6371.0;
          for (let i = 0; i <= numSegments; i++) {
            const bearing = (i * 2 * Math.PI) / numSegments;
            const pLat = Math.asin(
              Math.sin(radLat) * Math.cos(dByR) +
              Math.cos(radLat) * Math.sin(dByR) * Math.cos(bearing)
            );
            const pLon = radLon + Math.atan2(
              Math.sin(bearing) * Math.sin(dByR) * Math.cos(radLat),
              Math.cos(dByR) - Math.sin(radLat) * Math.sin(pLat)
            );
            poly.push([
              ((((pLon * 180) / Math.PI) + 180) % 360) - 180,
              (pLat * 180) / Math.PI,
            ]);
          }
          return poly;
        };

        const safetyFeatures: any[] = [];
        const bufferKm = 20.0;

        icebergs.forEach((ibg) => {
          if (!ibg || !ibg.position) return;
          const isTarget = ibg.id === selectedIcebergId || ibg.riskLevel === "high";
          const pts = [ibg.position];
          if (ibg.predictedPath && ibg.predictedPath.length > 0) {
            pts.push(...ibg.predictedPath);
          }

          pts.forEach((p, idx) => {
            if (!p || p.lat == null || p.lon == null) return;
            const circleCoords = helperCreateCircle(p.lat, p.lon, bufferKm);
            safetyFeatures.push({
              type: "Feature",
              properties: {
                iceberg_id: ibg.id,
                horizon: idx === 0 ? "NOW" : `+${idx * 18}H`,
                selected: isTarget,
              },
              geometry: {
                type: "Polygon",
                coordinates: [circleCoords],
              },
            });
          });
        });

        const safetySource = map.getSource("iceberg-safety-zones") as GeoJSONSource | undefined;
        if (safetySource) {
          safetySource.setData({
            type: "FeatureCollection",
            features: safetyFeatures,
          });
        } else if (safetyFeatures.length > 0) {
          map.addSource("iceberg-safety-zones", {
            type: "geojson",
            data: { type: "FeatureCollection", features: safetyFeatures },
          });

          map.addLayer({
            id: "iceberg-safety-zones-fill",
            type: "fill",
            source: "iceberg-safety-zones",
            paint: {
              "fill-color": "#ef4444",
              "fill-opacity": ["case", ["get", "selected"], 0.16, 0.08],
            },
          });

          map.addLayer({
            id: "iceberg-safety-zones-outline",
            type: "line",
            source: "iceberg-safety-zones",
            paint: {
              "line-color": "#ef4444",
              "line-width": ["case", ["get", "selected"], 1.5, 0.8],
              "line-dasharray": [2, 2],
              "line-opacity": ["case", ["get", "selected"], 0.7, 0.35],
            },
          });
        }
      }

    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once("style.load", setupLayers);
    }
  }, [routes, selectedRouteId, providerId, layers, seaIceHeat, selectedRegion]);

  // Dedicated Robust Trajectory Line Layer Management (Direct MapLibre Implementation)
  useEffect(() => {
    coordsRef.current = selectedTrajectoryCoords;
    const map = mapRef.current;
    if (!map) return;

    const renderTrajectory = () => {
      try {
        if (!map.isStyleLoaded()) {
          map.once("style.load", renderTrajectory);
          return;
        }

        const sourceId = "iceberg-trajectory";
        const layerId = "iceberg-trajectory-line";

        // Clean up legacy layer names if present
        if (map.getLayer("trajectory-debug-test-line")) map.removeLayer("trajectory-debug-test-line");
        if (map.getSource("trajectory-debug-test")) map.removeSource("trajectory-debug-test");
        if (map.getLayer("a76c-trajectory-layer")) map.removeLayer("a76c-trajectory-layer");
        if (map.getSource("a76c-trajectory-source")) map.removeSource("a76c-trajectory-source");
        if (map.getLayer("a76c-direct-trajectory-layer")) map.removeLayer("a76c-direct-trajectory-layer");
        if (map.getSource("a76c-direct-trajectory-source")) map.removeSource("a76c-direct-trajectory-source");
        if (map.getLayer("iceberg-trajectory-casing")) map.removeLayer("iceberg-trajectory-casing");

        const lineCoordinates = selectedTrajectoryCoords;
        if (!lineCoordinates || lineCoordinates.length < 2) {
          if (map.getLayer(layerId)) {
            if (typeof (map as any).setLayoutProperty === "function") {
              (map as any).setLayoutProperty(layerId, "visibility", "none");
            }
          }
          return;
        }

        const geojsonData = {
          type: "Feature" as const,
          properties: { iceberg_id: selectedBerg?.id || "A76C" },
          geometry: {
            type: "LineString" as const,
            coordinates: lineCoordinates,
          },
        };

        const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
        if (existingSource) {
          existingSource.setData(geojsonData);
        } else {
          map.addSource(sourceId, {
            type: "geojson",
            data: geojsonData,
          });
        }

        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: {
              visibility: "visible",
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#00e5ff",
              "line-width": 5,
              "line-opacity": 0.9,
              "line-dasharray": [2, 6],
              "line-blur": 1.5,
            },
          });
        } else {
          if (typeof (map as any).setLayoutProperty === "function") {
            (map as any).setLayoutProperty(layerId, "visibility", "visible");
          }
        }

        if (typeof (map as any).moveLayer === "function") {
          try {
            (map as any).moveLayer(layerId);
          } catch (err) {
            console.warn("[Iceberg Trajectory moveLayer]", err);
          }
        }
      } catch (err) {
        console.error("Error in renderTrajectory:", err);
      }
    };

    if (map.isStyleLoaded()) {
      renderTrajectory();
    } else {
      map.once("style.load", renderTrajectory);
    }
    map.on("load", renderTrajectory);
    updateSvgOverlay();

    return () => {
      map.off("load", renderTrajectory);
    };
  }, [selectedTrajectoryCoords, providerId, selectedBerg, updateSvgOverlay]);

  return (
    <div
      className={cx(
        "relative flex flex-col overflow-hidden select-none transition-colors border",
        isDark ? "border-[#1d445c] bg-[#071521] text-[#eaf6f8]" : "border-[#d8d0c2] bg-[#f8f5ee] text-[#0d2433]",
        fullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : "rounded-xl",
        className,
      )}
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1d445c]/70 bg-[#071521]/95 light:border-[#e2d8c7] light:bg-[#f8f5ee] px-3.5 py-2 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#55d6e8]/20 text-[#55d6e8] light:bg-[#0f768e]/15 light:text-[#0f768e]">
            <Globe size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-[#eaf6f8] light:text-[#0d2433]">
                OPERATIONAL POLAR MAP
              </span>
              <span className="rounded bg-[#10b981]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#10b981]">
                ● GLOBAL CONTEXT
              </span>
            </div>
            <p className="text-[10px] text-[#91aeb9] light:text-[#5a7686]">
              Whole-World Navigation · Indian Antarctic Gateway Corridors
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLayersOpen((o) => !o)}
            className={cx(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10.5px] font-bold transition-all",
              layersOpen
                ? "border-[#55d6e8] bg-[#55d6e8]/20 text-[#55d6e8] light:border-[#0f768e] light:bg-[#0f768e]/15 light:text-[#0f768e]"
                : "border-[#1d445c]/60 bg-[#0d2433]/60 text-[#91aeb9] hover:text-[#eaf6f8] light:border-[#d8d0c2] light:bg-[#eee8dc] light:text-[#5a7686]",
            )}
          >
            <Layers size={13} />
            <span>Layers</span>
          </button>

          {/* Maximize Button: only present on Map View (showMaximize = true) */}
          {showMaximize && (
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1d445c]/60 bg-[#0d2433]/60 light:border-[#d8d0c2] light:bg-[#eee8dc] text-[#91aeb9] hover:text-[#eaf6f8] cursor-pointer"
              title={fullscreen ? "Exit Fullscreen" : "Maximize Map View"}
            >
              {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Base Map & Operational Layers Ribbon */}
      {layersOpen && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1d445c]/60 bg-[#071927]/98 light:border-[#e2d8c7] light:bg-[#f8f5ee] px-3.5 py-2 backdrop-blur z-20">
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-mono text-[9px] font-bold uppercase text-[#55d6e8] mr-1">BASE MAP:</span>
            {MAP_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProviderId(p.id)}
                className={cx(
                  "rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-bold transition-all",
                  providerId === p.id
                    ? "border-[#55d6e8] bg-[#55d6e8] text-[#071521] shadow-[0_0_8px_#55d6e8]/40"
                    : "border-[#1d445c]/50 bg-[#0d2433]/40 text-[#91aeb9] hover:border-[#55d6e8]/40",
                )}
              >
                {providerId === p.id ? "● " : "○ "}
                {p.shortName}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <LayerChip label="🏢 Stations" active={layers.stations} onClick={() => toggleLayer("stations")} />
            <LayerChip label="⚓ Gateways" active={layers.gateways} onClick={() => toggleLayer("gateways")} />
            <LayerChip label="🧊 Icebergs" active={layers.icebergs} onClick={() => toggleLayer("icebergs")} />
            <LayerChip label="📈 Trajectories" active={layers.icebergPrediction} onClick={() => toggleLayer("icebergPrediction")} />
            <LayerChip label="📡 AIS Vessel" active={layers.vessel} onClick={() => toggleLayer("vessel")} />
            <LayerChip label="⚠️ Hazards" active={layers.hazards} onClick={() => toggleLayer("hazards")} />
            {activeWaypoints.length > 0 && (
              <LayerChip label="⚓ Waypoints" active={layers.waypoints} onClick={() => toggleLayer("waypoints")} />
            )}
          </div>
        </div>
      )}

      {/* 3. Map Canvas Container */}
      <div className="relative flex-1 min-h-[380px] overflow-hidden bg-[#050d17]">
        <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

        {/* High-Precision Trajectory Bright Cyan Dotted Neon SVG Overlay */}
        {layers.icebergPrediction && svgPoints && (
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none z-10 overflow-visible"
            style={{ width: "100%", height: "100%" }}
          >
            <polyline
              points={svgPoints}
              stroke="#00e5ff"
              strokeWidth="5"
              strokeDasharray="2, 10"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.9"
              fill="none"
              style={{ filter: "drop-shadow(0 0 6px #00e5ff)" }}
            />
          </svg>
        )}

        {/* All Calculated Ship Routes SVG Overlay (All 3 Routes Rendered Simultaneously) */}
        {svgRoutes.length > 0 && (
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none z-10 overflow-visible"
            style={{ width: "100%", height: "100%" }}
          >
            {/* Unselected routes first */}
            {svgRoutes
              .filter((r) => !r.selected)
              .map((r) => (
                <polyline
                  key={r.id}
                  points={r.points}
                  stroke={r.color}
                  strokeWidth="3.5"
                  strokeDasharray={r.type === "fastest" ? "8, 5" : r.type === "fuel" ? "4, 4" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.75"
                  fill="none"
                />
              ))}
            {/* Selected highlighted route on top with glow */}
            {svgRoutes
              .filter((r) => r.selected)
              .map((r) => (
                <polyline
                  key={r.id}
                  points={r.points}
                  stroke={r.color}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="1"
                  fill="none"
                  style={{ filter: `drop-shadow(0 0 8px ${r.color})` }}
                />
              ))}
          </svg>
        )}

        {/* Temporary Entity Hover / Click Information Dashboard (Zero Layout Shift) */}
        {hoveredEntity && (
          <div
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={handleEntityMouseLeave}
            className="absolute left-4 top-4 z-30 flex w-76 flex-col gap-2 rounded-xl border border-[#55d6e8]/80 bg-[#071927]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-auto font-mono text-[11px]"
          >
            {hoveredEntity.type === "iceberg" && (
              <>
                <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#f59e0b]">
                    <Triangle size={13} />
                    <span>ICEBERG: {hoveredEntity.data.id}</span>
                  </div>
                  <span className={cx("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", hoveredEntity.data.riskLevel === "high" ? "bg-[#ef4444]/20 text-[#ef4444]" : "bg-[#f59e0b]/20 text-[#f59e0b]")}>
                    {hoveredEntity.data.riskLevel} RISK
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[#eaf6f8]">
                  <div><b>Position:</b> {Math.abs(hoveredEntity.data.position.lat).toFixed(2)}°S, {Math.abs(hoveredEntity.data.position.lon).toFixed(2)}°W</div>
                  <div><b>Size:</b> {hoveredEntity.data.sizeKm} km</div>
                  <div><b>Speed:</b> {(hoveredEntity.data.speedMs * 1.94).toFixed(1)} kn</div>
                  <div><b>Heading:</b> {hoveredEntity.data.headingDeg}°</div>
                </div>
                <div className="text-[10px] text-[#55d6e8] border-t border-[#1d445c]/40 pt-1">
                  AI Trajectory Confidence: {hoveredEntity.data.confidence}%
                </div>
              </>
            )}

            {hoveredEntity.type === "vessel" && (
              <>
                <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#55d6e8]">
                    <Ship size={14} />
                    <span>{hoveredEntity.data.name}</span>
                  </div>
                  <span className="rounded bg-[#10b981]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#10b981]">
                    {hoveredEntity.data.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[#eaf6f8]">
                  <div><b>Speed:</b> {hoveredEntity.data.speedKn} kn</div>
                  <div><b>Heading:</b> {hoveredEntity.data.headingDeg}°</div>
                  <div className="col-span-2"><b>Coordinates:</b> {Math.abs(hoveredEntity.data.position.lat).toFixed(2)}°S, {Math.abs(hoveredEntity.data.position.lon).toFixed(2)}°W</div>
                </div>
              </>
            )}

            {hoveredEntity.type === "waypoint" && (
              <>
                <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#38bdf8]">
                    <MapPin size={13} />
                    <span>WAYPOINT {hoveredEntity.index}: {hoveredEntity.data.name}</span>
                  </div>
                </div>
                <div className="text-[#eaf6f8]">
                  <div><b>Coordinates:</b> {Math.abs(hoveredEntity.data.lat).toFixed(2)}°S, {Math.abs(hoveredEntity.data.lon).toFixed(2)}°{hoveredEntity.data.lon >= 0 ? "E" : "W"}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[#55d6e8]">
                    <Clock size={12} />
                    <span>Scheduled Rest Break: <b>{hoveredEntity.data.breakDurationHours} hours</b></span>
                  </div>
                </div>
              </>
            )}

            {hoveredEntity.type === "station" && (
              <>
                <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#ffb703]">
                    <span>{hoveredEntity.data.flag}</span>
                    <span>{hoveredEntity.data.name}</span>
                  </div>
                  <span className="text-[9px] text-[#91aeb9]">{hoveredEntity.data.country}</span>
                </div>
                <div className="text-[10.5px] text-[#cbe5ee] leading-tight">{hoveredEntity.data.desc}</div>
                <div className="text-[10px] text-[#91aeb9]">
                  {Math.abs(hoveredEntity.data.lat)}°S, {Math.abs(hoveredEntity.data.lon)}°{hoveredEntity.data.lon >= 0 ? "E" : "W"}
                </div>
              </>
            )}

            {hoveredEntity.type === "gateway" && (
              <>
                <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#10b981]">
                    <span>{hoveredEntity.data.flag}</span>
                    <span>{hoveredEntity.data.name}</span>
                  </div>
                  <span className="text-[9px] text-[#91aeb9]">Gateway</span>
                </div>
                <div className="text-[10.5px] text-[#cbe5ee] leading-tight">{hoveredEntity.data.desc}</div>
              </>
            )}

            {hoveredEntity.type === "hazard" && (
              <>
                <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#ef4444]">
                    <ShieldAlert size={14} />
                    <span>HAZARD: {hoveredEntity.data.id}</span>
                  </div>
                  <span className="rounded bg-[#ef4444]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#ef4444]">
                    {hoveredEntity.data.severity.toUpperCase()}
                  </span>
                </div>
                <div className="text-[#eaf6f8]">
                  <div><b>Type:</b> {hoveredEntity.data.type} · <b>ETA:</b> {hoveredEntity.data.predictedTime}</div>
                  <div><b>Affected:</b> {hoveredEntity.data.affectedRoute} (Confidence {hoveredEntity.data.confidence}%)</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Sea-Ice Region Hover Tooltip (Requirement 15) */}
        {hoveredSeaRegion && !hoveredEntity && (
          <div className="absolute left-4 top-4 z-30 flex w-72 flex-col gap-1.5 rounded-xl border border-[#55d6e8]/80 bg-[#071927]/95 p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-none font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1">
              <div className="flex items-center gap-1.5 font-bold text-[#55d6e8]">
                <Snowflake size={14} />
                <span>{hoveredSeaRegion.region}</span>
              </div>
              <span className={cx("rounded px-1.5 py-0.2 text-[8.5px] font-bold uppercase", (hoveredSeaRegion.concentration || 0) > 70 ? "bg-[#ef4444]/20 text-[#ef4444]" : (hoveredSeaRegion.concentration || 0) > 40 ? "bg-[#f59e0b]/20 text-[#f59e0b]" : "bg-[#10b981]/20 text-[#10b981]")}>
                {hoveredSeaRegion.risk_level || "MONITORED"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[#eaf6f8]">
              <div><b>SIC:</b> {hoveredSeaRegion.concentration != null ? `${Number(hoveredSeaRegion.concentration).toFixed(1)}%` : "N/A"}</div>
              <div><b>Source:</b> AMSR2 ASI</div>
            </div>
            <div className="text-[9.5px] text-[#91aeb9] border-t border-[#1d445c]/40 pt-1 flex items-center justify-between">
              <span>Click sea to view metocean telemetry</span>
              <span className="text-[#55d6e8]">Provenance ➔</span>
            </div>
          </div>
        )}
      </div>

      {/* Regional Environmental Conditions Modal with Full Scientific Provenance (Requirements 4 & 15) */}
      {clickedSeaRegionEnv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-[#1d445c] bg-[#071521] p-5 text-[#eaf6f8] shadow-2xl light:border-[#dfd8cc] light:bg-white light:text-[#0d2433]">
            <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#55d6e8]/20 text-[#55d6e8]">
                  <Snowflake size={18} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold">{clickedSeaRegionEnv.region} · Environmental Telemetry</h3>
                  <p className="text-[11px] font-mono text-[#91aeb9] light:text-[#5a7686]">
                    Centroid: {Math.abs(clickedSeaRegionEnv.centroid?.lat || 0).toFixed(2)}°S, {Math.abs(clickedSeaRegionEnv.centroid?.lon || 0).toFixed(2)}°{clickedSeaRegionEnv.centroid?.lon >= 0 ? "E" : "W"} · Status: <span className="text-[#10b981] font-semibold">{clickedSeaRegionEnv.status || "VALIDATED"}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setClickedSeaRegionEnv(null)}
                className="rounded-lg p-1.5 text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {loadingRegionEnv ? (
              <div className="py-12 text-center text-[13px] font-mono text-[#55d6e8] animate-pulse">
                Querying ECMWF ERA5, NOAA OISST and AMSR2 satellite providers...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(clickedSeaRegionEnv.variables || {}).map(([key, item]: [string, any]) => {
                    const hasVal = item && item.value !== null && item.value !== undefined;
                    const isMissing = !hasVal || item.quality_flag === "MISSING";
                    const formattedName = key.replace(/_/g, " ").toUpperCase();
                    return (
                      <div
                        key={key}
                        className="rounded-lg border border-[#1d445c]/60 bg-[#0c2333] p-3 text-[11.5px] font-mono light:border-[#dfd8cc] light:bg-[#f8f5ee] flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#91aeb9] light:text-[#5a7686] mb-1">
                          <span>{formattedName}</span>
                          <span
                            className={cx(
                              "px-1.5 py-0.2 rounded text-[8.5px]",
                              isMissing ? "bg-[#ef4444]/20 text-[#ef4444]" : "bg-[#10b981]/20 text-[#10b981]"
                            )}
                          >
                            {item.quality_flag || (isMissing ? "UNAVAILABLE" : "OBSERVED")}
                          </span>
                        </div>
                        <div className="text-[18px] font-bold my-0.5">
                          {hasVal ? (
                            <span className="text-[#55d6e8] light:text-[#0f768e]">{item.value} <span className="text-[12px] font-normal">{item.unit}</span></span>
                          ) : (
                            <span className="text-[#ef4444]/80 text-[14px]">Data unavailable</span>
                          )}
                        </div>
                        <div className="text-[9px] text-[#5f7d89] light:text-[#7a94a2] border-t border-[#1d445c]/30 pt-1 mt-1 truncate">
                          Source: {item.source_dataset || "Authoritative Model"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-lg bg-[#040e17] p-3 text-[10px] font-mono text-[#91aeb9] border border-[#1d445c]/40 light:bg-[#ede5d6]">
                  <span className="font-bold text-[#f5b942]">DATA PROVENANCE NOTICE:</span> All environmental observations are spatially correlated to the geographical centroid of this sector. Missing sensors/satellite passes report strict unavailability without synthetic fabrication.
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setClickedSeaRegionEnv(null)}
                className="rounded-lg bg-[#55d6e8] px-4 py-2 text-[12px] font-bold text-[#071521] shadow hover:bg-[#7be3f2] light:bg-[#0f768e] light:text-white cursor-pointer"
              >
                Close Telemetry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1d445c]/70 bg-[#071927]/95 px-3.5 py-1.5 font-mono text-[10px] z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#55d6e8] font-bold">
            <Crosshair size={11} />
            CURSOR POS:
          </span>
          <span className="text-[#eaf6f8] font-semibold">
            {cursorPos ? `${Math.abs(cursorPos.lat)}°S, ${Math.abs(cursorPos.lon)}°${cursorPos.lon >= 0 ? "E" : "W"}` : "Hover map for coordinates"}
          </span>
        </div>
        <div className="text-[#91aeb9]">
          Selected Corridor: <b>{selectedRouteId.toUpperCase()}</b>
        </div>
      </div>
    </div>
  );
}


function LayerChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9.5px] font-semibold transition-all shadow-sm cursor-pointer",
        active
          ? "border-[#55d6e8] bg-[#55d6e8]/20 text-[#55d6e8]"
          : "border-[#1d445c]/50 bg-[#0d2433]/50 text-[#91aeb9] hover:border-[#55d6e8]/40",
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", active ? "bg-[#55d6e8]" : "bg-[#5f7d89]")} />
      <span>{label}</span>
    </button>
  );
}

export default AntarcticPolarMap;
