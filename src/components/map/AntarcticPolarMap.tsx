import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { type Map as MapLibreInstance, type Marker as MapLibreMarker } from "maplibre-gl";
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
import { useNav, type OperationalWaypoint } from "../../state";

// ---------------------------------------------------------------------------
// Reliable Base Map Providers
// ---------------------------------------------------------------------------
export type MapTileProviderId = "esri-satellite" | "osm" | "carto-dark";

export interface MapTileProvider {
  id: MapTileProviderId;
  name: string;
  shortName: string;
  tileUrl: string;
  tileSize: number;
  maxZoom: number;
  attribution: string;
}

export const MAP_PROVIDERS: MapTileProvider[] = [
  {
    id: "esri-satellite",
    name: "ESRI Satellite",
    shortName: "ESRI Satellite",
    tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    tileSize: 256,
    maxZoom: 19,
    attribution: "© ESRI, Maxar, Earthstar Geographics",
  },
  {
    id: "osm",
    name: "OpenStreetMap",
    shortName: "OpenStreetMap",
    tileUrl: "https://tile.openstreetmap.org/{z}/{y}/{x}.png",
    tileSize: 256,
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  },
  {
    id: "carto-dark",
    name: "Nautical Dark",
    shortName: "Nautical Dark",
    tileUrl: "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png",
    tileSize: 512,
    maxZoom: 19,
    attribution: "© CartoDB, OpenStreetMap contributors",
  },
];

export function getSectorName(lat: number, lon: number): string {
  if (lat > -40) return "Sub-Tropical Maritime Gateway Zone";
  if (lat > -50) return "Roaring Forties · Southern Ocean";
  if (lat > -60) return "Furious Fifties · Antarctic Circumpolar Current";
  if (lon >= -75 && lon <= -20) return "Weddell Sea Sector · Antarctic Peninsula";
  if (lon >= -150 && lon < -75) return "Bellingshausen & Amundsen Sea Sector";
  if (lon >= 150 || lon < -150) return "Ross Sea & Victoria Land Sector";
  if (lon >= 60 && lon < 150) return "East Antarctica · Wilkes & Prydz Bay";
  return "Queen Maud Land · Polar Continental Sector";
}

export interface ResearchStation {
  id: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  type: "Permanent" | "Summer" | "Historic";
  desc: string;
  isPrimary?: boolean;
}

export const RESEARCH_STATIONS: ResearchStation[] = [
  {
    id: "maitri",
    name: "Maitri Station",
    country: "India",
    flag: "🇮🇳",
    lat: -70.77,
    lon: 11.73,
    type: "Permanent",
    desc: "India's permanent polar base in the ice-free Schirmacher Oasis. Year-round glaciology, biology & atmospheric physics.",
    isPrimary: true,
  },
  {
    id: "bharati",
    name: "Bharati Station",
    country: "India",
    flag: "🇮🇳",
    lat: -69.41,
    lon: 76.19,
    type: "Permanent",
    desc: "India's state-of-the-art Antarctic research base in the Larsemann Hills, East Antarctica with high-gain satellite ground terminal.",
    isPrimary: true,
  },
  {
    id: "dakshin",
    name: "Dakshin Gangotri",
    country: "India",
    flag: "🇮🇳",
    lat: -70.08,
    lon: 12.0,
    type: "Historic",
    desc: "India's historic first Antarctic base (est. 1983), designated Antarctic historic heritage site and fuel depot.",
    isPrimary: true,
  },
  {
    id: "mcmurdo",
    name: "McMurdo Station",
    country: "USA",
    flag: "🇺🇸",
    lat: -77.85,
    lon: 166.67,
    type: "Permanent",
    desc: "The largest Antarctic science base, situated on Ross Island. Primary logistics hub for South Pole flights.",
  },
  {
    id: "halley",
    name: "Halley VI Station",
    country: "UK",
    flag: "🇬🇧",
    lat: -75.58,
    lon: -26.54,
    type: "Permanent",
    desc: "British Antarctic Survey ski-mounted modular base on the Brunt Ice Shelf. Atmospheric ozone monitoring.",
  },
  {
    id: "rothera",
    name: "Rothera Station",
    country: "UK",
    flag: "🇬🇧",
    lat: -67.57,
    lon: -68.13,
    type: "Permanent",
    desc: "British Antarctic Survey logistics hub with all-weather airstrip on Adelaide Island, Antarctic Peninsula.",
  },
  {
    id: "casey",
    name: "Casey Station",
    country: "Australia",
    flag: "🇦🇺",
    lat: -66.28,
    lon: 110.53,
    type: "Permanent",
    desc: "Australian Antarctic base in Wilkes Land with the Wilkins Aerodrome intercontinental runway.",
  },
];

export const GATEWAY_PORTS = [
  { id: "capetown", name: "Port of Cape Town", country: "South Africa", flag: "🇿🇦", lat: -33.92, lon: 18.42, desc: "Primary logistics springboard for Indian (Maitri/Bharati) and European Antarctic expeditions." },
  { id: "ushuaia", name: "Port of Ushuaia", country: "Argentina", flag: "🇦🇷", lat: -54.8, lon: -68.3, desc: "Premier gateway for Drake Passage navigation and Antarctic Peninsula scientific logistics." },
  { id: "puntaarenas", name: "Punta Arenas", country: "Chile", flag: "🇨🇱", lat: -53.16, lon: -70.91, desc: "Chilean Antarctic hub and DAP Antarctic flight logistics base." },
  { id: "hobart", name: "Port of Hobart", country: "Australia", flag: "🇦🇺", lat: -42.88, lon: 147.32, desc: "Home port of RSV Nuyina and gateway for Australian and East Antarctic research." },
];

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
  showMaximize?: boolean;
  className?: string;
  compact?: boolean;
}

export type HoveredEntity =
  | { type: "iceberg"; data: Iceberg }
  | { type: "vessel"; data: any }
  | { type: "station"; data: ResearchStation }
  | { type: "gateway"; data: typeof GATEWAY_PORTS[0] }
  | { type: "hazard"; data: Hazard }
  | { type: "waypoint"; data: OperationalWaypoint; index: number }
  | null;

export function AntarcticPolarMap({
  routes = [],
  icebergs = [],
  selectedRouteId = "route-b",
  onSelectRoute,
  selectedIcebergId,
  onSelectIceberg,
  horizonFraction = 0.001,
  vessel,
  showMaximize = false,
  className = "",
  compact = false,
}: AntarcticPolarMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const nav = useNav();
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
  const [cursorPos, setCursorPos] = useState<{ lat: number; lon: number; sector: string } | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

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

  // 1. Initialize MapLibre GL instance
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

  // Update Style on Provider Change seamlessly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(mapStyle);
  }, [mapStyle]);

  // Trigger resize when fullscreen state toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setTimeout(() => {
      map.resize();
    }, 100);
  }, [fullscreen]);

  // 2. Auto-Fit Viewport to Selected Route Coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (!selectedRoute || !selectedRoute.coordinates || selectedRoute.coordinates.length < 2) return;

    const lats = selectedRoute.coordinates.map((c) => c.lat);
    const lons = selectedRoute.coordinates.map((c) => c.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    map.fitBounds(
      [
        [minLon - 2.5, minLat - 2.5],
        [maxLon + 2.5, maxLat + 2.5],
      ],
      { padding: 60, duration: 1000 }
    );
  }, [selectedRouteId, routes]);

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
    if (layers.waypoints && nav.waypoints.length > 0) {
      nav.waypoints.forEach((wp, idx) => {
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
        const path = ibg.predictedPath || [{ lat: ibg.position.lat, lon: ibg.position.lon }];
        const stepIndex = Math.min(path.length - 1, Math.floor(horizonFraction * (path.length - 1)));
        const targetPt = path[stepIndex] || ibg.position;

        const isHigh = ibg.riskLevel === "high";
        const isSelected = ibg.id === selectedIcebergId;

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
        addMarker(targetPt.lon, targetPt.lat, el);
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
  }, [layers, vessel, icebergs, providerId, currentZoom, horizonFraction, selectedIcebergId, nav.waypoints]);

  // GeoJSON Line & Polygon Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupLayers = () => {
      // 1. Iceberg Predicted Trajectories
      if (layers.icebergPrediction && icebergs.length > 0) {
        const trajectoryFeatures = icebergs.map((ibg) => ({
          type: "Feature" as const,
          properties: { id: ibg.id, risk: ibg.riskLevel },
          geometry: {
            type: "LineString" as const,
            coordinates: (ibg.predictedPath || [ibg.position]).map((p) => [p.lon, p.lat]),
          },
        }));

        if (map.getSource("iceberg-trajectories-source")) {
          (map.getSource("iceberg-trajectories-source") as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: trajectoryFeatures,
          });
        } else {
          map.addSource("iceberg-trajectories-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: trajectoryFeatures },
          });

          map.addLayer({
            id: "iceberg-trajectories-line",
            type: "line",
            source: "iceberg-trajectories-source",
            paint: {
              "line-color": ["match", ["get", "risk"], "high", "#ef4444", "medium", "#f59e0b", "#10b981"],
              "line-width": 2,
              "line-dasharray": [4, 2],
              "line-opacity": 0.85,
            },
          });
        }
      }

      // 2. Active Navigation Routes Layer (Prominently Highlight Selected Route, Subdue Alternatives)
      if (routes.length > 0) {
        const routeFeatures = routes.map((r) => ({
          type: "Feature" as const,
          properties: { id: r.id, name: r.name, color: r.color, selected: r.id === selectedRouteId },
          geometry: {
            type: "LineString" as const,
            coordinates: r.coordinates.map((w) => [w.lon, w.lat]),
          },
        }));

        if (map.getSource("routes-source")) {
          (map.getSource("routes-source") as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: routeFeatures,
          });
        } else {
          map.addSource("routes-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: routeFeatures },
          });

          map.addLayer({
            id: "routes-line",
            type: "line",
            source: "routes-source",
            paint: {
              "line-color": ["get", "color"],
              "line-width": ["case", ["get", "selected"], 5.0, 2.2],
              "line-opacity": ["case", ["get", "selected"], 1.0, 0.45],
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
  }, [routes, selectedRouteId, providerId, layers, icebergs]);

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
            {nav.waypoints.length > 0 && (
              <LayerChip label="⚓ Waypoints" active={layers.waypoints} onClick={() => toggleLayer("waypoints")} />
            )}
          </div>
        </div>
      )}

      {/* 3. Map Canvas Container */}
      <div className="relative flex-1 min-h-[380px] overflow-hidden bg-[#050d17]">
        <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

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
      </div>

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
