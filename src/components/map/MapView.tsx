import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { type Map as MapLibreInstance, type Marker as MapLibreMarker } from "maplibre-gl";
import { Crosshair, Layers, Maximize2, Minimize2, ShieldAlert, Ship, X } from "lucide-react";
import type { Hazard, Iceberg, Route } from "../../data/types";
import { RISK_COLORS, cx } from "../ui/primitives";
import { useTheme } from "../../theme";
import { MAP_PROVIDERS, type MapTileProviderId, getSectorName, RESEARCH_STATIONS } from "./AntarcticPolarMap";
import { hazards as mockHazards, vessel } from "../../data/mock";

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
  hazardHighlight?: boolean;
  horizonFraction?: number;
  seaIceHeat?: SeaIceHeat[];
  selectedRegion?: string | null;
  onSelectRegion?: (region: string) => void;
}

export function MapView({
  routes = [],
  icebergs = [],
  selectedRouteId,
  layers,
  zoom: externalZoom,
  onSelectRoute,
  selectedIcebergId,
  onSelectIceberg,
  horizonFraction = 0.001,
  seaIceHeat,
  selectedRegion,
  onSelectRegion,
}: MapViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreInstance | null>(null);

  // Active Base Map State (Defaults to ESRI Satellite)
  const [providerId, setProviderId] = useState<MapTileProviderId>("esri-satellite");
  const [cursorPos, setCursorPos] = useState<{ lat: number; lon: number; sector: string } | null>(null);
  const [clickedPin, setClickedPin] = useState<{ lat: number; lon: number; sector: string } | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Initialize MapLibre GL instance for Tactical Weddell Sector Focus
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [-48, -68.5], // Focused on Weddell Sea Sector & Antarctic Peninsula
      zoom: 3.8,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: false,
    });

    mapRef.current = map;

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

  // Markers management
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
    if (vessel) {
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

      const popupHtml = `
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <div style="font-weight:bold; font-size: 13px; color: #55d6e8;">🚢 ${vessel.name}</div>
          <div style="font-size: 11px; margin-top: 3px; color: #10b981;">● Status: ${vessel.status} (PC6 Polar Research)</div>
          <div style="font-size: 11px; margin-top: 2px;"><b>Heading:</b> ${vessel.headingDeg}° · <b>Speed:</b> ${vessel.speedKn} kn</div>
          <div style="font-size: 11px; margin-top: 2px;"><b>POS:</b> ${Math.abs(vessel.position.lat).toFixed(2)}°S, ${Math.abs(vessel.position.lon).toFixed(2)}°W</div>
        </div>
      `;
      addMarker(vessel.position.lon, vessel.position.lat, el, popupHtml);
    }

    // B. Weddell / Peninsula Research Stations
    RESEARCH_STATIONS.filter((st) => st.lon >= -75 && st.lon <= -20).forEach((st) => {
      const el = document.createElement("div");
      el.className = "flex items-center gap-1 cursor-pointer transition-transform hover:scale-125 px-1.5 py-0.5 rounded-full border border-[#ffb703] bg-[#071521]/90 text-[#ffb703] shadow-md font-mono text-[9px] font-bold";
      el.innerHTML = `<span>${st.flag}</span><span>${st.name}</span>`;

      const popupHtml = `
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <div style="font-weight:bold; font-size: 12px; color: #ffb703;">${st.flag} ${st.name}</div>
          <div style="font-size: 11px; margin-top: 3px; color: #91aeb9;">${st.country} · ${st.type} Base</div>
          <div style="font-size: 11px; margin-top: 2px;"><b>Coordinates:</b> ${Math.abs(st.lat)}°S, ${Math.abs(st.lon)}°W</div>
          <div style="font-size: 10px; margin-top: 4px; color: #cbe5ee;">${st.desc}</div>
        </div>
      `;
      addMarker(st.lon, st.lat, el, popupHtml);
    });

    // C. Icebergs in Sector (with Horizon Interpolation)
    if (layers.icebergs) {
      icebergs.forEach((ibg) => {
        const path = ibg.predictedPath || [{ lat: ibg.position.lat, lon: ibg.position.lon }];
        const stepIndex = Math.min(path.length - 1, Math.floor(horizonFraction * (path.length - 1)));
        const targetPt = path[stepIndex] || ibg.position;

        const isHigh = ibg.riskLevel === "high";
        const isSelected = ibg.id === selectedIcebergId;

        const el = document.createElement("div");
        el.className = `flex items-center gap-1 cursor-pointer transition-transform hover:scale-125 px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold shadow-md ${
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
              ▲ ${ibg.id} (${ibg.riskLevel.toUpperCase()} RISK)
            </div>
            <div style="font-size: 11px; margin-top: 3px;"><b>Size:</b> ${ibg.sizeKm} km · <b>Drift:</b> ${(ibg.speedMs * 1.94384).toFixed(1)} kn @ ${ibg.headingDeg}°</div>
            <div style="font-size: 11px; margin-top: 2px;"><b>POS:</b> ${Math.abs(targetPt.lat).toFixed(2)}°S, ${Math.abs(targetPt.lon).toFixed(2)}°W</div>
          </div>
        `;
        addMarker(targetPt.lon, targetPt.lat, el, popupHtml);
      });
    }

    // D. Active Hazards in Sector
    mockHazards.forEach((hz) => {
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
        </div>
      `;
      addMarker(lon, lat, el, popupHtml);
    });

    // E. Clicked Pin
    if (clickedPin) {
      const el = document.createElement("div");
      el.className = "h-5 w-5 rounded-full border-2 border-[#55d6e8] bg-[#55d6e8]/40 animate-bounce flex items-center justify-center text-[#071521] text-[10px] font-bold shadow-[0_0_12px_#55d6e8]";
      el.innerHTML = "📍";
      addMarker(clickedPin.lon, clickedPin.lat, el);
    }
  }, [layers, vessel, icebergs, clickedPin, providerId, horizonFraction, selectedIcebergId]);

  // GeoJSON Routes & Iceberg Trajectories
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupLayers = () => {
      // Iceberg Trajectories
      if (icebergs.length > 0 && !map.getSource("iceberg-trajectories-source")) {
        const trajectoryFeatures = icebergs.map((ibg) => ({
          type: "Feature" as const,
          properties: { id: ibg.id, risk: ibg.riskLevel },
          geometry: {
            type: "LineString" as const,
            coordinates: (ibg.predictedPath || [ibg.position]).map((p) => [p.lon, p.lat]),
          },
        }));

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

      // Routes Layer
      if (routes.length > 0 && !map.getSource("routes-source")) {
        const routeFeatures = routes.map((r) => ({
          type: "Feature" as const,
          properties: { id: r.id, name: r.name, selected: r.id === selectedRouteId, color: r.color },
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
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once("style.load", setupLayers);
    }
  }, [routes, selectedRouteId, providerId, icebergs]);

  const copyCoordinates = () => {
    if (!clickedPin) return;
    const txt = `${Math.abs(clickedPin.lat).toFixed(4)}°S, ${Math.abs(clickedPin.lon).toFixed(4)}°${clickedPin.lon >= 0 ? "E" : "W"}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden select-none bg-[#050d17]">
      {/* Top Base Map Selector Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#1d445c]/60 bg-[#071927]/98 px-3 py-1.5 backdrop-blur z-20">
        <div className="flex items-center gap-1">
          <span className="font-mono text-[9px] font-bold uppercase text-[#55d6e8] mr-1">
            BASE MAP:
          </span>
          {MAP_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProviderId(p.id)}
              className={cx(
                "rounded px-2 py-0.5 font-mono text-[9px] font-bold transition-all",
                providerId === p.id
                  ? "bg-[#55d6e8] text-[#071521] shadow-[0_0_8px_#55d6e8]/40"
                  : "text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8]",
              )}
            >
              {providerId === p.id ? "● " : "○ "}
              {p.shortName}
            </button>
          ))}
        </div>

        <div className="font-mono text-[9px] text-[#91aeb9]">
          Weddell Sea Tactical Sector · 64°S–74°S
        </div>
      </div>

      {/* WebGL Map Container */}
      <div className="relative flex-1 min-h-[300px] overflow-hidden">
        <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

        {/* Clicked Pin Inspector */}
        {clickedPin && (
          <div className="absolute left-3 top-3 z-30 flex w-64 flex-col gap-1 rounded-lg border border-[#55d6e8] bg-[#071927]/95 p-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-left-2 font-mono">
            <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1 text-[10px] font-bold text-[#55d6e8]">
              <span>INSPECTED POS</span>
              <button onClick={() => setClickedPin(null)} className="text-[#91aeb9] hover:text-white">
                <X size={11} />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-white mt-0.5">
              <span>{Math.abs(clickedPin.lat).toFixed(4)}°S, {Math.abs(clickedPin.lon).toFixed(4)}°W</span>
              <button onClick={copyCoordinates} className="rounded bg-[#55d6e8]/20 px-1.5 py-0.5 text-[9px] text-[#55d6e8]">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Selected Hazard Panel */}
        {selectedHazard && (
          <div className="absolute right-3 top-3 z-30 flex w-72 flex-col gap-1.5 rounded-lg border border-[#ef4444] bg-[#071927]/98 p-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-2 font-mono">
            <div className="flex items-center justify-between border-b border-[#1d445c]/60 pb-1 text-[11px] font-bold text-[#ef4444]">
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={13} />
                <span>HAZARD: {selectedHazard.id}</span>
              </div>
              <button onClick={() => setSelectedHazard(null)} className="text-[#91aeb9] hover:text-white">
                <X size={12} />
              </button>
            </div>
            <div className="text-[10px] text-white">
              <b>Risk Level:</b> {selectedHazard.severity.toUpperCase()} · <b>ETA:</b> {selectedHazard.predictedTime}
            </div>
            <div className="text-[10px] text-[#91aeb9]">
              <b>Affected:</b> {selectedHazard.affectedRoute} (Confidence {selectedHazard.confidence}%)
            </div>
          </div>
        )}
      </div>

      {/* Footer HUD Coordinates */}
      <div className="flex items-center justify-between border-t border-[#1d445c]/60 bg-[#071927]/95 px-3 py-1 font-mono text-[9.5px] z-20">
        <div className="flex items-center gap-2">
          <span className="text-[#55d6e8] font-bold">SARATHI-1:</span>
          <span className="text-white font-semibold">
            {cursorPos ? `${Math.abs(cursorPos.lat)}°S, ${Math.abs(cursorPos.lon)}°${cursorPos.lon >= 0 ? "E" : "W"}` : "Hover map for coordinates"}
          </span>
        </div>
        <span className="text-[#91aeb9]">Tactical Sector View</span>
      </div>
    </div>
  );
}

export default MapView;
