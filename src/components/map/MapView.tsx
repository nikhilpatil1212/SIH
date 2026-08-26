import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreInstance, type Marker as MapLibreMarker } from "maplibre-gl";
import { Crosshair, Layers, Maximize2, Minimize2, Ship, X } from "lucide-react";
import type { Iceberg, Route } from "../../data/types";
import { RISK_COLORS, cx } from "../ui/primitives";
import { useTheme } from "../../theme";
import { MAP_PROVIDERS, type MapTileProviderId, geoBearingDeg, geoDistanceNm, getSectorName, RESEARCH_STATIONS } from "./AntarcticPolarMap";
import { vessel } from "../../data/mock";

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
  seaIceHeat,
  selectedRegion,
  onSelectRegion,
}: MapViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreInstance | null>(null);

  // Active Real Tile Provider State (Defaults to ESRI Satellite)
  const [providerId, setProviderId] = useState<MapTileProviderId>("esri-satellite");
  const [cursorPos, setCursorPos] = useState<{ lat: number; lon: number; sector: string } | null>(null);
  const [clickedPin, setClickedPin] = useState<{ lat: number; lon: number; sector: string } | null>(null);
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

  // 1. Initialize MapLibre GL instance for Tactical Weddell Sector Focus
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

    // A. Weddell / Peninsula Research Stations
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

    // B. Live Vessel Marker
    if (vessel) {
      const el = document.createElement("div");
      el.className = "relative flex items-center justify-center cursor-pointer";
      el.innerHTML = `
        <div class="absolute h-8 w-8 rounded-full bg-[#55d6e8]/30 animate-ping"></div>
        <div class="h-6 w-6 rounded-full bg-[#071521] border-2 border-[#55d6e8] flex items-center justify-center text-[#55d6e8] shadow-[0_0_12px_#55d6e8]" style="transform: rotate(${vessel.headingDeg}deg);">
          ▲
        </div>
      `;

      const popupHtml = `
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <div style="font-weight:bold; font-size: 13px; color: #55d6e8;">🚢 ${vessel.name}</div>
          <div style="font-size: 11px; margin-top: 3px; color: #10b981;">● Status: ${vessel.status}</div>
          <div style="font-size: 11px; margin-top: 2px;"><b>Heading:</b> ${vessel.headingDeg}° · <b>Speed:</b> ${vessel.speedKn} kn</div>
          <div style="font-size: 11px; margin-top: 2px;"><b>POS:</b> ${Math.abs(vessel.position.lat).toFixed(2)}°S, ${Math.abs(vessel.position.lon).toFixed(2)}°W</div>
        </div>
      `;
      addMarker(vessel.position.lon, vessel.position.lat, el, popupHtml);
    }

    // C. Icebergs in Sector
    if (layers.icebergs) {
      icebergs.forEach((ibg) => {
        const el = document.createElement("div");
        const isHigh = ibg.riskLevel === "high";
        el.className = `flex items-center gap-1 cursor-pointer transition-transform hover:scale-125 px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold shadow-md ${
          isHigh
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
            <div style="font-size: 11px; margin-top: 2px;"><b>POS:</b> ${Math.abs(ibg.position.lat).toFixed(2)}°S, ${Math.abs(ibg.position.lon).toFixed(2)}°W</div>
          </div>
        `;
        addMarker(ibg.position.lon, ibg.position.lat, el, popupHtml);
      });
    }

    // D. Clicked Pin
    if (clickedPin) {
      const el = document.createElement("div");
      el.className = "h-5 w-5 rounded-full border-2 border-[#55d6e8] bg-[#55d6e8]/40 animate-bounce flex items-center justify-center text-[#071521] text-[10px] font-bold shadow-[0_0_12px_#55d6e8]";
      el.innerHTML = "📍";
      addMarker(clickedPin.lon, clickedPin.lat, el);
    }
  }, [layers, vessel, icebergs, clickedPin, providerId]);

  // GeoJSON Routes and Sea Ice Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupLayers = () => {
      // Routes Layer
      if (routes.length > 0 && !map.getSource("routes-source")) {
        const routeFeatures = routes.map((r) => ({
          type: "Feature" as const,
          properties: { id: r.id, name: r.name, selected: r.id === selectedRouteId },
          geometry: {
            type: "LineString" as const,
            coordinates: r.waypoints.map((w) => [w.lon, w.lat]),
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
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#55d6e8",
            "line-width": 3.5,
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
  }, [routes, selectedRouteId, providerId]);

  const copyCoordinates = () => {
    if (!clickedPin) return;
    const txt = `${Math.abs(clickedPin.lat).toFixed(4)}°S, ${Math.abs(clickedPin.lon).toFixed(4)}°${clickedPin.lon >= 0 ? "E" : "W"}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden select-none bg-[#050d17]">
      {/* Top API Provider Selector Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#1d445c]/60 bg-[#071927]/98 px-3 py-1.5 backdrop-blur z-20">
        <div className="flex items-center gap-1">
          <span className="font-mono text-[9px] font-bold uppercase text-[#55d6e8] mr-1">
            🛰️ TACTICAL API:
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
              {p.shortName}
            </button>
          ))}
        </div>

        <div className="font-mono text-[9px] text-[#91aeb9]">
          Weddell Sea Sector · 64°S–74°S
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
      </div>

      {/* Footer HUD Coordinates */}
      <div className="flex items-center justify-between border-t border-[#1d445c]/60 bg-[#071927]/95 px-3 py-1 font-mono text-[9.5px] z-20">
        <div className="flex items-center gap-2">
          <span className="text-[#55d6e8] font-bold">POS:</span>
          <span className="text-white font-semibold">
            {cursorPos ? `${Math.abs(cursorPos.lat)}°S, ${Math.abs(cursorPos.lon)}°${cursorPos.lon >= 0 ? "E" : "W"}` : "Hover map for coordinates"}
          </span>
        </div>
        <span className="text-[#91aeb9]">Real WebGL Tile Stream</span>
      </div>
    </div>
  );
}

export default MapView;
