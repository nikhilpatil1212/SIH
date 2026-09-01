import { useMemo, useState } from "react";

import {
  Compass,
  Layers,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Route as RouteIcon,
  ShieldAlert,
  Ship,
  Snowflake,
  Triangle,
  Waves,
  Wind,
} from "lucide-react";
import { PredictionCard } from "../components/PredictionCard";
import MapView, { type LayerState } from "../components/map/MapView";
import { AntarcticPolarMap } from "../components/map/AntarcticPolarMap";
import {
  AIRouteRecommendationCard,
  AlertsPanel,
  EnvironmentalCard,
  RiskFactors,
  RouteComparison,
  VesselCard,
} from "../components/panels";
import { Card, cx } from "../components/ui/primitives";
import { environment, riskFactorsByRoute, vessel } from "../data/mock";
import { useNav } from "../state";
import type { PageId } from "../components/Sidebar";

export function Dashboard({ onNavigate }: { onNavigate?: (p: PageId) => void }) {
  const nav = useNav();
  const selectedRoute = nav.routes.find((r) => r.id === nav.selectedRouteId) || nav.routes[0];
  const recommendedRoute = nav.routes.find((r) => r.id === nav.recommendedRouteId) || nav.routes[1];
  const selectedIceberg = nav.icebergs.find((i) => i.id === nav.selectedIcebergId) ?? nav.icebergs[0];

  const [viewMode, setViewMode] = useState<"polar" | "tactical">("polar");
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeKpiFilter, setActiveKpiFilter] = useState<string | null>(null);

  const dynamicKpis = useMemo(() => {
    const totalCount = nav.icebergs.length;
    const highRiskCount = nav.icebergs.filter((i) => i.riskLevel === "high").length;
    const activeHazardsCount = nav.hazards.filter((h) => h.status === "active").length;
    const currentRoute = nav.hasActiveRoute ? selectedRoute : null;
    return [
      { label: "Tracked Icebergs", value: `${totalCount}`, accent: "#8ccfe0", tag: "USNIC FEED" },
      { label: "Active Collision Hazards", value: `${activeHazardsCount}`, accent: "#ff5c5c", tag: "IMPACT WARNING" },
      { label: "Polar Pack Ice", value: "35%", accent: "#55d6e8", tag: "SAT RADAR" },
      { label: "Voyage Risk Index", value: currentRoute ? `${currentRoute.riskScore || 32}/100` : "STANDBY", accent: currentRoute && (currentRoute.riskScore || 32) > 60 ? "#ff5c5c" : "#0284c7", tag: "SAFE CORRIDOR" },
      { label: "High-Risk Bergs", value: `${highRiskCount}`, accent: "#f59e0b", tag: "ML ENSEMBLE" },
    ];
  }, [nav.icebergs, nav.hazards, nav.hasActiveRoute, selectedRoute]);

  const [layers, setLayers] = useState<LayerState>({
    icebergs: true,
    seaice: true,
    currents: true,
    weather: false,
  });

  const handleKpiClick = (label: string) => {
    setActiveKpiFilter(label === activeKpiFilter ? null : label);
    if (label.includes("Iceberg") || label.includes("Bergs")) {
      const topBerg = nav.icebergs.find((i) => i.id === "A76C") || nav.icebergs[0];
      if (topBerg) nav.setSelectedIceberg(topBerg.id);
    } else if (label.includes("Hazard") || label.includes("Collision")) {
      nav.setSelectedRoute("route-a");
    } else if (label.includes("Risk Index")) {
      nav.setSelectedRoute("route-b");
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {/* 1. Actionable Top KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {dynamicKpis.map((k) => {
          const isActive = activeKpiFilter === k.label;
          return (
            <button
              key={k.label}
              onClick={() => handleKpiClick(k.label)}
              className={cx(
                "rounded-md border p-3 text-left shadow-sm transition-all cursor-pointer",
                isActive
                  ? "border-[#55d6e8] bg-[#0d2433] shadow-[0_0_12px_#55d6e8]/20 scale-[1.02]"
                  : "border-[#1d445c]/60 bg-[#132f40]/70 hover:border-[#55d6e8]/40 light:border-[#e2d8c7] light:bg-white",
              )}
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
            </button>
          );
        })}
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_360px]">
        {/* Left Column: Interactive Polar/Tactical Map & Environmental Intelligence */}
        <div className="flex flex-col gap-3">
          {/* Main Map Card */}
          <div
            className={cx(
              "flex flex-col overflow-hidden rounded-xl border border-[#1d445c]/80 bg-[#071521] light:border-[#e2d8c7] light:bg-white shadow-lg transition-colors",
              fullscreen ? "fixed inset-3 z-50 h-[calc(100vh-24px)]" : "h-[540px]",
            )}
          >
            {/* Map Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1d445c]/60 light:border-[#e2d8c7] bg-[#0c2333]/90 light:bg-[#f8f5ee] px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6.5 w-6.5 items-center justify-center rounded-md bg-[#55d6e8]/15 text-[#55d6e8] light:bg-[#0f768e]/15 light:text-[#0f768e]">
                  <Compass size={15} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#eaf6f8] light:text-[#0d2433]">
                      Operational Polar Chart
                    </span>
                    <span className="flex items-center gap-1 rounded bg-[#0284c7]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#0284c7] light:text-[#0369a1]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0284c7] light:bg-[#0369a1]" />
                      AIS LIVE
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-[#91aeb9] light:text-[#5a7686]">
                    {nav.hasActiveRoute ? (
                      <>
                        Active Corridor: <span className="font-semibold text-[#55d6e8] light:text-[#0f768e]">{selectedRoute.name}</span> (Recommended: {recommendedRoute.name})
                      </>
                    ) : (
                      <span>No active route selected · Enter passage plan</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls: Distance Unit Toggle & Map Mode Toggles */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Distance Unit Toggle (NM / KM) */}
                <div className="flex items-center gap-1 rounded-md border border-[#1d445c]/60 bg-[#071521]/80 light:border-[#d8d0c2] light:bg-[#eee8dc] p-0.5">
                  <span className="px-1.5 font-mono text-[9px] font-semibold uppercase text-[#91aeb9] light:text-[#5a7686]">
                    UNIT:
                  </span>
                  <button
                    onClick={() => nav.setDistanceUnit("NM")}
                    className={cx(
                      "rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-colors",
                      nav.distanceUnit === "NM"
                        ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white shadow-sm"
                        : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
                    )}
                  >
                    NM
                  </button>
                  <button
                    onClick={() => nav.setDistanceUnit("KM")}
                    className={cx(
                      "rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-colors",
                      nav.distanceUnit === "KM"
                        ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white shadow-sm"
                        : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
                    )}
                  >
                    KM
                  </button>
                </div>

                <div className="flex items-center rounded-md border border-[#1d445c]/60 bg-[#071521]/80 light:border-[#d8d0c2] light:bg-[#eee8dc] p-0.5">
                  <button
                    onClick={() => setViewMode("polar")}
                    className={cx(
                      "flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider transition-colors",
                      viewMode === "polar"
                        ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white shadow-sm"
                        : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
                    )}
                  >
                    <Compass size={13} />
                    Pan-Antarctic
                  </button>
                  <button
                    onClick={() => setViewMode("tactical")}
                    className={cx(
                      "flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider transition-colors",
                      viewMode === "tactical"
                        ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white shadow-sm"
                        : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
                    )}
                  >
                    <MapIcon size={13} />
                    Tactical Sector
                  </button>
                </div>
              </div>
            </div>

            {/* Map Canvas Area */}
            <div className="relative flex-1 min-h-0 overflow-hidden bg-[#050d17]">
              {viewMode === "polar" ? (
                <AntarcticPolarMap
                  routes={nav.hasActiveRoute ? nav.routes : []}
                  selectedRouteId={nav.selectedRouteId}
                  onSelectRoute={nav.setSelectedRoute}
                  icebergs={nav.icebergs}
                  selectedIcebergId={nav.selectedIcebergId}
                  onSelectIceberg={nav.setSelectedIceberg}
                  vessel={{
                    name: vessel.name,
                    position: { lat: vessel.position.lat, lon: vessel.position.lon },
                    headingDeg: vessel.headingDeg,
                    speedKn: vessel.speedKn,
                    status: vessel.status,
                  }}
                  showMaximize={false}
                  compact={true}
                  className="h-full w-full border-none rounded-none"
                />
              ) : (
                <MapView
                  routes={nav.hasActiveRoute ? nav.routes : []}
                  icebergs={nav.icebergs}
                  selectedRouteId={nav.selectedRouteId}
                  onSelectRoute={nav.setSelectedRoute}
                  selectedIcebergId={nav.selectedIcebergId}
                  onSelectIceberg={nav.setSelectedIceberg}
                  layers={layers}
                  zoom={zoom}
                />
              )}
            </div>

            {/* Bottom Telemetry Footer Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1d445c]/60 light:border-[#e2d8c7] bg-[#0c2333]/90 light:bg-[#f8f5ee] px-3.5 py-1.5 font-mono text-[10px]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[#55d6e8] light:text-[#0f768e] font-semibold">
                  <Ship size={12} /> {vessel.name} ({vessel.status})
                </span>
                <span className="text-[#91aeb9] light:text-[#5a7686]">
                  HDG {vessel.headingDeg}° · {vessel.speedKn} kn · POS {Math.abs(vessel.position.lat).toFixed(2)}°S {Math.abs(vessel.position.lon).toFixed(2)}°W
                </span>
              </div>
              <div className="flex items-center gap-3">
                {nav.hasActiveRoute ? (
                  <span className="text-[#91aeb9] light:text-[#5a7686]">
                    Active Corridor: <b className="text-[#eaf6f8] light:text-[#0d2433]">{selectedRoute.name}</b> ({nav.formatDistance(selectedRoute.distanceNm)} · {selectedRoute.eta})
                  </span>
                ) : (
                  <span className="text-[#91aeb9] light:text-[#5a7686]">
                    Status: <b className="text-[#f5b942]">Awaiting Passage Plan</b>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Environmental and Iceberg Prediction Cards */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <EnvironmentalCard env={environment} />
            <PredictionCard iceberg={selectedIceberg} />
          </div>
        </div>

        {/* Right Column: AI Decision Support & Operational Panels */}
        <div className="flex min-w-0 flex-col gap-3">
          {nav.hasActiveRoute ? (
            <>
              <AIRouteRecommendationCard recommendedRoute={recommendedRoute} />
              <RouteComparison
                routes={nav.routes}
                selectedId={nav.selectedRouteId}
                recommendedId={nav.recommendedRouteId}
                onSelect={nav.setSelectedRoute}
              />
              <VesselCard vessel={vessel} />
              <RiskFactors factors={riskFactorsByRoute[nav.selectedRouteId]} routeName={selectedRoute.name} />
              <AlertsPanel alerts={nav.alerts} />
            </>
          ) : (
            <>
              {/* Clean Initial State for Dashboard Right Panel */}
              <div className="rounded-xl border border-[#1d445c]/80 bg-[#0c2333]/90 light:border-[#e2d8c7] light:bg-white p-5 shadow-lg flex flex-col gap-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#55d6e8]/15 text-[#55d6e8] light:bg-[#0f768e]/15 light:text-[#0f768e]">
                  <RouteIcon size={24} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold uppercase tracking-wider text-[#eaf6f8] light:text-[#0d2433]">
                    NO ACTIVE ROUTE
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#91aeb9] light:text-[#5a7686]">
                    Enter departure and destination in Route Planning to calculate an optimized Antarctic navigation route.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate?.("routes")}
                  className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-[#55d6e8] px-5 py-2.5 font-mono text-[12px] font-bold text-[#071521] shadow hover:bg-[#7be3f2] light:bg-[#0f768e] light:text-white transition-all cursor-pointer"
                >
                  <Navigation size={14} /> Calculate Passage Route
                </button>
              </div>
              <VesselCard vessel={vessel} />
              <AlertsPanel alerts={nav.alerts} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

