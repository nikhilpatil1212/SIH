import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { type Map as MapLibreInstance, type Marker as MapLibreMarker } from "maplibre-gl";
import {
  AlertTriangle,
  Anchor,
  Compass,
  Crosshair,
  Eye,
  Globe,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Ship,
  Snowflake,
  Triangle,
  Waves,
  Wind,
  X,
} from "lucide-react";
import type { Hazard, Iceberg, Route } from "../../data/types";
import { RISK_COLORS, cx } from "../ui/primitives";
import { useTheme } from "../../theme";
import { hazards as mockHazards } from "../../data/mock";

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
    tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
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

// ---------------------------------------------------------------------------
// Geographic Utilities & Calculations
// ---------------------------------------------------------------------------
export function geoDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function geoBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

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

export function polarToXY(lat: number, lon: number): { x: number; y: number } {
  const absLat = Math.min(90, Math.max(20, Math.abs(lat)));
  const rFrac = (90 - absLat) / 65;
  const r = rFrac * 475;
  const rad = ((lon - 90) * Math.PI) / 180;
  return {
    x: +(500 + r * Math.cos(rad)).toFixed(2),
    y: +(500 + r * Math.sin(rad)).toFixed(2),
  };
}

export function xyToPolar(x: number, y: number): { lat: number; lon: number } {
  const dx = x - 500;
  const dy = y - 500;
  const r = Math.hypot(dx, dy);
  const rFrac = Math.min(1.05, r / 475);
  const lat = -(90 - rFrac * 65);
  let rad = Math.atan2(dy, dx);
  let lon = (rad * 180) / Math.PI + 90;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return { lat: +lat.toFixed(2), lon: +lon.toFixed(2) };
}

// ---------------------------------------------------------------------------
// Scientific Research Stations
// ---------------------------------------------------------------------------
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
    id: "southpole",
    name: "Amundsen-Scott South Pole",
    country: "USA",
    flag: "🇺🇸",
    lat: -90.0,
    lon: 0.0,
    type: "Permanent",
    desc: "Geographic South Pole scientific station atop the polar ice plateau. Astrophysics and atmospheric research.",
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
    id: "vostok",
    name: "Vostok Station",
    country: "Russia",
    flag: "🇷🇺",
    lat: -78.46,
    lon: 106.87,
    type: "Permanent",
    desc: "Inland plateau base above subglacial Lake Vostok. Coldest recorded ground temperature on Earth (-89.2°C).",
  },
  {
    id: "concordia",
    name: "Concordia Base",
    country: "France / Italy",
    flag: "🇪🇺",
    lat: -75.1,
    lon: 123.33,
    type: "Permanent",
    desc: "Joint French-Italian high-plateau base at Dome C. Core site for deep ice core drilling & astronomy.",
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
  {
    id: "davis",
    name: "Davis Station",
    country: "Australia",
    flag: "🇦🇺",
    lat: -68.58,
    lon: 77.97,
    type: "Permanent",
    desc: "Australian Antarctic base in the Vestfold Hills, Princess Elizabeth Land.",
  },
  {
    id: "troll",
    name: "Troll Station",
    country: "Norway",
    flag: "🇳🇴",
    lat: -72.01,
    lon: 2.53,
    type: "Permanent",
    desc: "Norwegian Polar Institute base on the nunatak of Jutulsessen in Queen Maud Land.",
  },
  {
    id: "neumayer",
    name: "Neumayer III",
    country: "Germany",
    flag: "🇩🇪",
    lat: -70.67,
    lon: -8.27,
    type: "Permanent",
    desc: "Alfred Wegener Institute hydraulic platform base on the Ekström Ice Shelf in Atka Bay.",
  },
  {
    id: "esperanza",
    name: "Esperanza Base",
    country: "Argentina",
    flag: "🇦🇷",
    lat: -63.4,
    lon: -56.99,
    type: "Permanent",
    desc: "Year-round Argentine settlement base in Hope Bay at the northern tip of the Antarctic Peninsula.",
  },
  {
    id: "zhongshan",
    name: "Zhongshan Station",
    country: "China",
    flag: "🇨🇳",
    lat: -69.37,
    lon: 76.38,
    type: "Permanent",
    desc: "Chinese research station in the Larsemann Hills, situated near India's Bharati Station.",
  },
];

// Gateway Ports
export const GATEWAY_PORTS = [
  { id: "capetown", name: "Port of Cape Town", country: "South Africa", flag: "🇿🇦", lat: -33.92, lon: 18.42, desc: "Primary logistics springboard for Indian (Maitri/Bharati) and European Antarctic expeditions." },
  { id: "ushuaia", name: "Port of Ushuaia", country: "Argentina", flag: "🇦🇷", lat: -54.8, lon: -68.3, desc: "Premier gateway for Drake Passage navigation and Antarctic Peninsula scientific logistics." },
  { id: "puntaarenas", name: "Punta Arenas", country: "Chile", flag: "🇨🇱", lat: -53.16, lon: -70.91, desc: "Chilean Antarctic hub and DAP Antarctic flight logistics base." },
  { id: "hobart", name: "Port of Hobart", country: "Australia", flag: "🇦🇺", lat: -42.88, lon: 147.32, desc: "Home port of RSV Nuyina and gateway for Australian and East Antarctic research." },
  { id: "christchurch", name: "Lyttelton / Christchurch", country: "New Zealand", flag: "🇳🇿", lat: -43.6, lon: 172.72, desc: "Historic springboard for polar exploration; principal logistics port for Ross Sea operations." },
];

// Major Corridors
export const EXPEDITION_CORRIDORS = [
  {
    id: "india-capetown-maitri",
    name: "Cape Town 🇿🇦 ➔ Maitri 🇮🇳",
    color: "#55d6e8",
    coords: [[18.42, -33.92], [15.0, -50.0], [13.0, -62.0], [11.73, -70.77]],
  },
  {
    id: "india-capetown-bharati",
    name: "Cape Town 🇿🇦 ➔ Larsemann Hills / Bharati 🇮🇳",
    color: "#10b981",
    coords: [[18.42, -33.92], [42.0, -48.0], [60.0, -58.0], [76.19, -69.41]],
  },
  {
    id: "ushuaia-peninsula",
    name: "Drake Passage: Ushuaia 🇦🇷 ➔ Antarctic Peninsula",
    color: "#f59e0b",
    coords: [[-68.3, -54.8], [-64.0, -58.5], [-58.9, -62.2], [-63.5, -64.8]],
  },
  {
    id: "hobart-casey",
    name: "Hobart 🇦🇺 ➔ Casey Station 🇦🇺",
    color: "#3b82f6",
    coords: [[147.32, -42.88], [135.0, -54.0], [120.0, -62.0], [110.53, -66.28]],
  },
];

// Sea ice concentration test polygons
const SEA_ICE_POLYGONS = [
  {
    id: "weddell-pack",
    name: "Weddell Sea Pack Ice",
    concentration: 78,
    color: "#0284c7",
    coords: [[[-60, -65], [-30, -65], [-20, -74], [-55, -76], [-60, -65]]],
  },
  {
    id: "ross-pack",
    name: "Ross Sea Marginal Ice",
    concentration: 62,
    color: "#38bdf8",
    coords: [[[160, -70], [180, -70], [-170, -75], [165, -78], [160, -70]]],
  },
  {
    id: "prydz-pack",
    name: "Prydz Bay / Larsemann Pack",
    concentration: 48,
    color: "#55d6e8",
    coords: [[[70, -65], [85, -65], [80, -70], [68, -70], [70, -65]]],
  },
  {
    id: "queen-maud-pack",
    name: "Queen Maud Land Coastal Ice",
    concentration: 70,
    color: "#0ea5e9",
    coords: [[[0, -68], [25, -68], [20, -71], [-5, -71], [0, -68]]],
  },
];

// ---------------------------------------------------------------------------
// Main Antarctic Polar Map Component
// ---------------------------------------------------------------------------
export interface AntarcticPolarMapProps {
  routes?: Route[];
  icebergs?: Iceberg[];
  selectedRouteId?: string;
  onSelectRoute?: (id: string) => void;
  selectedIcebergId?: string | null;
  onSelectIceberg?: (id: string) => void;
  horizonFraction?: number;
  seaIceHeat?: { region: string; polygon: { lat: number; lon: number }[]; concentration: number }[];
  selectedRegion?: string | null;
  onSelectRegion?: (region: string) => void;
  vessel?: {
    name: string;
    position: { lat: number; lon: number };
    headingDeg: number;
    speedKn: number;
    status: string;
  };
  onNavigateToRoute?: (routeId: string) => void;
  className?: string;
  compact?: boolean;
}

export function AntarcticPolarMap({
  routes = [],
  icebergs = [],
  selectedRouteId,
  onSelectRoute,
  selectedIcebergId,
  onSelectIceberg,
  horizonFraction = 0.001,
  vessel,
  className = "",
  compact = false,
}: AntarcticPolarMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreInstance | null>(null);

  // Active Base Map State (Defaults to ESRI Satellite)
  const [providerId, setProviderId] = useState<MapTileProviderId>("esri-satellite");
  const [fullscreen, setFullscreen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(2.3);

  // Operational Layer Visibility
  const [layers, setLayers] = useState({
    stations: true,
    gateways: true,
    corridors: true,
    icebergs: true,
    icebergPrediction: true,
    seaIce: true,
    vessel: true,
    hazards: true,
    environment: false,
  });

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Telemetry, Pins & Inspector States
  const [cursorPos, setCursorPos] = useState<{ lat: number; lon: number; sector: string } | null>(null);
  const [clickedPin, setClickedPin] = useState<{ lat: number; lon: number; sector: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedStation, setSelectedStation] = useState<ResearchStation | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);

  const activeProvider = useMemo(() => {
    return MAP_PROVIDERS.find((p) => p.id === providerId) || MAP_PROVIDERS[0];
  }, [providerId]);

  // Generate MapLibre Style Specification
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
      center: [20, -70], // Centered directly on Antarctica & Indian Stations
      zoom: 2.3,
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

    map.on("click", (e: any) => {
      const lat = +e.lngLat.lat.toFixed(4);
      const lon = +e.lngLat.lng.toFixed(4);
      setClickedPin({ lat, lon, sector: getSectorName(lat, lon) });
      setCopied(false);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Style on Provider Change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(mapStyle);
  }, [mapStyle]);

  // Markers management using MapLibre HTML Markers
  const markersRef = useRef<MapLibreMarker[]>([]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const addMarker = (lng: number, lat: number, el: HTMLElement, popupHtml?: string) => {
      const m = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]);
      if (popupHtml) {
        m.setPopup(new maplibregl.Popup({ offset: 15, className: "anm-popup" }).setHTML(popupHtml));
      }
      m.addTo(map);
      markersRef.current.push(m);
    };

    // A. Highly Visible Research Vessel Marker (SARATHI-1)
    if (layers.vessel && vessel) {
      const el = document.createElement("div");
      el.className = "relative flex flex-col items-center justify-center cursor-pointer group";
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <!-- AIS Pulse Ring -->
          <div class="absolute h-10 w-10 rounded-full bg-[#55d6e8]/40 animate-ping"></div>
          <!-- Vessel Radar Halo -->
          <div class="h-8 w-8 rounded-full bg-[#071521]/90 border-2 border-[#55d6e8] flex items-center justify-center text-[#55d6e8] shadow-[0_0_16px_#55d6e8] transition-transform hover:scale-125">
            <span style="transform: rotate(${vessel.headingDeg}deg); font-size: 13px; display: inline-block; line-height: 1;">▲</span>
          </div>
        </div>
        <!-- Vessel Identifier Badge -->
        <div class="mt-1 px-2 py-0.5 rounded-md bg-[#071521]/95 border border-[#55d6e8] text-[#55d6e8] font-mono text-[9.5px] font-bold tracking-wider shadow-lg flex items-center gap-1 whitespace-nowrap">
          <span class="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
          <span>SARATHI-1</span>
        </div>
      `;

      const popupHtml = `
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <div style="display:flex; align-items:center; gap: 6px; font-weight:bold; font-size: 13px; color: #55d6e8;">
            <span>🚢</span><span>${vessel.name}</span>
          </div>
          <div style="font-size: 11px; margin-top: 3px; color: #10b981;">● Status: ${vessel.status} (Ice Class PC6)</div>
          <div style="font-size: 11px; margin-top: 2px;"><b>Heading:</b> ${vessel.headingDeg}° · <b>Speed:</b> ${vessel.speedKn} kn</div>
          <div style="font-size: 11px; margin-top: 2px;"><b>Position:</b> ${Math.abs(vessel.position.lat).toFixed(2)}°S, ${Math.abs(vessel.position.lon).toFixed(2)}°W</div>
          <div style="font-size: 10px; margin-top: 4px; color: #8ccfe0;">Active Mission: Antarctic Research & Escort</div>
        </div>
      `;
      addMarker(vessel.position.lon, vessel.position.lat, el, popupHtml);
    }

    // B. Research Stations Markers (De-cluttered by zoom level)
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
        el.innerHTML = showLabel
          ? `<span>${st.flag}</span><span>${st.name}</span>`
          : `<span>${st.flag}</span>`;

        el.onclick = (e) => {
          e.stopPropagation();
          setSelectedStation(st);
        };

        const popupHtml = `
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <div style="display:flex; align-items:center; gap: 6px; font-weight:bold; font-size: 13px; color: ${isIndian ? "#55d6e8" : "#ffb703"};">
              <span>${st.flag}</span><span>${st.name}</span>
            </div>
            <div style="font-size: 11px; margin-top: 3px; color: #91aeb9;">${st.country} · ${st.type} Base</div>
            <div style="font-size: 11px; margin-top: 2px;"><b>Coordinates:</b> ${Math.abs(st.lat)}°S, ${Math.abs(st.lon)}°${st.lon >= 0 ? "E" : "W"}</div>
            <div style="font-size: 10.5px; margin-top: 4px; color: #cbe5ee; line-height: 1.3;">${st.desc}</div>
          </div>
        `;
        addMarker(st.lon, st.lat, el, popupHtml);
      });
    }

    // C. Gateway Ports Markers
    if (layers.gateways) {
      GATEWAY_PORTS.forEach((p) => {
        const el = document.createElement("div");
        el.className = "flex items-center gap-1 cursor-pointer transition-transform hover:scale-125 px-1.5 py-0.5 rounded-full border border-[#10b981] bg-[#071521]/90 text-[#10b981] shadow-md font-mono text-[9px] font-bold";
        el.innerHTML = currentZoom >= 3 ? `<span>⚓</span><span>${p.flag}</span><span>${p.name}</span>` : `<span>⚓ ${p.flag}</span>`;

        const popupHtml = `
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <div style="display:flex; align-items:center; gap: 6px; font-weight:bold; font-size: 12px; color: #10b981;">
              <span>⚓</span><span>${p.flag}</span><span>${p.name}</span>
            </div>
            <div style="font-size: 11px; margin-top: 3px; color: #91aeb9;">${p.country} Gateway Port</div>
            <div style="font-size: 11px; margin-top: 2px;"><b>POS:</b> ${Math.abs(p.lat)}°S, ${Math.abs(p.lon)}°${p.lon >= 0 ? "E" : "W"}</div>
            <div style="font-size: 10.5px; margin-top: 4px; color: #cbe5ee;">${p.desc}</div>
          </div>
        `;
        addMarker(p.lon, p.lat, el, popupHtml);
      });
    }

    // D. Tracked Icebergs & AI Trajectory Interpolation
    if (layers.icebergs) {
      icebergs.forEach((ibg) => {
        // Calculate current position based on horizonFraction (0 to 1)
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
            ? "bg-[#ff5c5c]/20 border-[#ff5c5c] text-[#ff7070] shadow-[0_0_8px_#ff5c5c]"
            : "bg-[#f5b942]/20 border-[#f5b942] text-[#f5b942]"
        }`;
        el.innerHTML = `<span>▲</span><span>${ibg.id}</span>`;
        el.onclick = (e) => {
          e.stopPropagation();
          onSelectIceberg?.(ibg.id);
        };

        const popupHtml = `
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <div style="font-weight:bold; font-size: 12px; color: ${isHigh ? "#ff7070" : "#f5b942"};">
              ▲ ${ibg.id} (${ibg.riskLevel.toUpperCase()} COLLISION RISK)
            </div>
            <div style="font-size: 11px; margin-top: 3px;"><b>Size:</b> ${ibg.sizeKm} km · <b>Drift:</b> ${(ibg.speedMs * 1.94384).toFixed(1)} kn @ ${ibg.headingDeg}°</div>
            <div style="font-size: 11px; margin-top: 2px;"><b>Position:</b> ${Math.abs(targetPt.lat).toFixed(2)}°S, ${Math.abs(targetPt.lon).toFixed(2)}°W</div>
            <div style="font-size: 10px; margin-top: 4px; color: #55d6e8;">AI Drift Confidence: ${ibg.confidence}% (Neural Ensemble)</div>
          </div>
        `;
        addMarker(targetPt.lon, targetPt.lat, el, popupHtml);
      });
    }

    // E. Active Hazards Layer
    if (layers.hazards) {
      mockHazards.forEach((hz) => {
        // Parse coords from "66.8°S 33.1°W"
        const parts = hz.location.split(" ");
        const lat = -parseFloat(parts[0]);
        const lon = -parseFloat(parts[1]);

        if (isNaN(lat) || isNaN(lon)) return;

        const isHigh = hz.severity === "high";
        const el = document.createElement("div");
        el.className = `flex items-center gap-1 cursor-pointer transition-transform hover:scale-125 px-1.5 py-0.5 rounded-full border font-mono text-[8.5px] font-bold shadow-md ${
          isHigh
            ? "bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] shadow-[0_0_10px_#ef4444] animate-pulse"
            : "bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]"
        }`;
        el.innerHTML = `<span>⚠️</span><span>${hz.id}</span>`;
        el.onclick = (e) => {
          e.stopPropagation();
          setSelectedHazard(hz);
        };

        const popupHtml = `
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <div style="font-weight:bold; font-size: 12px; color: ${isHigh ? "#ef4444" : "#f59e0b"};">
              ⚠️ HAZARD: ${hz.id} (${hz.severity.toUpperCase()})
            </div>
            <div style="font-size: 11px; margin-top: 3px;"><b>Type:</b> ${hz.type} · <b>ETA:</b> ${hz.predictedTime}</div>
            <div style="font-size: 11px; margin-top: 2px;"><b>Affected Route:</b> ${hz.affectedRoute}</div>
            <div style="font-size: 10px; margin-top: 4px; color: #91aeb9;">AI Confidence: ${hz.confidence}%</div>
          </div>
        `;
        addMarker(lon, lat, el, popupHtml);
      });
    }

    // F. Clicked Pin Marker
    if (clickedPin) {
      const el = document.createElement("div");
      el.className = "h-5 w-5 rounded-full border-2 border-[#55d6e8] bg-[#55d6e8]/40 animate-bounce flex items-center justify-center text-[#071521] text-[10px] font-bold shadow-[0_0_12px_#55d6e8]";
      el.innerHTML = "📍";
      addMarker(clickedPin.lon, clickedPin.lat, el);
    }
  }, [layers, vessel, icebergs, clickedPin, providerId, currentZoom, horizonFraction, selectedIcebergId]);

  // GeoJSON Line & Polygon Layers (Routes, Iceberg Trajectories, Corridors, Sea Ice)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupLayers = () => {
      // 1. Iceberg Predicted Trajectories & Uncertainty Envelopes
      if (layers.icebergPrediction && icebergs.length > 0) {
        // Trajectory lines
        const trajectoryFeatures = icebergs.map((ibg) => ({
          type: "Feature" as const,
          properties: { id: ibg.id, risk: ibg.riskLevel },
          geometry: {
            type: "LineString" as const,
            coordinates: (ibg.predictedPath || [ibg.position]).map((p) => [p.lon, p.lat]),
          },
        }));

        if (!map.getSource("iceberg-trajectories-source")) {
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

      // 2. Corridors Layer
      if (layers.corridors && !map.getSource("corridors-source")) {
        const features = EXPEDITION_CORRIDORS.map((c) => ({
          type: "Feature" as const,
          properties: { id: c.id, name: c.name, color: c.color },
          geometry: {
            type: "LineString" as const,
            coordinates: c.coords,
          },
        }));

        map.addSource("corridors-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });

        map.addLayer({
          id: "corridors-line",
          type: "line",
          source: "corridors-source",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 2.5,
            "line-dasharray": [3, 2],
            "line-opacity": 0.75,
          },
        });
      }

      // 3. Active Navigation Routes Layer
      if (routes.length > 0 && !map.getSource("routes-source")) {
        const routeFeatures = routes.map((r) => ({
          type: "Feature" as const,
          properties: { id: r.id, name: r.name, color: r.color, selected: r.id === selectedRouteId },
          geometry: {
            type: "LineString" as const,
            coordinates: r.coordinates.map((w) => [w.lon, w.lat]),
          },
        }));

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
            "line-width": ["case", ["get", "selected"], 4, 2.5],
            "line-opacity": 0.95,
          },
        });
      }

      // 4. Sea Ice Polygons Layer
      if (layers.seaIce && !map.getSource("seaice-source")) {
        const seaIceFeatures = SEA_ICE_POLYGONS.map((p) => ({
          type: "Feature" as const,
          properties: { id: p.id, name: p.name, concentration: p.concentration, color: p.color },
          geometry: {
            type: "Polygon" as const,
            coordinates: p.coords,
          },
        }));

        map.addSource("seaice-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: seaIceFeatures },
        });

        map.addLayer({
          id: "seaice-fill",
          type: "fill",
          source: "seaice-source",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.35,
          },
        });

        map.addLayer({
          id: "seaice-outline",
          type: "line",
          source: "seaice-source",
          paint: {
            "line-color": "#7dd3fc",
            "line-width": 1.2,
            "line-dasharray": [4, 2],
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once("style.load", setupLayers);
    }
  }, [routes, selectedRouteId, providerId, layers, icebergs]);

  // Preset location shortcuts
  const applyLocationPreset = (preset: "pan-antarctic" | "maitri-bharati" | "ushuaia" | "capetown") => {
    const map = mapRef.current;
    if (!map) return;

    if (preset === "pan-antarctic") {
      map.flyTo({ center: [20, -72], zoom: 2.3, pitch: 0, bearing: 0 });
    } else if (preset === "maitri-bharati") {
      map.flyTo({ center: [45, -70], zoom: 4.8, pitch: 20 });
    } else if (preset === "ushuaia") {
      map.flyTo({ center: [-64, -60], zoom: 4.5, pitch: 25 });
    } else if (preset === "capetown") {
      map.flyTo({ center: [18.4, -34], zoom: 6, pitch: 15 });
    }
  };

  const copyCoordinates = () => {
    if (!clickedPin) return;
    const txt = `${Math.abs(clickedPin.lat).toFixed(4)}°S, ${Math.abs(clickedPin.lon).toFixed(4)}°${clickedPin.lon >= 0 ? "E" : "W"}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cx(
        "relative flex flex-col overflow-hidden select-none transition-colors border",
        isDark ? "border-[#1d445c] bg-[#071521] text-[#eaf6f8]" : "border-[#d8d0c2] bg-[#f8f5ee] text-[#0d2433]",
        fullscreen ? "fixed inset-0 z-50 rounded-none" : "rounded-xl",
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
                ● AIS LIVE
              </span>
            </div>
            <p className="text-[10px] text-[#91aeb9] light:text-[#5a7686]">
              RV Polar Star (SARATHI-1) · Route B Active · Click anywhere for coordinates
            </p>
          </div>
        </div>

        {/* Location Presets & Controls */}
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center rounded-lg border border-[#1d445c]/60 bg-[#0d2433]/60 light:border-[#d8d0c2] light:bg-[#eee8dc] p-0.5">
            <button
              onClick={() => applyLocationPreset("pan-antarctic")}
              className="rounded px-2 py-1 font-mono text-[10px] font-bold text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686]"
            >
              Pan-Antarctic
            </button>
            <button
              onClick={() => applyLocationPreset("maitri-bharati")}
              className="rounded px-2 py-1 font-mono text-[10px] font-bold text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686]"
            >
              🇮🇳 Maitri & Bharati
            </button>
            <button
              onClick={() => applyLocationPreset("ushuaia")}
              className="rounded px-2 py-1 font-mono text-[10px] font-bold text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686]"
            >
              Drake Passage
            </button>
            <button
              onClick={() => applyLocationPreset("capetown")}
              className="rounded px-2 py-1 font-mono text-[10px] font-bold text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686]"
            >
              Cape Town
            </button>
          </div>

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

          <button
            onClick={() => setFullscreen((f) => !f)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1d445c]/60 bg-[#0d2433]/60 light:border-[#d8d0c2] light:bg-[#eee8dc] text-[#91aeb9] hover:text-[#eaf6f8]"
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* 2. Top Horizontal Base Map & Operational Layers Ribbon */}
      {layersOpen && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1d445c]/60 bg-[#071927]/98 light:border-[#e2d8c7] light:bg-[#f8f5ee] px-3.5 py-2 backdrop-blur z-20 animate-in slide-in-from-top-1">
          {/* Base Map Selector */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-mono text-[9px] font-bold uppercase text-[#55d6e8] light:text-[#0f768e] mr-1">
              BASE MAP:
            </span>
            {MAP_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProviderId(p.id)}
                className={cx(
                  "rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-bold transition-all",
                  providerId === p.id
                    ? "border-[#55d6e8] bg-[#55d6e8] text-[#071521] shadow-[0_0_8px_#55d6e8]/40 light:bg-[#0f768e] light:text-white"
                    : "border-[#1d445c]/50 bg-[#0d2433]/40 text-[#91aeb9] hover:border-[#55d6e8]/40 hover:text-[#eaf6f8] light:border-[#d8d0c2] light:bg-[#eee8dc] light:text-[#5a7686]",
                )}
              >
                {providerId === p.id ? "● " : "○ "}
                {p.shortName}
              </button>
            ))}
          </div>

          {/* Operational Layer Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] font-bold uppercase text-[#8ccfe0] light:text-[#5a7686] mr-0.5">
              OPERATIONAL LAYERS:
            </span>
            <LayerChip label="🏢 Research Stations" active={layers.stations} onClick={() => toggleLayer("stations")} />
            <LayerChip label="⚓ Gateway Ports" active={layers.gateways} onClick={() => toggleLayer("gateways")} />
            <LayerChip label="🚢 Corridors & Routes" active={layers.corridors} onClick={() => toggleLayer("corridors")} />
            <LayerChip label="🧊 Tracked Icebergs" active={layers.icebergs} onClick={() => toggleLayer("icebergs")} />
            <LayerChip label="📈 Iceberg Prediction" active={layers.icebergPrediction} onClick={() => toggleLayer("icebergPrediction")} />
            <LayerChip label="❄️ Sea Ice" active={layers.seaIce} onClick={() => toggleLayer("seaIce")} />
            <LayerChip label="📡 Live AIS Vessel" active={layers.vessel} onClick={() => toggleLayer("vessel")} />
            <LayerChip label="⚠️ Hazards" active={layers.hazards} onClick={() => toggleLayer("hazards")} />
          </div>
        </div>
      )}

      {/* 3. Map Canvas Container */}
      <div className="relative flex-1 min-h-[380px] overflow-hidden bg-[#050d17]">
        <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

        {/* Clicked Pin Coordinates Inspector Card */}
        {clickedPin && (
          <div className="absolute left-4 top-4 z-30 flex w-72 flex-col gap-1.5 rounded-xl border border-[#55d6e8]/80 bg-[#071927]/95 p-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-left-2">
            <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1.5">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#55d6e8]">
                <Crosshair size={13} />
                <span>INSPECTED COORDINATES</span>
              </div>
              <button
                onClick={() => setClickedPin(null)}
                className="text-[#91aeb9] hover:text-[#eaf6f8]"
              >
                <X size={13} />
              </button>
            </div>

            <div className="flex items-center justify-between font-mono text-[12px] font-bold text-[#eaf6f8]">
              <span>{Math.abs(clickedPin.lat).toFixed(4)}°S, {Math.abs(clickedPin.lon).toFixed(4)}°{clickedPin.lon >= 0 ? "E" : "W"}</span>
              <button
                onClick={copyCoordinates}
                className="flex items-center gap-1 rounded bg-[#55d6e8]/20 px-2 py-0.5 text-[10px] text-[#55d6e8] hover:bg-[#55d6e8] hover:text-[#071521] transition-colors"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <div className="text-[10px] text-[#91aeb9]">
              <b>Sector:</b> {clickedPin.sector}
            </div>

            {vessel && (
              <div className="border-t border-[#1d445c]/40 pt-1 text-[10px] text-[#8ccfe0]">
                <b>Distance from SARATHI-1:</b> {geoDistanceNm(vessel.position.lat, vessel.position.lon, clickedPin.lat, clickedPin.lon)} nm · Bearing: {geoBearingDeg(vessel.position.lat, vessel.position.lon, clickedPin.lat, clickedPin.lon)}°
              </div>
            )}
          </div>
        )}

        {/* Selected Hazard Contextual Panel */}
        {selectedHazard && (
          <div className="absolute right-4 top-4 z-30 flex w-80 flex-col gap-2 rounded-xl border border-[#ef4444]/80 bg-[#071927]/98 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-2 font-mono">
            <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-2">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#ef4444]">
                <ShieldAlert size={15} />
                <span>HAZARD ALERT: {selectedHazard.id}</span>
              </div>
              <button onClick={() => setSelectedHazard(null)} className="text-[#91aeb9] hover:text-[#eaf6f8]">
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
              <div>
                <span className="text-[#91aeb9]">Risk Level:</span>{" "}
                <b className={selectedHazard.severity === "high" ? "text-[#ef4444]" : "text-[#f59e0b]"}>
                  {selectedHazard.severity.toUpperCase()}
                </b>
              </div>
              <div>
                <span className="text-[#91aeb9]">Encounter ETA:</span> <b>{selectedHazard.predictedTime}</b>
              </div>
              <div>
                <span className="text-[#91aeb9]">Affected Route:</span> <b>{selectedHazard.affectedRoute}</b>
              </div>
              <div>
                <span className="text-[#91aeb9]">Confidence:</span> <b>{selectedHazard.confidence}%</b>
              </div>
            </div>

            <div className="border-t border-[#1d445c]/60 pt-2 text-[10px] text-[#cbe5ee]">
              <div className="font-bold text-[#55d6e8] mb-0.5">Recommended AI Action:</div>
              {selectedHazard.affectedRoute === "Route A"
                ? "Execute immediate lateral reroute to Route B. Avoids tabular iceberg interception corridor."
                : "Maintain radar watch and reduce speed to 10 kn in marginal pack-ice zone."}
            </div>
          </div>
        )}

        {/* Selected Research Station Modal */}
        {selectedStation && (
          <div className="absolute right-4 top-4 z-30 flex w-80 flex-col gap-2 rounded-xl border border-[#55d6e8]/80 bg-[#071927]/98 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-2">
            <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-2">
              <div className="flex items-center gap-2 font-mono text-[13px] font-bold text-[#55d6e8]">
                <span>{selectedStation.flag}</span>
                <span>{selectedStation.name}</span>
              </div>
              <button onClick={() => setSelectedStation(null)} className="text-[#91aeb9] hover:text-[#eaf6f8]">
                <X size={14} />
              </button>
            </div>

            <div className="text-[11px] text-[#cbe5ee] leading-relaxed">
              {selectedStation.desc}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-[#1d445c]/60 pt-2 font-mono text-[10.5px]">
              <div>
                <span className="text-[#91aeb9]">Country:</span> <b>{selectedStation.country}</b>
              </div>
              <div>
                <span className="text-[#91aeb9]">Type:</span> <b>{selectedStation.type}</b>
              </div>
              <div className="col-span-2">
                <span className="text-[#91aeb9]">Coordinates:</span> <b>{Math.abs(selectedStation.lat)}°S, {Math.abs(selectedStation.lon)}°{selectedStation.lon >= 0 ? "E" : "W"}</b>
              </div>
            </div>

            <div className="mt-1 flex justify-end">
              <button
                onClick={() => {
                  mapRef.current?.flyTo({ center: [selectedStation.lon, selectedStation.lat], zoom: 6.5 });
                }}
                className="rounded-lg bg-[#55d6e8] px-3 py-1 text-[11px] font-bold text-[#071521] hover:bg-[#7be3f2] transition-colors"
              >
                Zoom to Base
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Telemetry & Real-Time Coordinates HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1d445c]/70 bg-[#071927]/95 light:border-[#e2d8c7] light:bg-[#f8f5ee] px-3.5 py-1.5 font-mono text-[10px] z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#55d6e8] light:text-[#0f768e] font-bold">
            <Crosshair size={11} />
            CURSOR POS:
          </span>
          <span className="text-[#eaf6f8] light:text-[#0d2433] font-semibold">
            {cursorPos ? `${Math.abs(cursorPos.lat)}°S, ${Math.abs(cursorPos.lon)}°${cursorPos.lon >= 0 ? "E" : "W"}` : "Hover map for coordinates"}
          </span>
          {cursorPos && (
            <span className="hidden md:inline text-[#91aeb9] light:text-[#5a7686]">
              · Sector: {cursorPos.sector}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[#91aeb9] light:text-[#5a7686]">
          {vessel && (
            <span>
              <b>SARATHI-1:</b> {vessel.speedKn} kn @ {vessel.headingDeg}° (PC6 Polar Research)
            </span>
          )}
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
        "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9.5px] font-semibold transition-all shadow-sm",
        active
          ? "border-[#55d6e8] bg-[#55d6e8]/20 text-[#55d6e8] light:border-[#0f768e] light:bg-[#0f768e]/15 light:text-[#0f768e]"
          : "border-[#1d445c]/50 bg-[#0d2433]/50 text-[#91aeb9] hover:border-[#55d6e8]/40 hover:text-[#eaf6f8] light:border-[#d8d0c2] light:bg-[#eee8dc]/70 light:text-[#5a7686]",
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full transition-colors", active ? "bg-[#55d6e8] light:bg-[#0f768e] shadow-[0_0_6px_#55d6e8]" : "bg-[#5f7d89]")} />
      <span>{label}</span>
    </button>
  );
}

export default AntarcticPolarMap;
