import { useRef, useState, type MouseEvent, type WheelEvent } from "react";
import { Crosshair, X } from "lucide-react";
import type { Iceberg, Route } from "../../data/types";
import {
  coastline,
  currents,
  destination,
  icebergCluster,
  iceShelf,
  seaIceRegions,
  vessel,
} from "../../data/mock";
import { RISK_COLORS, cx } from "../ui/primitives";
import { corridorPath, polygonPath, seaIceColor, slicePath, smoothPath } from "./geo";
import { useTheme } from "../../theme";
import { geoBearingDeg, geoDistanceNm, getSectorName } from "./AntarcticPolarMap";
import weddellSatelliteImg from "../../assets/weddell_satellite_tactical.jpg";

export interface LayerState {
  icebergs: boolean;
  seaice: boolean;
  currents: boolean;
  weather: boolean;
}

export interface SeaIceHeat {
  region: string;
  polygon: { x: number; y: number; lat: number; lon: number }[];
  concentration: number;
}

interface MapViewProps {
  routes: Route[];
  icebergs: Iceberg[];
  selectedRouteId: string;
  layers: LayerState;
  zoom: number;
  onSelectRoute?: (id: string) => void;
  selectedIcebergId?: string | null;
  onSelectIceberg?: (id: string) => void;
  /** highlight a hazard-intersection glow (rerouting demo) */
  hazardHighlight?: boolean;
  /** grow iceberg trajectories to a fraction of their 72h horizon (0..1) */
  horizonFraction?: number;
  /** sea-ice heatmap mode: render these regions colored by concentration */
  seaIceHeat?: SeaIceHeat[];
  selectedRegion?: string | null;
  onSelectRegion?: (region: string) => void;
}

const LAT_LINES = [
  { y: 70, label: "64°00'S" },
  { y: 195, label: "66°00'S" },
  { y: 320, label: "68°00'S" },
  { y: 445, label: "70°00'S" },
  { y: 570, label: "72°00'S" },
  { y: 660, label: "74°00'S" },
];

const LON_LINES = [
  { x: 80, label: "60°00'W" },
  { x: 230, label: "50°00'W" },
  { x: 380, label: "40°00'W" },
  { x: 530, label: "30°00'W" },
  { x: 680, label: "20°00'W" },
  { x: 830, label: "10°00'W" },
  { x: 960, label: "00°00' (Prime)" },
];

function tacticalXYToLatLon(x: number, y: number): { lat: number; lon: number } {
  // y: 70 -> -64°S, 660 -> -74°S
  const lat = -(64 + ((y - 70) / (660 - 70)) * 10);
  // x: 80 -> -60°W, 960 -> 0°W
  const lon = -(60 - ((x - 80) / (960 - 80)) * 60);
  return { lat: +lat.toFixed(2), lon: +lon.toFixed(2) };
}

export default function MapView({
  routes,
  icebergs,
  selectedRouteId,
  layers,
  zoom,
  onSelectRoute,
  selectedIcebergId,
  onSelectIceberg,
  hazardHighlight,
  horizonFraction,
  seaIceHeat,
  selectedRegion,
  onSelectRegion,
}: MapViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const [internalPan, setInternalPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ clientX: 0, clientY: 0, initPanX: 0, initPanY: 0, hasMoved: false });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [clickedPin, setClickedPin] = useState<{ lat: number; lon: number; mapX: number; mapY: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initPanX: internalPan.x,
      initPanY: internalPan.y,
      hasMoved: false,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (isPanning) {
      const dx = ((e.clientX - panStartRef.current.clientX) / rect.width) * 1000;
      const dy = ((e.clientY - panStartRef.current.clientY) / rect.height) * 700;
      if (Math.hypot(e.clientX - panStartRef.current.clientX, e.clientY - panStartRef.current.clientY) > 4) {
        panStartRef.current.hasMoved = true;
      }
      setInternalPan({ x: panStartRef.current.initPanX + dx, y: panStartRef.current.initPanY + dy });
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (isPanning && !panStartRef.current.hasMoved && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const svgX = (clientX / rect.width) * 1000;
      const svgY = (clientY / rect.height) * 700;
      const mapX = 500 + (svgX - 500 - internalPan.x) / zoom;
      const mapY = 350 + (svgY - 350 - internalPan.y) / zoom;
      const geo = tacticalXYToLatLon(mapX, mapY);
      setClickedPin({ lat: geo.lat, lon: geo.lon, mapX, mapY });
      setCopied(false);
    }
    setIsPanning(false);
  };

  return (
    <div
      className={cx(
        "relative h-full w-full overflow-hidden rounded-md border cursor-crosshair transition-colors select-none",
        isDark ? "border-[#1d445c]/70 bg-[#071a26]" : "border-[#d8d0c2] bg-[#dbebf3]",
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsPanning(false)}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <radialGradient id="ocean-grad" cx="35%" cy="30%" r="90%">
            <stop offset="0%" stopColor={isDark ? "#0a2333" : "#d8edf7"} />
            <stop offset="100%" stopColor={isDark ? "#061420" : "#bce0f0"} />
          </radialGradient>
          <linearGradient id="land-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDark ? "#dcecef" : "#ffffff"} />
            <stop offset="100%" stopColor={isDark ? "#b9d2d8" : "#deecf2"} />
          </linearGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={isDark ? "#55d6e8" : "#0f768e"} />
          </marker>
        </defs>

        {/* Zoom & Pan Map Group */}
        <g transform={`translate(500, 350) translate(${internalPan.x}, ${internalPan.y}) scale(${zoom}) translate(-500, -350)`}>
          {/* Deep Ocean Base */}
          <rect x="0" y="0" width="1000" height="700" fill="url(#ocean-grad)" />

          {/* Bathymetry Contours */}
          <g opacity="0.25" stroke={isDark ? "#55d6e8" : "#0f768e"}>
            <ellipse cx="500" cy="350" rx="450" ry="300" fill="none" strokeWidth="0.8" strokeDasharray="6 4" />
            <ellipse cx="480" cy="380" rx="350" ry="220" fill="none" strokeWidth="0.8" strokeDasharray="4 4" />
          </g>

          {/* Graticule grid with Lat / Lon lines */}
          <g stroke={isDark ? "#55d6e8" : "#0f768e"} strokeWidth="0.8" opacity="0.35">
            {LON_LINES.map((l) => (
              <line key={`v-${l.label}`} x1={l.x} y1="0" x2={l.x} y2="700" strokeDasharray="4 4" />
            ))}
            {LAT_LINES.map((l) => (
              <line key={`h-${l.label}`} x1="0" y1={l.y} x2="1000" y2={l.y} strokeDasharray="4 4" />
            ))}
          </g>

          {/* Graticule Coordinate Labels */}
          <g fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill={isDark ? "#8ccfe0" : "#0f768e"}>
            {LON_LINES.map((l) => (
              <text key={`txt-v-${l.label}`} x={l.x + 4} y="16">
                {l.label}
              </text>
            ))}
            {LAT_LINES.map((l) => (
              <text key={`txt-h-${l.label}`} x="8" y={l.y - 4}>
                {l.label}
              </text>
            ))}
          </g>

          {/* Sea-ice heatmap (prediction mode) */}
          {seaIceHeat &&
            seaIceHeat.map((r) => {
              const c = seaIceColor(r.concentration);
              const sel = r.region === selectedRegion;
              return (
                <path
                  key={r.region}
                  d={polygonPath(r.polygon)}
                  fill={c}
                  opacity={0.35 + (r.concentration / 100) * 0.45}
                  stroke={c}
                  strokeOpacity={sel ? 1 : 0.6}
                  strokeWidth={sel ? 2.5 : 1}
                  style={{ cursor: onSelectRegion ? "pointer" : "default" }}
                  onClick={() => onSelectRegion?.(r.region)}
                />
              );
            })}

          {/* Sea-ice regions (nav mode) */}
          {!seaIceHeat &&
            layers.seaice &&
            seaIceRegions.map((r) => (
              <path
                key={r.id}
                d={polygonPath(r.polygon)}
                fill="#b8e8f0"
                opacity={0.18 + (r.concentration / 100) * 0.25}
                stroke="#b8e8f0"
                strokeOpacity="0.4"
                strokeWidth="1"
              />
            ))}

          {/* Crisp Antarctic Coastline & Ice Shelf Landmass */}
          <path d={polygonPath(coastline)} fill={isDark ? "#102535" : "#e6f2f7"} stroke={isDark ? "#7dd3fc" : "#0284c7"} strokeWidth="1.8" />
          <path d={polygonPath(iceShelf)} fill={isDark ? "#173449" : "#d0eaf5"} stroke="#38bdf8" strokeWidth="1.4" opacity="0.9" strokeDasharray="4 2" />

        {/* Continent & Sector Watermark Labels */}
        <g pointerEvents="none">
          <text
            x="500"
            y="655"
            fontSize="18"
            fontFamily="Inter, sans-serif"
            fontWeight="800"
            letterSpacing="0.25em"
            fill={isDark ? "#174358" : "#23556d"}
            textAnchor="middle"
          >
            ANTARCTICA · WEDDELL SEA SECTOR
          </text>
          <text
            x="200"
            y="670"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="700"
            letterSpacing="0.1em"
            fill={isDark ? "#28566d" : "#3e7087"}
          >
            PALMER LAND COAST
          </text>
          <text
            x="480"
            y="680"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="700"
            letterSpacing="0.1em"
            fill={isDark ? "#28566d" : "#3e7087"}
          >
            RONNE ICE SHELF MARGIN
          </text>
          <text
            x="820"
            y="670"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="700"
            letterSpacing="0.1em"
            fill={isDark ? "#28566d" : "#3e7087"}
          >
            COATS LAND
          </text>
        </g>

        {/* Ocean currents */}
        {layers.currents &&
          currents.map((c, i) => {
            const len = 34 + c.strength * 22;
            const rad = (c.angleDeg * Math.PI) / 180;
            const x2 = c.from.x + Math.cos(rad) * len;
            const y2 = c.from.y + Math.sin(rad) * len;
            return (
              <line
                key={i}
                x1={c.from.x}
                y1={c.from.y}
                x2={x2}
                y2={y2}
                stroke="#55d6e8"
                strokeWidth="1.4"
                opacity="0.5"
                markerEnd="url(#arrow)"
              />
            );
          })}

        {/* Weather / wind barbs */}
        {layers.weather &&
          currents.map((c, i) => (
            <g key={`w${i}`} opacity="0.4" transform={`translate(${c.from.x + 30} ${c.from.y - 26})`}>
              <path d="M0 0 L14 -6 M4 2 L14 -2 M8 4 L14 2" stroke="#8ccfe0" strokeWidth="1.2" fill="none" />
            </g>
          ))}

        {/* Hazard zone overlay around the high-risk route corridor */}
        {hazardHighlight && (
          <path
            d={corridorPath(icebergs[0].predictedPath, icebergs[0].uncertainty.map((u) => u + 20))}
            fill="#ff5c5c"
            opacity="0.12"
            stroke="#ff5c5c"
            strokeOpacity="0.3"
            strokeDasharray="6 5"
          />
        )}

        {/* Routes — non-selected dimmed */}
        {routes.map((r) => {
          const isSel = r.id === selected.id;
          return (
            <g key={r.id} style={{ cursor: "pointer" }} onClick={() => onSelectRoute?.(r.id)}>
              <path
                d={smoothPath(r.coordinates)}
                fill="none"
                stroke={r.color}
                strokeWidth={isSel ? 3.5 : 2}
                strokeLinecap="round"
                opacity={isSel ? 1 : 0.28}
                style={{ filter: isSel ? `drop-shadow(0 0 5px ${r.color}aa)` : "none" }}
              />
              {isSel &&
                r.waypoints.map((w, i) => (
                  <circle key={i} cx={w.x} cy={w.y} r="4" fill="#071a26" stroke={r.color} strokeWidth="2" />
                ))}
            </g>
          );
        })}

        {/* Predicted vessel route (dashed cyan) from vessel forward along selected route */}
        <path
          d={smoothPath(selected.coordinates.slice(0, 3))}
          fill="none"
          stroke="#55d6e8"
          strokeWidth="1.6"
          strokeDasharray="7 6"
          opacity="0.5"
          style={{ animation: "dash-flow 1.2s linear infinite" }}
        />

        {/* Low-risk iceberg observation cluster */}
        {layers.icebergs &&
          icebergCluster.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r="2.4" fill="#8ccfe0" opacity="0.7" />
          ))}

        {/* Icebergs: corridor + predicted path + marker */}
        {layers.icebergs &&
          icebergs.map((ib) => {
            const color = RISK_COLORS[ib.riskLevel];
            const isSel = ib.id === selectedIcebergId;
            const f = horizonFraction ?? 1;
            const path = f < 1 ? slicePath(ib.predictedPath, f) : ib.predictedPath;
            const widths = ib.uncertainty.slice(0, path.length).map((u) => u * (0.4 + f * 0.6));
            const endPt = path[path.length - 1]!;
            const lastPathPt = ib.predictedPath[ib.predictedPath.length - 1]!;
            return (
              <g key={ib.id}>
                <path d={corridorPath(path, widths)} fill={color} opacity={isSel ? 0.18 : 0.1} />
                <path
                  d={smoothPath(path)}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.6"
                  strokeDasharray="5 5"
                  opacity="0.85"
                />
                {f < 1 && <circle cx={endPt.x} cy={endPt.y} r="3.5" fill={color} stroke="#071a26" strokeWidth="1" />}
                <circle cx={lastPathPt.x} cy={lastPathPt.y} r="3" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" />
                <g
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectIceberg?.(ib.id)}
                  onMouseEnter={() =>
                    setHover({ x: ib.position.x, y: ib.position.y, label: `${ib.id} · ${ib.riskLevel.toUpperCase()} · ${ib.speedMs} m/s` })
                  }
                  onMouseLeave={() => setHover(null)}
                >
                  {isSel && <circle cx={ib.position.x} cy={ib.position.y} r="10" fill={color} opacity="0.25" />}
                  <path
                    d={`M ${ib.position.x} ${ib.position.y - 6} L ${ib.position.x + 5.5} ${ib.position.y + 4} L ${ib.position.x - 5.5} ${ib.position.y + 4} Z`}
                    fill={color}
                    stroke="#071a26"
                    strokeWidth="1"
                  />
                </g>
              </g>
            );
          })}

        {/* Destination */}
        <g>
          <circle cx={destination.x} cy={destination.y} r="7" fill="none" stroke={isDark ? "#eaf6f8" : "#0d2433"} strokeWidth="1.5" />
          <circle cx={destination.x} cy={destination.y} r="2.5" fill={isDark ? "#eaf6f8" : "#0d2433"} />
          <text x={destination.x + 12} y={destination.y + 4} fill={isDark ? "#eaf6f8" : "#0d2433"} fontSize="11" fontFamily="Inter" fontWeight="600">
            Halley VI Research Station (UK)
          </text>
        </g>

        {/* Vessel — brightest element, cyan halo */}
        <g
          onMouseEnter={() => setHover({ x: vessel.position.x, y: vessel.position.y, label: `${vessel.name} · ${vessel.speedKn} kn · HDG ${vessel.headingDeg}°` })}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer" }}
        >
          <circle cx={vessel.position.x} cy={vessel.position.y} r="9" fill={isDark ? "#55d6e8" : "#0f768e"} style={{ animation: "pulse-halo 2.6s ease-in-out infinite", transformOrigin: `${vessel.position.x}px ${vessel.position.y}px` }} />
          <g transform={`translate(${vessel.position.x} ${vessel.position.y}) rotate(${vessel.headingDeg - 90})`}>
            <path d="M 9 0 L -6 5 L -3 0 L -6 -5 Z" fill={isDark ? "#55d6e8" : "#0f768e"} stroke={isDark ? "#071521" : "#ffffff"} strokeWidth="1" />
          </g>
        </g>

        {/* Clicked Point Coordinate Pin */}
        {clickedPin && (
          <g transform={`translate(${clickedPin.mapX}, ${clickedPin.mapY})`} className="pointer-events-none">
            <circle cx="0" cy="0" r="16" fill="#55d6e8" opacity="0.35" className="animate-ping" />
            <circle cx="0" cy="0" r="6" fill="#55d6e8" stroke="#ffffff" strokeWidth="2" />
            <path d="M 0 0 L -5 -14 A 6 6 0 1 1 5 -14 Z" fill="#55d6e8" stroke="#071521" strokeWidth="1.2" transform="translate(0, -2)" />
            <circle cx="0" cy="-16" r="2.5" fill="#ffffff" />
          </g>
        )}
      </g>
      </svg>

      {hover && !clickedPin && (
        <div
          className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-sm border px-2 py-1 font-mono text-[10px] shadow-lg backdrop-blur ${isDark
              ? "border-[#55d6e8]/50 bg-[#071521]/95 text-[#eaf6f8]"
              : "border-[#0f768e]/50 bg-[#ffffff]/95 text-[#0d2433]"
            }`}
          style={{ left: `${(hover.x / 1000) * 100}%`, top: `${(hover.y / 700) * 100}%` }}
        >
          {hover.label}
        </div>
      )}

      {/* Interactive Clicked Point Coordinate Inspector Card */}
      {clickedPin && (
        <div
          className={cx(
            "absolute bottom-3 left-3 z-30 flex flex-col gap-2 rounded-xl border p-3 shadow-2xl backdrop-blur-md max-w-xs transition-all animate-in fade-in slide-in-from-bottom-2",
            isDark
              ? "border-[#55d6e8]/40 bg-[#071927]/95 text-[#eaf6f8]"
              : "border-[#0f768e]/40 bg-[#fdfbf7]/98 text-[#0d2433]",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#1d445c]/40 light:border-[#e2d8c7] pb-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#55d6e8] light:text-[#0f768e]">
              <Crosshair size={13} />
              <span>TACTICAL POINT INSPECTOR</span>
            </div>
            <button
              onClick={() => setClickedPin(null)}
              className="text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#7a94a2] light:hover:text-[#0d2433]"
              title="Close Inspector"
            >
              <X size={13} />
            </button>
          </div>

          <div>
            <div className="font-mono text-[14px] font-bold tracking-tight text-[#55d6e8] light:text-[#0f768e]">
              {Math.abs(clickedPin.lat).toFixed(3)}°S, {clickedPin.lon >= 0 ? `${clickedPin.lon.toFixed(3)}°E` : `${Math.abs(clickedPin.lon).toFixed(3)}°W`}
            </div>
            <div className="text-[10.5px] text-[#91aeb9] light:text-[#5a7686] leading-snug">
              Weddell Sea Sector · Antarctic Tactical Navigation Area
            </div>
          </div>

          {vessel && (
            <div className="rounded-md border border-[#1d445c]/40 light:border-[#e2d8c7] bg-[#0d2433]/60 light:bg-[#f4eee3] p-1.5 text-[10px] font-mono">
              <div className="text-[#91aeb9] light:text-[#6b8594]">From {vessel.name}:</div>
              <div className="font-bold text-[#eaf6f8] light:text-[#0d2433]">
                {geoDistanceNm(vessel.position.lat, vessel.position.lon, clickedPin.lat, clickedPin.lon)} nm · Bearing {geoBearingDeg(vessel.position.lat, vessel.position.lon, clickedPin.lat, clickedPin.lon)}°
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const text = `${Math.abs(clickedPin.lat).toFixed(3)}°S, ${clickedPin.lon >= 0 ? `${clickedPin.lon.toFixed(3)}°E` : `${Math.abs(clickedPin.lon).toFixed(3)}°W`}`;
              navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={cx(
              "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10.5px] font-bold transition-all",
              copied
                ? "bg-[#10b981] text-white shadow-sm"
                : "bg-[#55d6e8] text-[#071521] hover:bg-[#7be3f2] light:bg-[#0f768e] light:text-white",
            )}
          >
            {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            <span>{copied ? "Copied Coordinates!" : "Copy Coordinates"}</span>
          </button>
        </div>
      )}

      {/* Corner coordinate readout */}
      {!clickedPin && (
        <div className={`pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] font-semibold ${isDark ? "text-[#91aeb9]/90" : "text-[#4a6878]/90"}`}>
          ANTARCTIC WEDDELL BASIN · 64°00'S–74°00'S · 60°00'W–00°00'
        </div>
      )}
    </div>
  );
}

function CopyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
