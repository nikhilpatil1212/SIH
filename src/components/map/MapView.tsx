import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { type Map as MapLibreInstance, type Marker as MapLibreMarker } from "maplibre-gl";
import { Crosshair, Layers, Maximize2, Minimize2, ShieldAlert, Ship, X } from "lucide-react";
import type { Hazard, Iceberg, Route } from "../../data/types";
import { RISK_COLORS, cx } from "../ui/primitives";
import { useTheme } from "../../theme";
import { MAP_PROVIDERS, type MapTileProviderId, getSectorName, RESEARCH_STATIONS } from "../../data/polarMapData";
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

    return [
      [selectedBerg.position.lon, selectedBerg.position.lat],
      [selectedBerg.position.lon + dlon, selectedBerg.position.lat + dlat],
      [selectedBerg.position.lon + dlon * 2, selectedBerg.position.lat + dlat * 2],
      [selectedBerg.position.lon + dlon * 3, selectedBerg.position.lat + dlat * 3],
    ];
  }, [selectedBerg]);

  // Smooth Auto-Focus / Zoom on Selected Iceberg
  const prevSelectedIcebergRef = useRef<string | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedIcebergId) return;

    if (prevSelectedIcebergRef.current === selectedIcebergId) return;
    prevSelectedIcebergRef.current = selectedIcebergId;

    const ibg = icebergs.find((i) => i.id === selectedIcebergId);
    if (!ibg) return;

    if (ibg.predictedPath && ibg.predictedPath.length >= 2) {
      const lats = ibg.predictedPath.map((p) => p.lat);
      const lons = ibg.predictedPath.map((p) => p.lon);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      map.fitBounds(
        [
          [minLon - 1.5, minLat - 1.2],
          [maxLon + 1.5, maxLat + 1.2],
        ],
        {
          padding: 80,
          maxZoom: 6.8,
          duration: 1200,
        }
      );
    } else {
      map.flyTo({
        center: [ibg.position.lon, ibg.position.lat],
        zoom: 5.8,
        duration: 1200,
        essential: true,
      });
    }
  }, [selectedIcebergId, icebergs]);

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

    // C. Icebergs in Sector (with Horizon Interpolation & Trajectory Waypoints)
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

          path = [
            ibg.position,
            { x: 500, y: 500, lat: ibg.position.lat + dlat * (6 / 24), lon: ibg.position.lon + dlon * (6 / 24) },
            { x: 500, y: 500, lat: ibg.position.lat + dlat * (12 / 24), lon: ibg.position.lon + dlon * (12 / 24) },
            { x: 500, y: 500, lat: ibg.position.lat + dlat, lon: ibg.position.lon + dlon },
            { x: 500, y: 500, lat: ibg.position.lat + dlat * 2, lon: ibg.position.lon + dlon * 2 },
            { x: 500, y: 500, lat: ibg.position.lat + dlat * 3, lon: ibg.position.lon + dlon * 3 },
          ];
        }

        if (isSelected && path && path.length >= 4) {
          let activeIndex = 0;
          if (horizonFraction <= 0.01) activeIndex = 0;
          else if (Math.abs(horizonFraction - 0.12) < 0.01) activeIndex = 1;
          else if (Math.abs(horizonFraction - 0.25) < 0.01) activeIndex = 2;
          else if (Math.abs(horizonFraction - 0.45) < 0.01) activeIndex = 3;
          else if (Math.abs(horizonFraction - 0.75) < 0.01) activeIndex = 4;
          else if (horizonFraction >= 0.99) activeIndex = 5;

          const waypoints = [
            { pt: path[0] || ibg.position, label: `${ibg.id} (NOW)`, color: "#55d6e8", stepIdx: 0 },
            { pt: path[3] || path[1] || path[0], label: `${ibg.id} (+24H)`, color: "#10b981", stepIdx: 3 },
            { pt: path[4] || path[2] || path[0], label: `${ibg.id} (+48H)`, color: "#f59e0b", stepIdx: 4 },
            { pt: path[5] || path[3] || path[0], label: `${ibg.id} (+72H)`, color: "#ef4444", stepIdx: 5 },
          ];

          waypoints.forEach((wp) => {
            const isActive = activeIndex === wp.stepIdx || (activeIndex < 3 && wp.stepIdx === 0 && activeIndex === 0);
            const el = document.createElement("div");
            el.className = `flex flex-col items-center cursor-pointer transition-all duration-200 ${
              isActive ? "z-30 scale-110" : "z-20 scale-95 opacity-90 hover:scale-105"
            }`;

            const coordText = `${Math.abs(wp.pt.lat).toFixed(4)}°S, ${Math.abs(wp.pt.lon).toFixed(4)}°W`;

            el.innerHTML = `
              <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[9px] font-bold shadow-lg backdrop-blur-md ${
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

            el.onclick = (e) => {
              e.stopPropagation();
              onSelectIceberg?.(ibg.id);
            };

            const popupHtml = `
              <div style="font-family: Inter, sans-serif; padding: 4px;">
                <div style="font-weight:bold; font-size: 12px; color: ${wp.color};">
                  ${wp.label}
                </div>
                <div style="font-size: 11px; margin-top: 3px;"><b>Coordinates:</b> ${coordText}</div>
                <div style="font-size: 10px; margin-top: 2px; color: #91aeb9;">Size: ${ibg.sizeKm} km · Speed: ${(ibg.speedMs * 1.94384).toFixed(1)} kn</div>
              </div>
            `;

            addMarker(wp.pt.lon, wp.pt.lat, el, popupHtml);
          });
        } else {
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
              <div style="font-size: 11px; margin-top: 2px;"><b>POS:</b> ${Math.abs(ibg.position.lat).toFixed(2)}°S, ${Math.abs(ibg.position.lon).toFixed(2)}°W</div>
            </div>
          `;
          addMarker(ibg.position.lon, ibg.position.lat, el, popupHtml);
        }
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

  // GeoJSON Routes Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupLayers = () => {
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
  }, [routes, selectedRouteId, providerId]);

  // Dedicated Robust Trajectory Line Layer Management (Direct MapLibre Implementation)
  useEffect(() => {
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

        // Clean up old layers if present
        if (map.getLayer("a76c-direct-trajectory-layer")) map.removeLayer("a76c-direct-trajectory-layer");
        if (map.getSource("a76c-direct-trajectory-source")) map.removeSource("a76c-direct-trajectory-source");
        if (map.getLayer("iceberg-trajectory-casing")) map.removeLayer("iceberg-trajectory-casing");
        if (map.getSource("iceberg-trajectory-source")) map.removeSource("iceberg-trajectory-source");

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

        const existingSource = map.getSource(sourceId) as any;
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
          } catch (e) {}
        }
      } catch (err) {
        console.error("Error in renderTrajectory MapView:", err);
      }
    };

    if (map.isStyleLoaded()) {
      renderTrajectory();
    } else {
      map.once("style.load", renderTrajectory);
    }
    map.on("load", renderTrajectory);

    return () => {
      map.off("load", renderTrajectory);
    };
  }, [selectedTrajectoryCoords, providerId, selectedBerg]);

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
