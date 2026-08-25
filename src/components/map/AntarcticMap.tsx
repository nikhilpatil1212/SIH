import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Point } from "geojson";

type MLMap = maplibregl.Map;
const { Marker, Popup } = maplibregl;
type Marker = maplibregl.Marker;
import { Maximize2, Minimize2, Search, Ship } from "lucide-react";
import { useNav } from "../../state";
import { currents, environment, seaIceRegions, vessel } from "../../data/mock";
import { RISK_COLORS, cx } from "../ui/primitives";
import {
  HORIZON_FRACTION,
  type Horizon,
  hazardZones,
  icebergPositionsAt,
  icebergTrajectories,
  predictedShipLine,
  routeLines,
  seaIceFills,
  waypointPoints,
} from "./mapData";

const HORIZONS: Horizon[] = ["0h", "6h", "12h", "24h", "48h", "72h"];

interface LayerVis {
  vessel: boolean;
  icebergs: boolean;
  icebergPrediction: boolean;
  seaice: boolean;
  route: boolean;
  altRoutes: boolean;
  hazards: boolean;
  currents: boolean;
  weather: boolean;
  waypoints: boolean;
}

const LAYER_LABELS: { key: keyof LayerVis; label: string }[] = [
  { key: "vessel", label: "Vessel" },
  { key: "icebergs", label: "Icebergs" },
  { key: "icebergPrediction", label: "Iceberg Prediction" },
  { key: "seaice", label: "Sea-Ice Concentration" },
  { key: "route", label: "Ship Route" },
  { key: "altRoutes", label: "Alternative Routes" },
  { key: "hazards", label: "Hazard Zones" },
  { key: "currents", label: "Ocean Currents" },
  { key: "weather", label: "Weather" },
  { key: "waypoints", label: "Waypoints" },
];

const LEGEND = [
  { color: "#55d6e8", label: "Vessel" },
  { color: "#ff5c5c", label: "Iceberg" },
  { color: "#f5b942", label: "Predicted Iceberg", dashed: true },
  { color: "#3b82f6", label: "Current Route" },
  { color: "#55d6e8", label: "Predicted Route", dashed: true },
  { color: "#46d7a1", label: "Low Risk" },
  { color: "#f5b942", label: "Warning" },
  { color: "#ff5c5c", label: "Danger" },
  { color: "#8ccfe0", label: "Sea Ice" },
];

// OSM raster basemap. Swap this source for a dedicated polar basemap later.
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0a2b3d" } },
    { id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.2, "raster-brightness-max": 0.95 } },
  ],
};

function makeVesselEl() {
  const el = document.createElement("div");
  el.className = "anm-vessel";
  el.innerHTML = `<span class="anm-halo"></span><span class="anm-ship" style="transform:rotate(${vessel.headingDeg}deg)"></span>`;
  return el;
}
function makeIcebergEl(color: string, selected: boolean) {
  const el = document.createElement("div");
  el.className = "anm-berg";
  el.innerHTML = `<span class="anm-berg-dot" style="background:${color};box-shadow:0 0 0 ${selected ? 6 : 0}px ${color}33"></span>`;
  return el;
}
function makeArrowEl(angle: number, color: string) {
  const el = document.createElement("div");
  el.style.cssText = `color:${color};font-size:16px;line-height:1;transform:rotate(${angle}deg);cursor:pointer;filter:drop-shadow(0 0 2px #04101a)`;
  el.textContent = "→";
  return el;
}

export function AntarcticMap({ onNavigate }: { onNavigate?: (target: "iceberg" | "routes") => void }) {
  const nav = useNav();
  const mapRef = useRef<MLMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const staticMarkersRef = useRef<{ vessel?: Marker; currents: Marker[]; weather: Marker[] }>({ currents: [], weather: [] });
  const [ready, setReady] = useState(false);
  const [horizon, setHorizon] = useState<Horizon>("0h");
  const [fullscreen, setFullscreen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [vis, setVis] = useState<LayerVis>({
    vessel: true,
    icebergs: true,
    icebergPrediction: true,
    seaice: true,
    route: true,
    altRoutes: true,
    hazards: true,
    currents: false,
    weather: false,
    waypoints: true,
  });

  // ---- Init map once ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-25, -70],
      zoom: 2.6,
      minZoom: 1.2,
      maxZoom: 9,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    map.addControl(new maplibregl.ScaleControl({ unit: "nautical" }), "bottom-left");

    map.on("load", () => {
      const selRoute = nav.routes.find((r) => r.id === nav.selectedRouteId) ?? nav.routes[0];
      map.addSource("routes", { type: "geojson", data: routeLines(nav.routes, nav.selectedRouteId) });
      map.addSource("pship", { type: "geojson", data: predictedShipLine(selRoute) });
      map.addSource("waypoints", { type: "geojson", data: waypointPoints(selRoute) });
      map.addSource("bergtraj", { type: "geojson", data: icebergTrajectories(nav.icebergs, 0) });
      map.addSource("seaice", { type: "geojson", data: seaIceFills(seaIceRegions) });
      map.addSource("hazards", { type: "geojson", data: hazardZones(nav.icebergs, 0) });

      map.addLayer({ id: "seaice-fill", source: "seaice", type: "fill", paint: { "fill-color": ["get", "color"], "fill-opacity": ["interpolate", ["linear"], ["get", "concentration"], 0, 0.2, 100, 0.6] } });
      map.addLayer({ id: "seaice-line", source: "seaice", type: "line", paint: { "line-color": ["get", "color"], "line-opacity": 0.5, "line-width": 1 } });

      map.addLayer({ id: "hazard-fill", source: "hazards", type: "fill", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.14 } });
      map.addLayer({ id: "hazard-line", source: "hazards", type: "line", paint: { "line-color": ["get", "color"], "line-opacity": 0.4, "line-dasharray": [2, 2], "line-width": 1 } });

      map.addLayer({ id: "berg-corridor", source: "bergtraj", type: "fill", filter: ["==", ["get", "kind"], "corridor"], paint: { "fill-color": ["get", "color"], "fill-opacity": 0.16 } });
      map.addLayer({ id: "berg-path", source: "bergtraj", type: "line", filter: ["==", ["get", "kind"], "path"], paint: { "line-color": ["get", "color"], "line-width": 1.8, "line-dasharray": [2, 2] } });

      map.addLayer({ id: "routes-line", source: "routes", type: "line", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "color"], "line-width": ["case", ["get", "selected"], 4, 2], "line-opacity": ["case", ["get", "selected"], 1, 0.35] } });
      map.addLayer({ id: "pship-line", source: "pship", type: "line", paint: { "line-color": "#55d6e8", "line-width": 2, "line-dasharray": [2, 2], "line-opacity": 0.7 } });

      map.addLayer({ id: "waypoints-c", source: "waypoints", type: "circle", paint: { "circle-radius": 5, "circle-color": "#0a2b3d", "circle-stroke-color": "#55d6e8", "circle-stroke-width": 2 } });

      // Route + waypoint interactions
      map.on("click", "routes-line", (e: maplibregl.MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) nav.setSelectedRoute(id);
      });
      map.on("click", "waypoints-c", (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string>;
        new Popup({ offset: 12, className: "anm-popup" })
          .setLngLat((f.geometry as Point).coordinates as [number, number])
          .setHTML(
            `<div class="anm-pop"><div class="anm-pop-h">${p.name}</div>
             <div class="anm-row"><span>Latitude</span><b>${Math.abs(+p.lat).toFixed(2)}°S</b></div>
             <div class="anm-row"><span>Longitude</span><b>${Math.abs(+p.lon).toFixed(2)}°W</b></div>
             <div class="anm-row"><span>ETA</span><b>${p.eta}</b></div>
             <div class="anm-row"><span>Leg distance</span><b>${p.legNm} nm</b></div>
             <div class="anm-row"><span>Conditions</span><b>${environment.windSpeedKn} kn ${environment.windDir}</b></div>
             <div class="anm-row"><span>Risk</span><b class="anm-${p.risk}">${p.risk.toUpperCase()}</b></div></div>`,
          )
          .addTo(map);
      });
      for (const id of ["routes-line", "waypoints-c"]) {
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      }

      // Static markers: vessel, currents, weather
      const vEl = makeVesselEl();
      vEl.addEventListener("click", () => {
        new Popup({ offset: 16, className: "anm-popup" })
          .setLngLat([vessel.position.lon, vessel.position.lat])
          .setHTML(
            `<div class="anm-pop"><div class="anm-pop-h">${vessel.name}</div>
             <div class="anm-row"><span>Latitude</span><b>${Math.abs(vessel.position.lat).toFixed(2)}°S</b></div>
             <div class="anm-row"><span>Longitude</span><b>${Math.abs(vessel.position.lon).toFixed(2)}°W</b></div>
             <div class="anm-row"><span>Speed</span><b>${vessel.speedKn} kn</b></div>
             <div class="anm-row"><span>Heading</span><b>${vessel.headingDeg}°</b></div>
             <div class="anm-row"><span>Status</span><b class="anm-low">${vessel.status.toUpperCase()}</b></div>
             <div class="anm-row"><span>Destination</span><b>Research Station</b></div>
             <div class="anm-row"><span>ETA</span><b>4d 6h (demo)</b></div></div>`,
          )
          .addTo(map);
      });
      staticMarkersRef.current.vessel = new Marker({ element: vEl }).setLngLat([vessel.position.lon, vessel.position.lat]).addTo(map);

      staticMarkersRef.current.currents = currents.map((c) => {
        const el = makeArrowEl(c.angleDeg, "#55d6e8");
        el.addEventListener("click", () => {
          new Popup({ offset: 10, className: "anm-popup" })
            .setLngLat([c.from.lon, c.from.lat])
            .setHTML(
              `<div class="anm-pop"><div class="anm-pop-h">Ocean Current</div>
               <div class="anm-row"><span>Speed</span><b>${(c.strength).toFixed(1)} kn</b></div>
               <div class="anm-row"><span>Direction</span><b>${c.angleDeg}°</b></div>
               <div class="anm-row"><span>Location</span><b>${Math.abs(c.from.lat).toFixed(1)}°S ${Math.abs(c.from.lon).toFixed(1)}°W</b></div></div>`,
            )
            .addTo(map);
        });
        return new Marker({ element: el }).setLngLat([c.from.lon, c.from.lat]).addTo(map);
      });

      staticMarkersRef.current.weather = currents.slice(0, 4).map((c, i) => {
        const el = makeArrowEl(c.angleDeg + 30, "#8ccfe0");
        el.addEventListener("click", () => {
          new Popup({ offset: 10, className: "anm-popup" })
            .setLngLat([c.from.lon + 1, c.from.lat + 0.6])
            .setHTML(
              `<div class="anm-pop"><div class="anm-pop-h">Weather · Demo</div>
               <div class="anm-row"><span>Wind</span><b>${environment.windSpeedKn + i} kn ${environment.windDir}</b></div>
               <div class="anm-row"><span>Temp</span><b>${environment.airTempC}°C</b></div>
               <div class="anm-row"><span>Visibility</span><b>${environment.visibilityKm} km</b></div>
               <div class="anm-row"><span>Wave height</span><b>2.4 m</b></div></div>`,
            )
            .addTo(map);
        });
        return new Marker({ element: el }).setLngLat([c.from.lon + 1, c.from.lat + 0.6]).addTo(map);
      });

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Update sources on state change ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const selRoute = nav.routes.find((r) => r.id === nav.selectedRouteId) ?? nav.routes[0];
    const f = HORIZON_FRACTION[horizon];
    (map.getSource("routes") as maplibregl.GeoJSONSource)?.setData(routeLines(nav.routes, nav.selectedRouteId));
    (map.getSource("pship") as maplibregl.GeoJSONSource)?.setData(predictedShipLine(selRoute));
    (map.getSource("waypoints") as maplibregl.GeoJSONSource)?.setData(waypointPoints(selRoute));
    (map.getSource("bergtraj") as maplibregl.GeoJSONSource)?.setData(icebergTrajectories(nav.icebergs, f));
    (map.getSource("hazards") as maplibregl.GeoJSONSource)?.setData(hazardZones(nav.icebergs, f));
  }, [ready, nav.routes, nav.selectedRouteId, nav.icebergs, horizon]);

  // ---- Rebuild iceberg markers when horizon/selection changes ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (!vis.icebergs) return;
    const f = HORIZON_FRACTION[horizon];
    for (const { ib, lon, lat } of icebergPositionsAt(nav.icebergs, f)) {
      const color = RISK_COLORS[ib.riskLevel];
      const el = makeIcebergEl(color, ib.id === nav.selectedIcebergId);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        nav.setSelectedIceberg(ib.id);
        const node = document.createElement("div");
        node.innerHTML = `<div class="anm-pop"><div class="anm-pop-h">${ib.id}</div>
          <div class="anm-row"><span>Position</span><b>${Math.abs(lat).toFixed(2)}°S ${Math.abs(lon).toFixed(2)}°W</b></div>
          <div class="anm-row"><span>Speed</span><b>${ib.speedMs} m/s</b></div>
          <div class="anm-row"><span>Heading</span><b>${ib.headingDeg}°</b></div>
          <div class="anm-row"><span>Horizon</span><b>72 hours</b></div>
          <div class="anm-row"><span>Confidence</span><b>${ib.confidence}%</b></div>
          <div class="anm-row"><span>Risk to route</span><b class="anm-${ib.riskLevel}">${ib.riskLevel.toUpperCase()}</b></div>
          <div class="anm-row"><span>Closest approach</span><b>+14h (demo)</b></div>
          <div class="anm-pop-note">Simulated prediction · uncertainty corridor shown on map</div></div>`;
        const btns = document.createElement("div");
        btns.className = "anm-pop-btns";
        const b1 = document.createElement("button");
        b1.textContent = "View Prediction";
        b1.onclick = () => onNavigate?.("iceberg");
        const b2 = document.createElement("button");
        b2.textContent = "View Route Impact";
        b2.onclick = () => onNavigate?.("routes");
        btns.append(b1, b2);
        node.firstElementChild!.appendChild(btns);
        new Popup({ offset: 14, className: "anm-popup" }).setLngLat([lon, lat]).setDOMContent(node).addTo(map);
      });
      markersRef.current.push(new Marker({ element: el }).setLngLat([lon, lat]).addTo(map));
    }
  }, [ready, horizon, nav.icebergs, nav.selectedIcebergId, vis.icebergs, onNavigate]);

  // ---- Toggle layer visibility ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const set = (layer: string, on: boolean) =>
      map.getLayer(layer) && map.setLayoutProperty(layer, "visibility", on ? "visible" : "none");
    set("seaice-fill", vis.seaice);
    set("seaice-line", vis.seaice);
    set("hazard-fill", vis.hazards);
    set("hazard-line", vis.hazards);
    set("berg-corridor", vis.icebergPrediction);
    set("berg-path", vis.icebergPrediction);
    set("routes-line", vis.altRoutes || vis.route);
    set("pship-line", vis.route);
    set("waypoints-c", vis.waypoints);
    staticMarkersRef.current.vessel?.getElement().style.setProperty("display", vis.vessel ? "block" : "none");
    staticMarkersRef.current.currents.forEach((m) => m.getElement().style.setProperty("display", vis.currents ? "block" : "none"));
    staticMarkersRef.current.weather.forEach((m) => m.getElement().style.setProperty("display", vis.weather ? "block" : "none"));
  }, [ready, vis]);

  useEffect(() => {
    if (ready) setTimeout(() => mapRef.current?.resize(), 60);
  }, [fullscreen, ready]);

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const map = mapRef.current;
    if (!map) return;
    const q = query.trim().toLowerCase();
    if (!q) return;
    const coordMatch = q.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if (coordMatch) {
      map.flyTo({ center: [+coordMatch[2], +coordMatch[1]], zoom: 5 });
      return;
    }
    if (q.includes("vessel") || q.includes("polar star")) {
      map.flyTo({ center: [vessel.position.lon, vessel.position.lat], zoom: 5 });
      return;
    }
    const berg = nav.icebergs.find((i) => i.id.toLowerCase().includes(q));
    if (berg) {
      nav.setSelectedIceberg(berg.id);
      map.flyTo({ center: [berg.position.lon, berg.position.lat], zoom: 5.5 });
      return;
    }
    const selRoute = nav.routes.find((r) => r.id === nav.selectedRouteId)!;
    const wp = selRoute.coordinates.find((_, i) => q.includes(String(i)) || q.includes("waypoint"));
    if (wp) map.flyTo({ center: [wp.lon, wp.lat], zoom: 5 });
  };

  return (
    <div ref={containerRef} className={cx("relative h-full w-full overflow-hidden rounded-md border border-[#1d445c]/70", fullscreen && "fixed inset-0 z-[60] rounded-none")}>
      {/* Search */}
      <form onSubmit={runSearch} className="absolute left-1/2 top-3 z-10 flex w-[300px] max-w-[80%] -translate-x-1/2 items-center gap-2 rounded-md border border-[#1d445c] bg-[#071521]/95 px-3 py-2 backdrop-blur">
        <Search size={14} className="text-[#91aeb9]" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search iceberg ID, vessel, waypoint, or lat,lon…" className="w-full bg-transparent text-[12px] text-[#eaf6f8] outline-none placeholder:text-[#5f7d89]" />
      </form>

      {/* Layer control */}
      <div className="absolute right-3 top-3 z-10 w-52 rounded-md border border-[#1d445c]/70 bg-[#071521]/92 p-2 backdrop-blur">
        <div className="flex items-center justify-between px-1.5 pb-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9]">Map Layers</span>
          <button onClick={() => setFullscreen((f) => !f)} className="text-[#8ccfe0] hover:text-[#55d6e8]" aria-label="Toggle fullscreen">
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
        <div className="max-h-[210px] overflow-y-auto">
          {LAYER_LABELS.map((l) => (
            <label key={l.key} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] text-[#c8dde3] hover:bg-[#132f40]">
              <input type="checkbox" checked={vis[l.key]} onChange={() => setVis((v) => ({ ...v, [l.key]: !v[l.key] }))} className="accent-[#55d6e8]" />
              {l.label}
            </label>
          ))}
        </div>
      </div>

      {/* Time control */}
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-md border border-[#1d445c]/70 bg-[#071521]/92 p-1 backdrop-blur">
        <span className="px-2 font-mono text-[9px] uppercase tracking-widest text-[#91aeb9]">Forecast</span>
        {HORIZONS.map((h) => (
          <button key={h} onClick={() => setHorizon(h)} className={cx("rounded-sm px-2.5 py-1 font-mono text-[11px] font-semibold uppercase transition-colors", horizon === h ? "bg-[#55d6e8]/20 text-[#55d6e8]" : "text-[#91aeb9] hover:text-[#eaf6f8]")}>
            {h === "0h" ? "Now" : `+${h}`}
          </button>
        ))}
      </div>

      {/* Legend (collapsible) */}
      <div className="absolute bottom-3 right-3 z-10 rounded-md border border-[#1d445c]/70 bg-[#071521]/92 backdrop-blur">
        <button onClick={() => setLegendOpen((o) => !o)} className="flex w-full items-center justify-between gap-6 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9]">
          Legend <span className="text-[#8ccfe0]">{legendOpen ? "–" : "+"}</span>
        </button>
        {legendOpen && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-2.5 pb-2.5">
            {LEGEND.map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                {l.dashed ? (
                  <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: l.color }} />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                )}
                <span className="text-[10px] text-[#c8dde3]">{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mock-data notice */}
      <div className="pointer-events-none absolute left-3 top-16 z-10 flex items-center gap-1.5 rounded-sm border border-[#f5b942]/40 bg-[#071521]/90 px-2 py-1 backdrop-blur">
        <Ship size={11} className="text-[#f5b942]" />
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[#f5b942]">Demo data · simulated prediction</span>
      </div>
    </div>
  );
}
