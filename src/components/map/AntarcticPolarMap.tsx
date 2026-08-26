import { useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Compass,
  Eye,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Navigation,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Ship,
  Snowflake,
  Triangle,
  Waves,
  Wind,
  X,
} from "lucide-react";
import type { Iceberg, Route } from "../../data/types";
import { RISK_COLORS, cx } from "../ui/primitives";
import { smoothPath, corridorPath, slicePath, seaIceColor } from "./geo";
import { useTheme } from "../../theme";

// Polar Projection Constants
const MAP_CX = 500;
const MAP_CY = 500;
const MAX_RADIUS = 420; // 60°S latitude ring radius

/** Convert Geographic Lat/Lon to Polar Stereographic Cartographic Screen Coordinates */
export function polarToXY(lat: number, lon: number): { x: number; y: number } {
  const absLat = Math.min(90, Math.max(55, Math.abs(lat)));
  const rFrac = (90 - absLat) / 30; // 90°S -> 0, 60°S -> 1.0
  const r = rFrac * MAX_RADIUS;
  const rad = ((lon - 90) * Math.PI) / 180;
  return {
    x: +(MAP_CX + r * Math.cos(rad)).toFixed(2),
    y: +(MAP_CY + r * Math.sin(rad)).toFixed(2),
  };
}

/** Convert Screen Coordinates back to Geographic Lat/Lon */
export function xyToPolar(x: number, y: number): { lat: number; lon: number } {
  const dx = x - MAP_CX;
  const dy = y - MAP_CY;
  const r = Math.hypot(dx, dy);
  const rFrac = Math.min(1.2, r / MAX_RADIUS);
  const lat = -(90 - rFrac * 30);
  let rad = Math.atan2(dy, dx);
  let lon = (rad * 180) / Math.PI + 90;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return { lat: +lat.toFixed(2), lon: +lon.toFixed(2) };
}

// Research Stations
export interface ResearchStation {
  id: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  type: "Permanent" | "Summer" | "Historic";
  desc: string;
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
    desc: "India's second permanent Antarctic research base, located in the Schirmacher Oasis.",
  },
  {
    id: "bharati",
    name: "Bharati Station",
    country: "India",
    flag: "🇮🇳",
    lat: -69.41,
    lon: 76.19,
    type: "Permanent",
    desc: "India's modern energy-efficient polar station in Larsemann Hills, East Antarctica.",
  },
  {
    id: "dakshin",
    name: "Dakshin Gangotri",
    country: "India",
    flag: "🇮🇳",
    lat: -70.08,
    lon: 12.0,
    type: "Historic",
    desc: "India's historic first Antarctic scientific base (established 1983), now a heritage site.",
  },
  {
    id: "mcmurdo",
    name: "McMurdo Station",
    country: "USA",
    flag: "🇺🇸",
    lat: -77.85,
    lon: 166.67,
    type: "Permanent",
    desc: "Largest Antarctic science community station on Ross Island.",
  },
  {
    id: "southpole",
    name: "Amundsen-Scott South Pole",
    country: "USA",
    flag: "🇺🇸",
    lat: -90.0,
    lon: 0.0,
    type: "Permanent",
    desc: "Geographic South Pole atmospheric and astrophysical observatory.",
  },
  {
    id: "halley",
    name: "Halley VI Station",
    country: "UK",
    flag: "🇬🇧",
    lat: -75.58,
    lon: -26.54,
    type: "Permanent",
    desc: "Relocatable modular atmospheric research station on the Brunt Ice Shelf.",
  },
  {
    id: "rothera",
    name: "Rothera Research Station",
    country: "UK",
    flag: "🇬🇧",
    lat: -67.57,
    lon: -68.13,
    type: "Permanent",
    desc: "British Antarctic Survey logistics hub on Adelaide Island, Antarctic Peninsula.",
  },
  {
    id: "vostok",
    name: "Vostok Station",
    country: "Russia",
    flag: "🇷🇺",
    lat: -78.46,
    lon: 106.87,
    type: "Permanent",
    desc: "Pole of Cold deep ice-core drilling station over subglacial Lake Vostok.",
  },
  {
    id: "concordia",
    name: "Concordia Station",
    country: "France / Italy",
    flag: "🇪🇺",
    lat: -75.1,
    lon: 123.33,
    type: "Permanent",
    desc: "Joint French-Italian astronomy and glaciology research facility at Dome C.",
  },
  {
    id: "neumayer",
    name: "Neumayer Station III",
    country: "Germany",
    flag: "🇩🇪",
    lat: -70.67,
    lon: -8.27,
    type: "Permanent",
    desc: "Alfred Wegener Institute geophysics and atmospheric observatory on Ekström Ice Shelf.",
  },
  {
    id: "esperanza",
    name: "Esperanza Base",
    country: "Argentina",
    flag: "🇦🇷",
    lat: -63.4,
    lon: -56.99,
    type: "Permanent",
    desc: "Argentine year-round base at Hope Bay, northern tip of Antarctic Peninsula.",
  },
  {
    id: "davis",
    name: "Davis Station",
    country: "Australia",
    flag: "🇦🇺",
    lat: -68.58,
    lon: 77.97,
    type: "Permanent",
    desc: "Australian Antarctic Division headquarters in the ice-free Vestfold Hills.",
  },
];

// High-Fidelity Polar Polygon Geometries (Lat / Lon coordinates converted via polarToXY)
const ANTARCTIC_MAINLAND_LATLON: [number, number][] = [
  // Starting at Queen Maud Land (0° lon), going clockwise through East Antarctica, Ross, West, Peninsula, Weddell
  [-69.5, 0.0],
  [-69.8, 10.0],
  [-68.5, 20.0],
  [-67.8, 30.0],
  [-67.2, 40.0],
  [-66.8, 50.0], // Enderby Land
  [-66.2, 55.0],
  [-67.0, 65.0],
  [-68.5, 75.0], // Prydz Bay / Amery Margin
  [-66.4, 85.0],
  [-65.8, 95.0], // Queen Mary Land
  [-66.0, 105.0], // Wilkes Land
  [-65.5, 115.0],
  [-66.2, 125.0],
  [-66.0, 135.0],
  [-66.8, 142.0], // Adelie Land
  [-68.2, 150.0],
  [-70.5, 160.0], // Victoria Land / Cape Adare
  [-72.0, 170.0],
  [-74.5, 172.0],
  [-77.8, 165.0], // McMurdo Sound / Ross Ice Shelf East Coast
  [-84.0, 175.0], // Transantarctic Mountains interior
  [-85.0, -170.0],
  [-83.0, -150.0],
  [-79.0, -160.0], // Marie Byrd Land Ross Margin
  [-75.5, -150.0],
  [-74.0, -135.0], // Marie Byrd Land Coast (Amundsen Sea)
  [-73.0, -120.0],
  [-72.5, -105.0], // Walgreen Coast
  [-73.2, -90.0], // Ellsworth Land (Bellingshausen Sea)
  [-72.0, -80.0],
  [-71.5, -74.0], // Base of Antarctic Peninsula
  [-70.0, -68.0], // Alexander Island / George VI Sound
  [-68.0, -67.0], // Graham Land West
  [-64.8, -63.5], // Palmer Land
  [-63.3, -57.5], // Trinity Peninsula / Cape Dubouzet (Tip)
  [-64.2, -56.5], // James Ross Island area
  [-65.5, -61.0], // Larsen Coast
  [-71.0, -61.0], // Ronne Ice Shelf West boundary
  [-75.5, -60.0], // Ronne-Filchner Bay
  [-78.0, -45.0], // Deep Filchner Shelf coast
  [-77.0, -35.0], // Coats Land
  [-75.0, -25.0], // Caird Coast
  [-73.0, -15.0], // Princess Martha Coast
  [-71.0, -5.0],
];

// Ice Shelf Polygons
const ROSS_ICE_SHELF_LATLON: [number, number][] = [
  [-77.8, 165.0],
  [-78.5, 180.0],
  [-78.2, -165.0],
  [-79.0, -160.0],
  [-83.0, -150.0],
  [-85.0, -170.0],
  [-84.0, 175.0],
];

const RONNE_FILCHNER_ICE_SHELF_LATLON: [number, number][] = [
  [-71.0, -61.0],
  [-74.5, -55.0],
  [-77.0, -35.0],
  [-78.0, -45.0],
  [-75.5, -60.0],
];

const LARSEN_C_ICE_SHELF_LATLON: [number, number][] = [
  [-66.0, -61.5],
  [-66.2, -59.5],
  [-69.0, -61.0],
  [-69.5, -63.5],
];

const AMERY_ICE_SHELF_LATLON: [number, number][] = [
  [-68.5, 70.0],
  [-68.0, 75.0],
  [-73.0, 72.0],
  [-71.5, 68.0],
];

// Major Geographic Region & Sea Labels
interface GeoLabel {
  text: string;
  lat: number;
  lon: number;
  type: "continent" | "sector" | "sea" | "iceshelf" | "ocean" | "neighbor";
  sub?: string;
  angle?: number;
}

const CARTOGRAPHIC_LABELS: GeoLabel[] = [
  { text: "ANTARCTICA", lat: -83.5, lon: 45.0, type: "continent", angle: -45 },
  { text: "EAST ANTARCTICA", lat: -77.0, lon: 75.0, type: "sector", angle: 30 },
  { text: "WEST ANTARCTICA", lat: -78.0, lon: -110.0, type: "sector", angle: -30 },
  { text: "ANTARCTIC PENINSULA", lat: -66.5, lon: -64.0, type: "sector", angle: -65 },
  { text: "Queen Maud Land", lat: -73.0, lon: 15.0, type: "sector", angle: 10 },
  { text: "Wilkes Land", lat: -70.0, lon: 120.0, type: "sector", angle: 60 },
  { text: "Marie Byrd Land", lat: -77.0, lon: -130.0, type: "sector", angle: -50 },
  { text: "Victoria Land", lat: -73.5, lon: 160.0, type: "sector", angle: 80 },
  { text: "Enderby Land", lat: -68.5, lon: 52.0, type: "sector", angle: 45 },
  { text: "Ellsworth Land", lat: -74.5, lon: -85.0, type: "sector", angle: -75 },
  { text: "Transantarctic Mountains", lat: -85.0, lon: 150.0, type: "sector", angle: 65 },

  // Ice Shelves
  { text: "Ross Ice Shelf", lat: -81.5, lon: -175.0, type: "iceshelf" },
  { text: "Ronne-Filchner Ice Shelf", lat: -76.0, lon: -50.0, type: "iceshelf" },
  { text: "Larsen C Ice Shelf", lat: -67.5, lon: -62.0, type: "iceshelf" },
  { text: "Amery Ice Shelf", lat: -70.0, lon: 72.0, type: "iceshelf" },

  // Oceans & Marginal Seas
  { text: "SOUTHERN OCEAN", lat: -58.5, lon: 0.0, type: "ocean" },
  { text: "Weddell Sea", lat: -71.5, lon: -40.0, type: "sea" },
  { text: "Ross Sea", lat: -73.0, lon: 178.0, type: "sea" },
  { text: "Amundsen Sea", lat: -70.5, lon: -115.0, type: "sea" },
  { text: "Bellingshausen Sea", lat: -68.5, lon: -85.0, type: "sea" },
  { text: "Davis Sea", lat: -65.0, lon: 90.0, type: "sea" },
  { text: "Drake Passage", lat: -59.5, lon: -62.0, type: "sea" },
  { text: "Scotia Sea", lat: -58.0, lon: -40.0, type: "sea" },

  // Surrounding Continent Indicators
  { text: "▲ SOUTH AMERICA (Cape Horn / Drake Passage)", lat: -56.5, lon: -66.0, type: "neighbor" },
  { text: "▲ AFRICA (Cape of Good Hope)", lat: -56.0, lon: 20.0, type: "neighbor" },
  { text: "▲ AUSTRALIA / TASMANIA", lat: -56.0, lon: 140.0, type: "neighbor" },
  { text: "▲ NEW ZEALAND (Oceania)", lat: -56.0, lon: 175.0, type: "neighbor" },
];

export interface AntarcticPolarMapProps {
  routes?: Route[];
  icebergs?: Iceberg[];
  selectedRouteId?: string;
  onSelectRoute?: (id: string) => void;
  selectedIcebergId?: string | null;
  onSelectIceberg?: (id: string) => void;
  horizonFraction?: number; // 0..1 (for 0h..72h trajectory progression)
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
  horizonFraction = 0,
  seaIceHeat,
  selectedRegion,
  onSelectRegion,
  vessel,
  className = "",
  compact = false,
}: AntarcticPolarMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Map viewport state: zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, initPanX: 0, initPanY: 0 });
  const [fullscreen, setFullscreen] = useState(false);

  // Layer visibility toggles
  const [layers, setLayers] = useState({
    graticule: true,
    labels: true,
    stations: true,
    routes: true,
    icebergs: true,
    seaIce: true,
    currents: true,
    vessel: true,
  });

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Hovered item inspection state
  const [hoverCoord, setHoverCoord] = useState<{ lat: number; lon: number; sx: number; sy: number } | null>(null);
  const [selectedStation, setSelectedStation] = useState<ResearchStation | null>(null);
  const [stationQuery, setStationQuery] = useState("");

  // Convert polygon lat/lons to SVG string
  const mainlandPath = useMemo(() => {
    const pts = ANTARCTIC_MAINLAND_LATLON.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const rossShelfPath = useMemo(() => {
    const pts = ROSS_ICE_SHELF_LATLON.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const ronneShelfPath = useMemo(() => {
    const pts = RONNE_FILCHNER_ICE_SHELF_LATLON.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const larsenShelfPath = useMemo(() => {
    const pts = LARSEN_C_ICE_SHELF_LATLON.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const ameryShelfPath = useMemo(() => {
    const pts = AMERY_ICE_SHELF_LATLON.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  // Filtered stations for search
  const filteredStations = useMemo(() => {
    if (!stationQuery.trim()) return RESEARCH_STATIONS;
    const q = stationQuery.toLowerCase();
    return RESEARCH_STATIONS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q),
    );
  }, [stationQuery]);

  // Mouse pan handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, initPanX: pan.x, initPanY: pan.y };
  };

  const handleMouseMove = (e: MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Calculate map coordinate under cursor taking zoom and pan into account
    const scale = (zoom * rect.width) / 1000;
    const mapX = (clientX - rect.width / 2 - pan.x * scale) / scale + MAP_CX;
    const mapY = (clientY - rect.height / 2 - pan.y * scale) / scale + MAP_CY;

    const polar = xyToPolar(mapX, mapY);
    setHoverCoord({ lat: polar.lat, lon: polar.lon, sx: clientX, sy: clientY });

    if (isPanning) {
      const dx = (e.clientX - panStartRef.current.x) / (zoom * 0.9);
      const dy = (e.clientY - panStartRef.current.y) / (zoom * 0.9);
      setPan({ x: panStartRef.current.initPanX + dx, y: panStartRef.current.initPanY + dy });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleZoom = (delta: number) => {
    setZoom((z) => Math.max(0.75, Math.min(3.8, +(z + delta).toFixed(2))));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedStation(null);
  };

  // Selected route lookup
  const currentRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  return (
    <div
      className={cx(
        "relative flex flex-col h-full w-full select-none overflow-hidden rounded-xl border transition-colors duration-300",
        isDark ? "border-[#1d445c]/80 bg-[#061421] text-[#eaf6f8]" : "border-[#d8d0c2] bg-[#dbebf3] text-[#0d2433]",
        fullscreen ? "fixed inset-2 z-50 h-[calc(100vh-16px)]" : "",
        className,
      )}
    >
      {/* Top Map Header & Search HUD */}
      <div
        className={cx(
          "flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2 z-10 backdrop-blur-md transition-colors",
          isDark ? "border-[#1d445c]/60 bg-[#071521]/90 text-[#eaf6f8]" : "border-[#d8d0c2] bg-[#f8f5ee]/95 text-[#0d2433]",
        )}
      >
        {/* Left: Map Title & Projection Info */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#55d6e8]/15 text-[#55d6e8] light:bg-[#0f768e]/15 light:text-[#0f768e]">
            <Compass size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold tracking-wide">2D Antarctic Polar Chart</span>
              <span className="rounded bg-[#55d6e8]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-[#55d6e8] light:text-[#0f768e]">
                Polar Stereographic
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#91aeb9] light:text-[#5a7686]">
              60°S–90°S Southern Ocean Basin · Graticules & Research Stations
            </span>
          </div>
        </div>

        {/* Center: Quick Search for Stations / Features */}
        {!compact && (
          <div className="flex items-center gap-1.5 rounded-md border border-[#1d445c]/60 bg-[#0d2433]/80 light:border-[#d8d0c2] light:bg-[#eee8dc] px-2.5 py-1 text-[11px] focus-within:border-[#55d6e8]/70">
            <Search size={13} className="text-[#91aeb9] light:text-[#5a7686]" />
            <input
              value={stationQuery}
              onChange={(e) => setStationQuery(e.target.value)}
              placeholder="Search station (e.g. Maitri, Bharati, McMurdo)..."
              className="w-56 bg-transparent font-sans text-[11px] outline-none text-[#eaf6f8] light:text-[#0d2433] placeholder:text-[#5f7d89] light:placeholder:text-[#8ea5b3]"
            />
            {stationQuery && (
              <button onClick={() => setStationQuery("")} className="text-[#91aeb9] hover:text-[#eaf6f8]" aria-label="Clear search">
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Right: Layer Buttons & Fullscreen */}
        <div className="flex items-center gap-1.5">
          {/* Layer Quick Toggles */}
          <div className="flex items-center gap-1 rounded-md border border-[#1d445c]/60 bg-[#071521]/80 light:border-[#d8d0c2] light:bg-[#eee8dc] p-0.5">
            <button
              onClick={() => toggleLayer("stations")}
              className={cx(
                "flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold transition-colors",
                layers.stations
                  ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white"
                  : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686]",
              )}
              title="Toggle Research Bases"
            >
              <MapPin size={11} /> Bases
            </button>
            <button
              onClick={() => toggleLayer("icebergs")}
              className={cx(
                "flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold transition-colors",
                layers.icebergs
                  ? "bg-[#ff5c5c] text-white light:bg-[#dc2626]"
                  : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686]",
              )}
              title="Toggle Icebergs & Trajectories"
            >
              <Triangle size={11} /> Icebergs
            </button>
            <button
              onClick={() => toggleLayer("seaIce")}
              className={cx(
                "flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold transition-colors",
                layers.seaIce
                  ? "bg-[#38bdf8] text-[#071521] light:bg-[#0284c7] light:text-white"
                  : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686]",
              )}
              title="Toggle Sea-Ice Dynamics"
            >
              <Snowflake size={11} /> Sea Ice
            </button>
            <button
              onClick={() => toggleLayer("graticule")}
              className={cx(
                "flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold transition-colors",
                layers.graticule
                  ? "bg-[#46d7a1] text-[#071521] light:bg-[#059669] light:text-white"
                  : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686]",
              )}
              title="Toggle Lat/Lon Graticule Lines"
            >
              Lat/Lon
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1d445c]/60 bg-[#071521]/80 text-[#91aeb9] hover:bg-[#132f40] hover:text-[#55d6e8] light:border-[#d8d0c2] light:bg-[#eee8dc] light:text-[#5a7686] transition-colors"
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen Chart"}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Main SVG Polar Vector Map Viewport */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsPanning(false);
          setHoverCoord(null);
        }}
      >
        <svg
          viewBox="0 0 1000 1000"
          className="h-full w-full transition-transform duration-75"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: "center center",
          }}
        >
          <defs>
            {/* Ocean radial gradient */}
            <radialGradient id="polar-ocean-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isDark ? "#092437" : "#d1e7f3"} />
              <stop offset="50%" stopColor={isDark ? "#061826" : "#bcdfed"} />
              <stop offset="90%" stopColor={isDark ? "#04101a" : "#a8d3e6"} />
              <stop offset="100%" stopColor={isDark ? "#030c14" : "#98c6db"} />
            </radialGradient>

            {/* Antarctic Land gradient */}
            <linearGradient id="polar-land-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={isDark ? "#eaf6f8" : "#ffffff"} />
              <stop offset="60%" stopColor={isDark ? "#d3e8ed" : "#f4fafc"} />
              <stop offset="100%" stopColor={isDark ? "#b6d7df" : "#e0eff4"} />
            </linearGradient>

            {/* Ice Shelf texture/gradient */}
            <linearGradient id="ice-shelf-grad" x1="0" y1="0" x2="1" y2="0.8">
              <stop offset="0%" stopColor={isDark ? "#93c5d6" : "#cbe4ee"} stopOpacity="0.85" />
              <stop offset="100%" stopColor={isDark ? "#74afc3" : "#b5d8e6"} stopOpacity="0.85" />
            </linearGradient>

            {/* Vessel & Arrow markers */}
            <marker id="polar-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill={isDark ? "#55d6e8" : "#0f768e"} />
            </marker>
            <marker id="drift-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#ff5c5c" />
            </marker>
          </defs>

          {/* Ocean Background */}
          <rect x="0" y="0" width="1000" height="1000" fill="url(#polar-ocean-grad)" />

          {/* Concentric Polar Latitude Rings (Parallels) */}
          {layers.graticule && (
            <g stroke={isDark ? "#163a52" : "#98c2d6"} strokeWidth="1" opacity="0.65" fill="none">
              {/* 60°S boundary */}
              <circle cx={MAP_CX} cy={MAP_CY} r={MAX_RADIUS} strokeWidth="1.6" strokeDasharray="6 4" />
              {/* 65°S */}
              <circle cx={MAP_CX} cy={MAP_CY} r={(MAX_RADIUS * 25) / 30} />
              {/* 70°S */}
              <circle cx={MAP_CX} cy={MAP_CY} r={(MAX_RADIUS * 20) / 30} />
              {/* 75°S */}
              <circle cx={MAP_CX} cy={MAP_CY} r={(MAX_RADIUS * 15) / 30} />
              {/* 80°S */}
              <circle cx={MAP_CX} cy={MAP_CY} r={(MAX_RADIUS * 10) / 30} />
              {/* 85°S */}
              <circle cx={MAP_CX} cy={MAP_CY} r={(MAX_RADIUS * 5) / 30} />

              {/* Radial Longitude Meridians (Every 30 degrees) */}
              {Array.from({ length: 12 }, (_, i) => {
                const lon = i * 30;
                const rad = ((lon - 90) * Math.PI) / 180;
                const x2 = MAP_CX + MAX_RADIUS * Math.cos(rad);
                const y2 = MAP_CY + MAX_RADIUS * Math.sin(rad);
                return <line key={`meridian-${lon}`} x1={MAP_CX} y1={MAP_CY} x2={x2} y2={y2} strokeDasharray="4 4" />;
              })}
            </g>
          )}

          {/* Latitude & Longitude Numeric Labels */}
          {layers.graticule && (
            <g
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
              fill={isDark ? "#6fa8c0" : "#4a788e"}
              textAnchor="middle"
            >
              {/* Latitude annotations on 0°/180° axis */}
              <text x={MAP_CX} y={MAP_CY - MAX_RADIUS + 12}>
                60°S (Convergence)
              </text>
              <text x={MAP_CX} y={MAP_CY - (MAX_RADIUS * 20) / 30 - 3}>
                70°S
              </text>
              <text x={MAP_CX} y={MAP_CY - (MAX_RADIUS * 10) / 30 - 3}>
                80°S
              </text>
              <text x={MAP_CX} y={MAP_CY + (MAX_RADIUS * 10) / 30 + 11}>
                80°S
              </text>
              <text x={MAP_CX} y={MAP_CY + (MAX_RADIUS * 20) / 30 + 11}>
                70°S
              </text>
              <text x={MAP_CX} y={MAP_CY + MAX_RADIUS - 6}>
                60°S
              </text>

              {/* Longitude Ray Labels along perimeter */}
              {[
                { lon: 0, label: "0° (Prime Meridian / Greenwich)" },
                { lon: 30, label: "30°E" },
                { lon: 60, label: "60°E (Indian Ocean)" },
                { lon: 90, label: "90°E" },
                { lon: 120, label: "120°E" },
                { lon: 150, label: "150°E" },
                { lon: 180, label: "180° (Date Line / Pacific)" },
                { lon: 210, label: "150°W" },
                { lon: 240, label: "120°W" },
                { lon: 270, label: "90°W (Bellingshausen)" },
                { lon: 300, label: "60°W (Drake / S. America)" },
                { lon: 330, label: "30°W (Weddell)" },
              ].map(({ lon, label }) => {
                const rad = ((lon - 90) * Math.PI) / 180;
                const lx = MAP_CX + (MAX_RADIUS + 18) * Math.cos(rad);
                const ly = MAP_CY + (MAX_RADIUS + 18) * Math.sin(rad) + 4;
                return (
                  <text
                    key={`lbl-lon-${lon}`}
                    x={lx}
                    y={ly}
                    fontSize="9"
                    fontWeight="700"
                    fill={isDark ? "#8ccfe0" : "#0f768e"}
                  >
                    {label}
                  </text>
                );
              })}
            </g>
          )}

          {/* Sea-Ice Dynamic Concentration Heatmap (if provided or active) */}
          {layers.seaIce && seaIceHeat && (
            <g>
              {seaIceHeat.map((sh) => {
                const pts = sh.polygon.map((p) => polarToXY(p.lat, p.lon));
                const d = smoothPath(pts) + " Z";
                const c = seaIceColor(sh.concentration);
                const isSel = sh.region === selectedRegion;
                return (
                  <path
                    key={sh.region}
                    d={d}
                    fill={c}
                    opacity={0.3 + (sh.concentration / 100) * 0.4}
                    stroke={c}
                    strokeWidth={isSel ? 3 : 1.2}
                    strokeOpacity={isSel ? 1 : 0.6}
                    style={{ cursor: onSelectRegion ? "pointer" : "default" }}
                    onClick={() => onSelectRegion?.(sh.region)}
                  />
                );
              })}
            </g>
          )}

          {/* Ice Shelves (Ross, Ronne-Filchner, Larsen C, Amery) */}
          <g id="ice-shelves">
            <path d={rossShelfPath} fill="url(#ice-shelf-grad)" stroke={isDark ? "#5ca8bf" : "#89b9cb"} strokeWidth="1.5" />
            <path d={ronneShelfPath} fill="url(#ice-shelf-grad)" stroke={isDark ? "#5ca8bf" : "#89b9cb"} strokeWidth="1.5" />
            <path d={larsenShelfPath} fill="url(#ice-shelf-grad)" stroke={isDark ? "#5ca8bf" : "#89b9cb"} strokeWidth="1.2" />
            <path d={ameryShelfPath} fill="url(#ice-shelf-grad)" stroke={isDark ? "#5ca8bf" : "#89b9cb"} strokeWidth="1.2" />
          </g>

          {/* Antarctic Mainland Landmass */}
          <path
            d={mainlandPath}
            fill="url(#polar-land-grad)"
            stroke={isDark ? "#9ec2cb" : "#7aa4af"}
            strokeWidth="2.2"
            filter={isDark ? "drop-shadow(0 0 10px rgba(85,214,232,0.12))" : "drop-shadow(0 2px 6px rgba(13,36,51,0.15))"}
          />

          {/* Cartographic Names & Labels */}
          {layers.labels && (
            <g id="cartographic-labels" pointerEvents="none">
              {CARTOGRAPHIC_LABELS.map((lbl, i) => {
                const pos = polarToXY(lbl.lat, lbl.lon);
                let fontSize = 11;
                let fontWeight = "600";
                let fill = isDark ? "#4f7a8c" : "#325c6e";
                let letterSpacing = "0.08em";

                if (lbl.type === "continent") {
                  fontSize = 24;
                  fontWeight = "800";
                  fill = isDark ? "#0e344a" : "#0d2b3a";
                  letterSpacing = "0.22em";
                } else if (lbl.type === "sector") {
                  fontSize = 11;
                  fontWeight = "700";
                  fill = isDark ? "#2a546a" : "#335e72";
                  letterSpacing = "0.12em";
                } else if (lbl.type === "sea") {
                  fontSize = 12;
                  fontWeight = "700";
                  fill = isDark ? "#55d6e8" : "#0f768e";
                  letterSpacing = "0.05em";
                } else if (lbl.type === "iceshelf") {
                  fontSize = 10;
                  fontWeight = "600";
                  fill = isDark ? "#174358" : "#17475c";
                } else if (lbl.type === "ocean") {
                  fontSize = 14;
                  fontWeight = "800";
                  fill = isDark ? "#39718d" : "#236585";
                  letterSpacing = "0.2em";
                } else if (lbl.type === "neighbor") {
                  fontSize = 10;
                  fontWeight = "700";
                  fill = isDark ? "#f5b942" : "#d97706";
                }

                return (
                  <text
                    key={`lbl-${i}`}
                    x={pos.x}
                    y={pos.y}
                    fontSize={fontSize}
                    fontFamily="Inter, sans-serif"
                    fontWeight={fontWeight}
                    fill={fill}
                    letterSpacing={letterSpacing}
                    textAnchor="middle"
                    transform={lbl.angle ? `rotate(${lbl.angle}, ${pos.x}, ${pos.y})` : undefined}
                    opacity={lbl.type === "continent" ? (isDark ? 0.45 : 0.6) : 0.9}
                  >
                    {lbl.text}
                  </text>
                );
              })}
            </g>
          )}

          {/* Planned Navigational Routes */}
          {layers.routes &&
            routes.map((r) => {
              const isSel = r.id === (selectedRouteId ?? currentRoute?.id);
              const pts = r.coordinates.map((c) => polarToXY(c.lat, c.lon));
              const d = smoothPath(pts);

              return (
                <g key={`route-${r.id}`} className="cursor-pointer" onClick={() => onSelectRoute?.(r.id)}>
                  {/* Route ribbon glow on select */}
                  {isSel && (
                    <path
                      d={d}
                      fill="none"
                      stroke={r.color}
                      strokeWidth="8"
                      strokeOpacity="0.25"
                      strokeLinecap="round"
                    />
                  )}
                  <path
                    d={d}
                    fill="none"
                    stroke={r.color}
                    strokeWidth={isSel ? 3.5 : 2}
                    strokeOpacity={isSel ? 1 : 0.4}
                    strokeLinecap="round"
                  />
                  {/* Waypoint markers */}
                  {pts.map((pt, wi) => (
                    <circle
                      key={`wp-${r.id}-${wi}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={isSel ? 4 : 2.5}
                      fill={isDark ? "#071521" : "#ffffff"}
                      stroke={r.color}
                      strokeWidth={isSel ? 2 : 1.5}
                    />
                  ))}
                </g>
              );
            })}

          {/* Icebergs & Drift Horizons */}
          {layers.icebergs &&
            icebergs.map((ib) => {
              const color = RISK_COLORS[ib.riskLevel];
              const isSel = ib.id === selectedIcebergId;
              const curPos = polarToXY(ib.position.lat, ib.position.lon);
              const pathPts = ib.predictedPath.map((p) => polarToXY(p.lat, p.lon));

              // Slice path to fraction
              const f = Math.max(0.001, horizonFraction);
              const slicedPath = slicePath(pathPts, f);
              const widths = ib.uncertainty.slice(0, slicedPath.length).map((u) => u * (0.3 + f * 0.7) * 0.6);

              return (
                <g key={`ib-${ib.id}`}>
                  {/* Uncertainty ribbon */}
                  <path d={corridorPath(slicedPath, widths)} fill={color} opacity={isSel ? 0.22 : 0.12} />
                  {/* Predicted trajectory */}
                  <path
                    d={smoothPath(slicedPath)}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                    opacity={0.85}
                  />
                  {/* Horizon endpoint marker */}
                  {slicedPath.length > 1 && (
                    <circle
                      cx={slicedPath.at(-1)!.x}
                      cy={slicedPath.at(-1)!.y}
                      r="3.5"
                      fill={color}
                      stroke={isDark ? "#071521" : "#ffffff"}
                      strokeWidth="1"
                    />
                  )}
                  {/* Iceberg current marker (clickable) */}
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelectIceberg?.(ib.id)}
                  >
                    {isSel && (
                      <circle cx={curPos.x} cy={curPos.y} r="12" fill={color} opacity="0.25" className="animate-ping" />
                    )}
                    <path
                      d={`M ${curPos.x} ${curPos.y - 7} L ${curPos.x + 6} ${curPos.y + 5} L ${curPos.x - 6} ${curPos.y + 5} Z`}
                      fill={color}
                      stroke={isDark ? "#071521" : "#ffffff"}
                      strokeWidth="1.4"
                    />
                    <text
                      x={curPos.x + 8}
                      y={curPos.y + 3}
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="700"
                      fill={color}
                    >
                      {ib.id}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* Research Stations Layer */}
          {layers.stations &&
            filteredStations.map((st) => {
              const pos = polarToXY(st.lat, st.lon);
              const isSelected = selectedStation?.id === st.id;
              const isIndian = st.country === "India";

              return (
                <g
                  key={`st-${st.id}`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedStation(st)}
                >
                  {/* Indian station accent ring */}
                  {isIndian && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="9"
                      fill="none"
                      stroke="#f5b942"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      className="animate-spin"
                      style={{ animationDuration: "10s", transformOrigin: `${pos.x}px ${pos.y}px` }}
                    />
                  )}
                  {/* Station Marker */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 6 : isIndian ? 5 : 3.8}
                    fill={isIndian ? "#f5b942" : isDark ? "#55d6e8" : "#0f768e"}
                    stroke={isDark ? "#071521" : "#ffffff"}
                    strokeWidth="1.5"
                  />
                  {/* Station Text Label */}
                  <text
                    x={pos.x + 8}
                    y={pos.y + 3}
                    fontSize={isIndian ? "10" : "8.5"}
                    fontFamily="Inter, sans-serif"
                    fontWeight={isIndian ? "700" : "600"}
                    fill={isIndian ? (isDark ? "#f5b942" : "#b45309") : isDark ? "#c8dde3" : "#1a3b50"}
                  >
                    {st.name} {st.flag}
                  </text>
                </g>
              );
            })}

          {/* Vessel Live Position (RV Polar Star) */}
          {layers.vessel && vessel && (
            (() => {
              const vPos = polarToXY(vessel.position.lat, vessel.position.lon);
              return (
                <g>
                  {/* Animated radar pulse halo */}
                  <circle
                    cx={vPos.x}
                    cy={vPos.y}
                    r="14"
                    fill={isDark ? "#55d6e8" : "#0f768e"}
                    opacity="0.3"
                    style={{ animation: "pulse-halo 2.4s ease-in-out infinite", transformOrigin: `${vPos.x}px ${vPos.y}px` }}
                  />
                  {/* Ship triangle vector oriented with heading */}
                  <g transform={`translate(${vPos.x} ${vPos.y}) rotate(${vessel.headingDeg - 90})`}>
                    <path
                      d="M 12 0 L -8 7 L -4 0 L -8 -7 Z"
                      fill={isDark ? "#55d6e8" : "#0f768e"}
                      stroke={isDark ? "#071521" : "#ffffff"}
                      strokeWidth="1.5"
                    />
                  </g>
                  <text
                    x={vPos.x + 14}
                    y={vPos.y + 4}
                    fontSize="10"
                    fontFamily="Inter, sans-serif"
                    fontWeight="800"
                    fill={isDark ? "#55d6e8" : "#0f768e"}
                  >
                    {vessel.name} (AIS LIVE)
                  </text>
                </g>
              );
            })()
          )}

          {/* Geographic South Pole Pin */}
          <g>
            <circle cx={MAP_CX} cy={MAP_CY} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx={MAP_CX} cy={MAP_CY} r="9" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" />
            <text
              x={MAP_CX + 10}
              y={MAP_CY + 4}
              fontSize="9.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
              fill={isDark ? "#ff7070" : "#dc2626"}
            >
              90°S SOUTH POLE (Amundsen-Scott)
            </text>
          </g>
        </svg>

        {/* Floating Zoom & Pan HUD */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-[#1d445c]/80 bg-[#071521]/90 light:border-[#d8d0c2] light:bg-[#ffffff]/90 p-1 backdrop-blur shadow-md">
          <button
            onClick={() => handleZoom(0.25)}
            className="flex h-7 w-7 items-center justify-center rounded text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686] light:hover:bg-[#f0ece1] light:hover:text-[#0d2433] transition-colors"
            title="Zoom In"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => handleZoom(-0.25)}
            className="flex h-7 w-7 items-center justify-center rounded text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686] light:hover:bg-[#f0ece1] light:hover:text-[#0d2433] transition-colors"
            title="Zoom Out"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={handleReset}
            className="flex h-7 w-7 items-center justify-center rounded text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686] light:hover:bg-[#f0ece1] light:hover:text-[#0d2433] transition-colors"
            title="Reset Map View"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Dynamic Coordinate Inspection HUD on Cursor */}
        {hoverCoord && (
          <div
            className={cx(
              "pointer-events-none absolute z-20 rounded border px-2 py-1 font-mono text-[10px] shadow-lg backdrop-blur-md transition-opacity duration-150",
              isDark
                ? "border-[#55d6e8]/40 bg-[#071521]/95 text-[#eaf6f8]"
                : "border-[#0f768e]/40 bg-[#ffffff]/95 text-[#0d2433]",
            )}
            style={{
              left: Math.min(window.innerWidth - 180, hoverCoord.sx + 14),
              top: Math.max(12, hoverCoord.sy - 30),
            }}
          >
            <div className="font-bold text-[#55d6e8] light:text-[#0f768e]">
              {Math.abs(hoverCoord.lat).toFixed(2)}°S · {Math.abs(hoverCoord.lon).toFixed(2)}°
              {hoverCoord.lon >= 0 ? "E" : "W"}
            </div>
          </div>
        )}

        {/* Station Detail Modal Card */}
        {selectedStation && (
          <div
            className={cx(
              "absolute right-3 top-3 z-30 w-72 rounded-lg border p-3.5 shadow-2xl backdrop-blur-lg transition-all animate-fade-rise",
              isDark ? "border-[#1d445c] bg-[#071521]/95 text-[#eaf6f8]" : "border-[#d8d0c2] bg-[#ffffff]/95 text-[#0d2433]",
            )}
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#1d445c]/40 light:border-[#e2d8c7] pb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px]">{selectedStation.flag}</span>
                  <span className="text-[13px] font-bold">{selectedStation.name}</span>
                </div>
                <div className="font-mono text-[10px] text-[#55d6e8] light:text-[#0f768e] font-semibold">
                  {selectedStation.country} · {selectedStation.type}
                </div>
              </div>
              <button
                onClick={() => setSelectedStation(null)}
                className="text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686]"
                aria-label="Close Station Details"
              >
                <X size={14} />
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#91aeb9] light:text-[#4a6878]">
              {selectedStation.desc}
            </p>
            <div className="mt-2.5 flex items-center justify-between rounded bg-[#0d2433] light:bg-[#f2ebe0] px-2.5 py-1.5 font-mono text-[10px]">
              <span className="text-[#91aeb9] light:text-[#5a7686]">Coordinates:</span>
              <span className="font-bold text-[#eaf6f8] light:text-[#0d2433]">
                {Math.abs(selectedStation.lat).toFixed(2)}°S, {Math.abs(selectedStation.lon).toFixed(2)}°
                {selectedStation.lon >= 0 ? "E" : "W"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status & Coordinate Strip */}
      <div
        className={cx(
          "flex flex-wrap items-center justify-between gap-2 border-t px-3.5 py-1.5 font-mono text-[10px] transition-colors",
          isDark ? "border-[#1d445c]/60 bg-[#071521] text-[#91aeb9]" : "border-[#d8d0c2] bg-[#f8f5ee] text-[#5a7686]",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#55d6e8] light:text-[#0f768e] font-semibold">
            <Radio size={11} className="animate-pulse" /> POLAR RADAR GRID ACTIVE
          </span>
          <span>
            SECTOR: <b className="text-[#eaf6f8] light:text-[#0d2433]">ANTARCTICA & SOUTHERN OCEAN</b>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            ZOOM: <b className="text-[#eaf6f8] light:text-[#0d2433]">{(zoom * 100).toFixed(0)}%</b>
          </span>
          <span>
            POLE: <b className="text-[#eaf6f8] light:text-[#0d2433]">90°00'S 00°00'E</b>
          </span>
        </div>
      </div>
    </div>
  );
}

export default AntarcticPolarMap;
