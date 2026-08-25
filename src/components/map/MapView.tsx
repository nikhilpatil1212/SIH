import { useState } from "react";
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
import { RISK_COLORS } from "../ui/primitives";
import { corridorPath, polygonPath, seaIceColor, slicePath, smoothPath } from "./geo";
import { useTheme } from "../../theme";

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
  const selected = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-md border transition-colors ${
        isDark ? "border-[#1d445c]/70 bg-[#071a26]" : "border-[#d8d0c2] bg-[#dbebf3]"
      }`}
    >
      <svg
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.3s ease" }}
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

        {/* Ocean */}
        <rect x="0" y="0" width="1000" height="700" fill="url(#ocean-grad)" />

        {/* Graticule grid */}
        <g stroke={isDark ? "#123047" : "#a8cfe0"} strokeWidth="0.6" opacity="0.5">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={i * 125} y1="0" x2={i * 125} y2="700" />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 125} x2="1000" y2={i * 125} />
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
                opacity={0.3 + (r.concentration / 100) * 0.45}
                stroke={c}
                strokeOpacity={sel ? 1 : 0.5}
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
              opacity={0.14 + (r.concentration / 100) * 0.22}
              stroke="#b8e8f0"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
          ))}

        {/* Land / ice shelf */}
        <path d={polygonPath(coastline)} fill="url(#land-grad)" stroke="#9fbdc4" strokeWidth="1.5" />
        <path d={polygonPath(iceShelf)} fill="#e7f2f4" stroke="#9fbdc4" strokeWidth="1" opacity="0.95" />

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
            const endPt = path.at(-1)!;
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
                <circle cx={ib.predictedPath.at(-1)!.x} cy={ib.predictedPath.at(-1)!.y} r="3" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" />
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
            Halley Station
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
            <path d="M 9 0 L -6 5 L -3 0 L -6 -5 Z" fill={isDark ? "#55d6e8" : "#0f768e"} stroke={isDark ? "#071a26" : "#ffffff"} strokeWidth="1" />
          </g>
        </g>
      </svg>

      {hover && (
        <div
          className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-sm border px-2 py-1 font-mono text-[10px] shadow-lg backdrop-blur ${
            isDark
              ? "border-[#55d6e8]/50 bg-[#071521]/95 text-[#eaf6f8]"
              : "border-[#0f768e]/50 bg-[#ffffff]/95 text-[#0d2433]"
          }`}
          style={{ left: `${(hover.x / 1000) * 100}%`, top: `${(hover.y / 700) * 100}%` }}
        >
          {hover.label}
        </div>
      )}

      {/* Corner coordinate readout */}
      <div className={`pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] ${
        isDark ? "text-[#91aeb9]/80" : "text-[#5a7686]/80"
      }`}>
        WEDDELL SEA SECTOR · 64°S–74°S
      </div>
    </div>
  );
}
