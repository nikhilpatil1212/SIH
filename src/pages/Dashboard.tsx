import { useState } from "react";
import {
  Compass,
  Globe2,
  Layers,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  ShieldAlert,
  Ship,
  Snowflake,
  Triangle,
  Waves,
  Wind,
} from "lucide-react";
import { PredictionCard } from "../components/PredictionCard";
import { Workflow } from "../components/Workflow";
import { Globe } from "../components/globe/Globe";
import MapView, { type LayerState } from "../components/map/MapView";
import { AlertsPanel, EnvironmentalCard, RiskFactors, RouteComparison, VesselCard } from "../components/panels";
import { Card, cx } from "../components/ui/primitives";
import { environment, riskFactorsByRoute, vessel } from "../data/mock";
import { dashboardKpis } from "../data/phase2";
import type { Horizon } from "../data/types";
import { useNav } from "../state";

const HORIZON_FRACTIONS: Record<Horizon, number> = {
  "0h": 0.001,
  "6h": 0.12,
  "12h": 0.25,
  "24h": 0.45,
  "48h": 0.75,
  "72h": 1,
};

const FORECAST_HORIZONS: Horizon[] = ["0h", "12h", "24h", "48h", "72h"];

export function Dashboard() {
  const nav = useNav();
  const selectedRoute = nav.routes.find((r) => r.id === nav.selectedRouteId)!;
  const selectedIceberg = nav.icebergs.find((i) => i.id === nav.selectedIcebergId) ?? nav.icebergs[0];

  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [horizon, setHorizon] = useState<Horizon>("0h");
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [layers, setLayers] = useState<LayerState>({
    icebergs: true,
    seaice: true,
    currents: true,
    weather: false,
  });

  const toggleLayer = (key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleZoom = (delta: number) => {
    setZoom((z) => Math.max(0.8, Math.min(2.5, +(z + delta).toFixed(2))));
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {/* KPI overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {dashboardKpis.map((k) => (
          <div
            key={k.label}
            className="rounded-md border border-[#1d445c]/60 bg-[#132f40]/70 light:border-[#e2d8c7] light:bg-white px-3.5 py-2.5 shadow-sm transition-colors"
          >
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#91aeb9] light:text-[#5a7686]">
                {k.label}
              </span>
              <span className="rounded-sm bg-[#f5b942]/15 px-1 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-[#f5b942] light:text-[#d97706]">
                {k.tag}
              </span>
            </div>
            <div className="font-mono text-[20px] font-semibold tnum text-[#eaf6f8] light:text-[#0d2433]" style={{ color: k.accent }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <Workflow />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_360px]">
        {/* Map hero + bottom cards */}
        <div className="flex flex-col gap-3">
          {/* Main Interactive Map Card */}
          <div
            className={cx(
              "flex flex-col overflow-hidden rounded-xl border border-[#1d445c]/80 bg-[#071521] light:border-[#e2d8c7] light:bg-white shadow-lg transition-colors",
              fullscreen ? "fixed inset-3 z-50 h-[calc(100vh-24px)]" : "h-[530px]",
            )}
          >
            {/* Map Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1d445c]/60 light:border-[#e2d8c7] bg-[#0c2333]/90 light:bg-[#f8f5ee] px-3.5 py-2.5">
              {/* Left Title & Status */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#55d6e8]/15 text-[#55d6e8] light:bg-[#0f768e]/15 light:text-[#0f768e]">
                  <Compass size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#eaf6f8] light:text-[#0d2433]">
                      Operational Polar Chart
                    </span>
                    <span className="flex items-center gap-1 rounded bg-[#46d7a1]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#46d7a1] light:text-[#059669]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#46d7a1] light:bg-[#059669]" />
                      AIS LIVE
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-[#91aeb9] light:text-[#5a7686]">
                    Weddell Sea Sector · 64°S–74°S · Selected: <span className="font-semibold text-[#55d6e8] light:text-[#0f768e]">{selectedRoute.name}</span>
                  </div>
                </div>
              </div>

              {/* Right Controls: Timeline, 2D/3D Toggle, Fullscreen */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Forecast Timeline */}
                <div className="hidden sm:flex items-center gap-1 rounded-md border border-[#1d445c]/60 bg-[#071521]/80 light:border-[#d8d0c2] light:bg-[#eee8dc] p-0.5">
                  <span className="px-1.5 font-mono text-[9px] font-semibold uppercase text-[#91aeb9] light:text-[#5a7686]">
                    Forecast:
                  </span>
                  {FORECAST_HORIZONS.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHorizon(h)}
                      className={cx(
                        "rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-colors",
                        horizon === h
                          ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white"
                          : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
                      )}
                    >
                      {h === "0h" ? "Now" : `+${h}`}
                    </button>
                  ))}
                </div>

                {/* 2D Tactical Chart / 3D Earth Globe Switcher */}
                <div className="flex items-center rounded-md border border-[#1d445c]/60 bg-[#071521]/80 light:border-[#d8d0c2] light:bg-[#eee8dc] p-0.5">
                  <button
                    onClick={() => setViewMode("2d")}
                    className={cx(
                      "flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
                      viewMode === "2d"
                        ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white shadow-sm"
                        : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
                    )}
                    title="2D Tactical Polar Chart (High Visibility)"
                  >
                    <MapIcon size={13} />
                    2D Chart
                  </button>
                  <button
                    onClick={() => setViewMode("3d")}
                    className={cx(
                      "flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
                      viewMode === "3d"
                        ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white shadow-sm"
                        : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
                    )}
                    title="3D Earth Globe (NASA High-Res)"
                  >
                    <Globe2 size={13} />
                    3D Globe
                  </button>
                </div>

                {/* Fullscreen Button */}
                <button
                  onClick={() => setFullscreen((f) => !f)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[#1d445c]/60 bg-[#071521]/80 text-[#91aeb9] hover:bg-[#132f40] hover:text-[#55d6e8] light:border-[#d8d0c2] light:bg-[#eee8dc] light:text-[#5a7686] light:hover:text-[#0d2433] transition-colors"
                  title={fullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                  aria-label="Toggle Fullscreen"
                >
                  {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            {/* Map Canvas / Globe Area */}
            <div className="relative flex-1 min-h-0 overflow-hidden bg-[#050d17] light:bg-[#dbebf3]">
              {viewMode === "2d" ? (
                <MapView
                  routes={nav.routes}
                  icebergs={nav.icebergs}
                  selectedRouteId={nav.selectedRouteId}
                  onSelectRoute={nav.setSelectedRoute}
                  selectedIcebergId={nav.selectedIcebergId}
                  onSelectIceberg={nav.setSelectedIceberg}
                  layers={layers}
                  zoom={zoom}
                  horizonFraction={HORIZON_FRACTIONS[horizon]}
                />
              ) : (
                <Globe
                  routes={nav.routes}
                  selectedRouteId={nav.selectedRouteId}
                  showRoutes
                  vessel={vessel}
                  icebergs={nav.icebergs}
                  showTrajectories
                  selectedIcebergId={nav.selectedIcebergId}
                  onSelectIceberg={nav.setSelectedIceberg}
                  horizonFraction={HORIZON_FRACTIONS[horizon]}
                />
              )}

              {/* Floating Map HUD Layers Toolbar (for 2D Map) */}
              {viewMode === "2d" && (
                <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-1 rounded-md border border-[#1d445c]/80 bg-[#071521]/90 light:border-[#d8d0c2] light:bg-[#ffffff]/90 p-1 backdrop-blur shadow-md">
                    <button
                      onClick={() => toggleLayer("icebergs")}
                      className={cx(
                        "flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-semibold transition-colors",
                        layers.icebergs
                          ? "bg-[#ff5c5c]/20 text-[#ff7070] light:bg-[#dc2626]/15 light:text-[#b91c1c]"
                          : "text-[#627d8e] opacity-60",
                      )}
                      title="Toggle Icebergs & Trajectories"
                    >
                      <Triangle size={11} /> Icebergs
                    </button>
                    <button
                      onClick={() => toggleLayer("seaice")}
                      className={cx(
                        "flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-semibold transition-colors",
                        layers.seaice
                          ? "bg-[#55d6e8]/20 text-[#55d6e8] light:bg-[#0284c7]/15 light:text-[#0369a1]"
                          : "text-[#627d8e] opacity-60",
                      )}
                      title="Toggle Sea-Ice Polygons"
                    >
                      <Snowflake size={11} /> Sea Ice
                    </button>
                    <button
                      onClick={() => toggleLayer("currents")}
                      className={cx(
                        "flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-semibold transition-colors",
                        layers.currents
                          ? "bg-[#38bdf8]/20 text-[#38bdf8] light:bg-[#0284c7]/15 light:text-[#0284c7]"
                          : "text-[#627d8e] opacity-60",
                      )}
                      title="Toggle Ocean Currents"
                    >
                      <Waves size={11} /> Currents
                    </button>
                    <button
                      onClick={() => toggleLayer("weather")}
                      className={cx(
                        "flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-semibold transition-colors",
                        layers.weather
                          ? "bg-[#f5b942]/20 text-[#f5b942] light:bg-[#d97706]/15 light:text-[#b45309]"
                          : "text-[#627d8e] opacity-60",
                      )}
                      title="Toggle Wind & Weather Barbs"
                    >
                      <Wind size={11} /> Weather
                    </button>
                  </div>
                </div>
              )}

              {/* Floating Zoom Controls for 2D View */}
              {viewMode === "2d" && (
                <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-[#1d445c]/80 bg-[#071521]/90 light:border-[#d8d0c2] light:bg-[#ffffff]/90 p-1 backdrop-blur shadow-md">
                  <button
                    onClick={() => handleZoom(0.2)}
                    className="flex h-7 w-7 items-center justify-center rounded text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686] light:hover:bg-[#f0ece1] light:hover:text-[#0d2433] transition-colors"
                    title="Zoom In"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => handleZoom(-0.2)}
                    className="flex h-7 w-7 items-center justify-center rounded text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686] light:hover:bg-[#f0ece1] light:hover:text-[#0d2433] transition-colors"
                    title="Zoom Out"
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="flex h-7 w-7 items-center justify-center rounded text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8] light:text-[#5a7686] light:hover:bg-[#f0ece1] light:hover:text-[#0d2433] transition-colors"
                    title="Reset Zoom"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Telemetry Footer Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1d445c]/60 light:border-[#e2d8c7] bg-[#0c2333]/90 light:bg-[#f8f5ee] px-3.5 py-1.5 font-mono text-[10px]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[#55d6e8] light:text-[#0f768e] font-semibold">
                  <Ship size={12} /> {vessel.name} ({vessel.status})
                </span>
                <span className="text-[#91aeb9] light:text-[#5a7686]">
                  HDG {vessel.headingDeg}° · {vessel.speedKn} kn · POS {Math.abs(vessel.position.lat).toFixed(1)}°S {Math.abs(vessel.position.lon).toFixed(1)}°W
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#91aeb9] light:text-[#5a7686]">
                  Active Corridor: <b className="text-[#eaf6f8] light:text-[#0d2433]">{selectedRoute.name}</b> ({selectedRoute.distanceNm} nm · {selectedRoute.eta})
                </span>
              </div>
            </div>
          </div>

          {/* Environmental and Iceberg Prediction Cards */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <EnvironmentalCard env={environment} />
            <PredictionCard iceberg={selectedIceberg} />
          </div>
        </div>

        {/* Right information column */}
        <div className="flex min-w-0 flex-col gap-3">
          <VesselCard vessel={vessel} />
          <RouteComparison
            routes={nav.routes}
            selectedId={nav.selectedRouteId}
            recommendedId={nav.recommendedRouteId}
            onSelect={nav.setSelectedRoute}
          />
          <RiskFactors factors={riskFactorsByRoute[nav.selectedRouteId]} routeName={selectedRoute.name} />
          <AlertsPanel alerts={nav.alerts} />
        </div>
      </div>
    </div>
  );
}
