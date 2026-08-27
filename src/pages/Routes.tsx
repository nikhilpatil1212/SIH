import { useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  Clock,
  Compass,
  Gauge,
  Layers,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  Shield,
  Ship,
  Sparkles,
} from "lucide-react";
import { RouteComparison, RiskFactors } from "../components/panels";
import { AntarcticPolarMap } from "../components/map/AntarcticPolarMap";
import { Card, Metric, RiskMeter, RISK_COLORS, cx } from "../components/ui/primitives";
import { riskFactorsByRoute, vessel } from "../data/mock";
import type { RiskLevel } from "../data/types";
import { useNav } from "../state";
import type { PageId } from "../components/Sidebar";

const START_PRESETS = [
  { id: "capetown", name: "Port of Cape Town", lat: -33.92, lon: 18.42, flag: "🇿🇦" },
  { id: "ushuaia", name: "Port of Ushuaia", lat: -54.8, lon: -68.3, flag: "🇦🇷" },
  { id: "hobart", name: "Port of Hobart", lat: -42.88, lon: 147.32, flag: "🇦🇺" },
  { id: "puntaarenas", name: "Punta Arenas", lat: -53.16, lon: -70.91, flag: "🇨🇱" },
  { id: "goa", name: "NCPOR Expedition Base / Mormugao", lat: 15.4, lon: 73.8, flag: "🇮🇳" },
  { id: "custom", name: "Custom Latitude / Longitude...", lat: -34.0, lon: 18.0, flag: "📍" },
];

const DESTINATION_PRESETS = [
  { id: "maitri", name: "Maitri Station · Schirmacher Oasis", lat: -70.77, lon: 11.73, flag: "🇮🇳", country: "India" },
  { id: "bharati", name: "Bharati Station · Larsemann Hills", lat: -69.41, lon: 76.19, flag: "🇮🇳", country: "India" },
  { id: "mcmurdo", name: "McMurdo Station · Ross Island", lat: -77.85, lon: 166.67, flag: "🇺🇸", country: "USA" },
  { id: "halley", name: "Halley VI Station · Brunt Ice Shelf", lat: -75.58, lon: -26.54, flag: "🇬🇧", country: "UK" },
  { id: "rothera", name: "Rothera Station · Adelaide Island", lat: -67.57, lon: -68.13, flag: "🇬🇧", country: "UK" },
  { id: "casey", name: "Casey Station · Wilkes Land", lat: -66.28, lon: 110.53, flag: "🇦🇺", country: "Australia" },
  { id: "custom", name: "Custom Latitude / Longitude...", lat: -70.0, lon: 0.0, flag: "📍", country: "Custom" },
];

const OBJECTIVES = [
  { id: "SAFEST", label: "SAFEST", desc: "Minimize collision risk & avoid high-density iceberg corridors", icon: Shield },
  { id: "SHORTEST", label: "SHORTEST", desc: "Minimize geodesic distance via direct Great Circle arc", icon: Navigation },
  { id: "BALANCED", label: "BALANCED", desc: "Optimal weighted compromise between time and safety", icon: Compass },
  { id: "FUEL EFFICIENT", label: "FUEL EFFICIENT", desc: "Maximize fuel economy utilizing favorable ocean currents", icon: Gauge },
];

export function Routes({ onNavigate }: { onNavigate?: (p: PageId) => void }) {
  const nav = useNav();
  const route = nav.routes.find((r) => r.id === nav.selectedRouteId) ?? nav.routes[0];

  // Route Planning Form State
  const [startPreset, setStartPreset] = useState("capetown");
  const [destPreset, setDestPreset] = useState("maitri");
  const [customStartLat, setCustomStartLat] = useState(-33.92);
  const [customStartLon, setCustomStartLon] = useState(18.42);
  const [customDestLat, setCustomDestLat] = useState(-70.77);
  const [customDestLon, setCustomDestLon] = useState(11.73);
  const [objective, setObjective] = useState<"SHORTEST" | "SAFEST" | "BALANCED" | "FUEL EFFICIENT">("SAFEST");
  const [speedKn, setSpeedKn] = useState(14);

  // New Waypoint Form State
  const [newWpName, setNewWpName] = useState("");
  const [newWpLat, setNewWpLat] = useState(-55.0);
  const [newWpLon, setNewWpLon] = useState(5.0);
  const [newWpBreakH, setNewWpBreakH] = useState(2);
  const [showWpForm, setShowWpForm] = useState(false);

  const isCustomStart = startPreset === "custom";
  const isCustomDest = destPreset === "custom";

  const activeStart = isCustomStart
    ? { lat: customStartLat, lon: customStartLon, name: `Custom Start (${customStartLat.toFixed(2)}°, ${customStartLon.toFixed(2)}°)` }
    : START_PRESETS.find((p) => p.id === startPreset)!;

  const activeDest = isCustomDest
    ? { lat: customDestLat, lon: customDestLon, name: `Custom Dest (${customDestLat.toFixed(2)}°, ${customDestLon.toFixed(2)}°)` }
    : DESTINATION_PRESETS.find((p) => p.id === destPreset)!;

  // Validation
  const isStartValid = customStartLat >= -90 && customStartLat <= 90 && customStartLon >= -180 && customStartLon <= 180;
  const isDestValid = customDestLat >= -90 && customDestLat <= 90 && customDestLon >= -180 && customDestLon <= 180;
  const hasCoordinateError = (isCustomStart && !isStartValid) || (isCustomDest && !isDestValid);

  const handleCalculate = async () => {
    if (hasCoordinateError) return;

    await nav.calculateNewRoutes({
      start: { lat: activeStart.lat, lon: activeStart.lon, name: activeStart.name },
      destination: { lat: activeDest.lat, lon: activeDest.lon, name: activeDest.name },
      waypoints: nav.waypoints.map((w) => ({
        lat: w.lat,
        lon: w.lon,
        name: w.name,
        breakDurationHours: w.breakDurationHours,
      })),
      objective,
      vessel_speed_kn: speedKn,
    });
  };

  const handleAddWaypoint = () => {
    if (newWpLat < -90 || newWpLat > 90 || newWpLon < -180 || newWpLon > 180) return;
    nav.addWaypoint({
      name: newWpName.trim() || `Operational Stop 0${nav.waypoints.length + 1}`,
      lat: newWpLat,
      lon: newWpLon,
      breakDurationHours: Math.max(0, newWpBreakH),
    });
    setNewWpName("");
    setShowWpForm(false);
  };

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-[430px_1fr]">
      {/* 1. Left Column: Route Planning Console */}
      <div className="flex flex-col gap-3">
        {/* Route Planning Parameter Console */}
        <Card title="Passage Planning & Route Synthesis">
          <div className="flex flex-col gap-3.5 p-3.5 font-mono text-[11px]">
            {/* Vessel Selector */}
            <div>
              <label className="mb-1 block font-bold text-[#91aeb9] light:text-[#5a7686]">
                SELECT VESSEL:
              </label>
              <div className="flex items-center gap-2 rounded-md border border-[#1d445c] bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#f6f0e4] px-3 py-2 text-[#55d6e8] light:text-[#0f768e] font-bold">
                <Ship size={14} />
                <span>{vessel.name} (PC6 Polar Ice Class)</span>
              </div>
            </div>

            {/* Departure / Start Selection */}
            <div>
              <label className="mb-1 block font-bold text-[#91aeb9] light:text-[#5a7686]">
                DEPARTURE / START POINT:
              </label>
              <select
                value={startPreset}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setStartPreset(e.target.value)}
                className="w-full rounded-md border border-[#1d445c] bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#f6f0e4] px-2.5 py-1.5 text-[#eaf6f8] light:text-[#0d2433] outline-none"
              >
                {START_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.flag} {p.name}
                  </option>
                ))}
              </select>

              {/* Custom Start Coordinate Inputs */}
              {isCustomStart && (
                <div className="mt-2 grid grid-cols-2 gap-2 rounded border border-[#55d6e8]/40 bg-[#0d2433]/70 p-2">
                  <div>
                    <span className="text-[9px] text-[#91aeb9]">Start Latitude (-90 to +90)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="-90"
                      max="90"
                      value={customStartLat}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomStartLat(parseFloat(e.target.value) || 0)}
                      className="mt-0.5 w-full rounded border border-[#1d445c] bg-[#071521] px-2 py-1 text-[11px] text-white outline-none focus:border-[#55d6e8]"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-[#91aeb9]">Start Longitude (-180 to +180)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="-180"
                      max="180"
                      value={customStartLon}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomStartLon(parseFloat(e.target.value) || 0)}
                      className="mt-0.5 w-full rounded border border-[#1d445c] bg-[#071521] px-2 py-1 text-[11px] text-white outline-none focus:border-[#55d6e8]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Destination Selection */}
            <div>
              <label className="mb-1 block font-bold text-[#91aeb9] light:text-[#5a7686]">
                ANTARCTIC DESTINATION:
              </label>
              <select
                value={destPreset}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setDestPreset(e.target.value)}
                className="w-full rounded-md border border-[#1d445c] bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#f6f0e4] px-2.5 py-1.5 text-[#eaf6f8] light:text-[#0d2433] outline-none"
              >
                {DESTINATION_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.flag} {p.name}
                  </option>
                ))}
              </select>

              {/* Custom Destination Coordinate Inputs */}
              {isCustomDest && (
                <div className="mt-2 grid grid-cols-2 gap-2 rounded border border-[#55d6e8]/40 bg-[#0d2433]/70 p-2">
                  <div>
                    <span className="text-[9px] text-[#91aeb9]">Dest Latitude (-90 to +90)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="-90"
                      max="90"
                      value={customDestLat}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomDestLat(parseFloat(e.target.value) || 0)}
                      className="mt-0.5 w-full rounded border border-[#1d445c] bg-[#071521] px-2 py-1 text-[11px] text-white outline-none focus:border-[#55d6e8]"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-[#91aeb9]">Dest Longitude (-180 to +180)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="-180"
                      max="180"
                      value={customDestLon}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomDestLon(parseFloat(e.target.value) || 0)}
                      className="mt-0.5 w-full rounded border border-[#1d445c] bg-[#071521] px-2 py-1 text-[11px] text-white outline-none focus:border-[#55d6e8]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error banner for invalid coordinates */}
            {hasCoordinateError && (
              <div className="flex items-center gap-1.5 rounded bg-[#ef4444]/20 border border-[#ef4444]/60 p-2 text-[#ef4444] text-[10px]">
                <AlertTriangle size={13} />
                <span>Latitude must be -90 to +90, Longitude -180 to +180.</span>
              </div>
            )}

            {/* 2. Route Waypoints / Break Points Section */}
            <div className="border-t border-[#1d445c]/60 pt-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-[#55d6e8] light:text-[#0f768e] flex items-center gap-1">
                  <MapPin size={12} />
                  <span>OPERATIONAL WAYPOINTS / REST STOPS ({nav.waypoints.length}):</span>
                </span>
                <button
                  onClick={() => setShowWpForm((s) => !s)}
                  className="flex items-center gap-1 rounded bg-[#55d6e8]/20 hover:bg-[#55d6e8]/30 px-2 py-0.5 text-[9.5px] font-bold text-[#55d6e8] transition-colors"
                >
                  <Plus size={11} />
                  <span>{showWpForm ? "Cancel" : "Add Stop"}</span>
                </button>
              </div>

              {/* Waypoint Addition Form */}
              {showWpForm && (
                <div className="mb-2.5 rounded-lg border border-[#55d6e8]/40 bg-[#071521] p-2.5 flex flex-col gap-2 animate-in fade-in">
                  <div>
                    <span className="text-[9px] text-[#91aeb9]">Stop / Break Point Name:</span>
                    <input
                      type="text"
                      placeholder="e.g. Bouvet Island Staging Break"
                      value={newWpName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNewWpName(e.target.value)}
                      className="mt-0.5 w-full rounded border border-[#1d445c] bg-[#0d2433] px-2 py-1 text-[11px] text-white outline-none focus:border-[#55d6e8]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <span className="text-[8.5px] text-[#91aeb9]">Latitude:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={newWpLat}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewWpLat(parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-[#1d445c] bg-[#0d2433] px-1.5 py-1 text-[10.5px] text-white outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[8.5px] text-[#91aeb9]">Longitude:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={newWpLon}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewWpLon(parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-[#1d445c] bg-[#0d2433] px-1.5 py-1 text-[10.5px] text-white outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[8.5px] text-[#91aeb9]">Break (Hours):</span>
                      <input
                        type="number"
                        min="0"
                        max="72"
                        value={newWpBreakH}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewWpBreakH(parseInt(e.target.value) || 0)}
                        className="w-full rounded border border-[#1d445c] bg-[#0d2433] px-1.5 py-1 text-[10.5px] text-white outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddWaypoint}
                    className="rounded bg-[#55d6e8] py-1 font-bold text-[#071521] text-[10px] hover:bg-[#7be3f2]"
                  >
                    Save Operational Waypoint
                  </button>
                </div>
              )}

              {/* List of Active Waypoints */}
              {nav.waypoints.length > 0 ? (
                <div className="space-y-1.5 mb-2">
                  {nav.waypoints.map((wp, idx) => (
                    <div
                      key={wp.id}
                      className="flex items-center justify-between rounded border border-[#1d445c]/70 bg-[#0d2433]/70 px-2.5 py-1.5 text-[10.5px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#55d6e8]/20 text-[#55d6e8] text-[9px] font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-[#eaf6f8]">{wp.name}</div>
                          <div className="text-[9px] text-[#91aeb9]">
                            {Math.abs(wp.lat).toFixed(2)}°S, {Math.abs(wp.lon).toFixed(2)}°{wp.lon >= 0 ? "E" : "W"} · Break: <b className="text-[#55d6e8]">{wp.breakDurationHours}h</b>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => nav.removeWaypoint(wp.id)}
                        className="text-[#91aeb9] hover:text-[#ef4444] p-1 transition-colors"
                        title="Remove Waypoint"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[9.5px] text-[#91aeb9] italic mb-2">
                  No intermediate rest breaks added (direct passage).
                </div>
              )}
            </div>

            {/* Objective Selection */}
            <div>
              <label className="mb-1.5 block font-bold text-[#91aeb9] light:text-[#5a7686]">
                OPTIMIZATION OBJECTIVE:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {OBJECTIVES.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => setObjective(obj.id as any)}
                    className={cx(
                      "flex flex-col items-start rounded-md border p-2 text-left transition-all",
                      objective === obj.id
                        ? "border-[#55d6e8] bg-[#55d6e8]/20 text-[#55d6e8] light:border-[#0f768e] light:bg-[#0f768e]/15 light:text-[#0f768e] font-bold"
                        : "border-[#1d445c]/50 bg-[#0d2433]/40 text-[#91aeb9] hover:border-[#55d6e8]/40 light:border-[#e2d8c7] light:bg-white",
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <obj.icon size={12} />
                      <span>{obj.label}</span>
                    </div>
                    <span className="mt-0.5 text-[8.5px] leading-tight opacity-75 font-normal">
                      {obj.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Slider */}
            <div>
              <div className="flex justify-between text-[10px] mb-1 font-bold">
                <span className="text-[#91aeb9] light:text-[#5a7686]">CRUISING SPEED:</span>
                <span className="text-[#55d6e8] light:text-[#0f768e]">{speedKn} KNOTS</span>
              </div>
              <input
                type="range"
                min={8}
                max={18}
                value={speedKn}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSpeedKn(+e.target.value)}
                className="w-full accent-[#55d6e8] light:accent-[#0f768e]"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={nav.isCalculating || hasCoordinateError}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#55d6e8] px-4 py-2.5 text-[12px] font-bold text-[#071521] shadow-lg hover:bg-[#7be3f2] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={15} />
              <span>{nav.isCalculating ? "CALCULATING ROUTES..." : "CALCULATE GEOGRAPHIC ROUTES"}</span>
            </button>
          </div>
        </Card>

        {/* Dynamic Route Comparison Panel */}
        <RouteComparison
          routes={nav.routes}
          selectedId={nav.selectedRouteId}
          recommendedId={nav.recommendedRouteId}
          onSelect={nav.setSelectedRoute}
        />
      </div>

      {/* 2. Right Column: Selected Route Telemetry, Total Voyage Time & Waypoints */}
      <div className="flex flex-col gap-3">
        {/* Selected Route Hero Card */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: route.color }} />
              <div>
                <h2 className="text-[17px] font-bold text-[#eaf6f8] light:text-[#0d2433]">{route.name}</h2>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">
                  {route.type.toUpperCase()} · Calculated Geodesic Corridor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-44">
                <RiskMeter score={route.riskScore} />
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate("map")}
                  className="flex items-center gap-1.5 rounded-lg border border-[#55d6e8] bg-[#55d6e8]/10 hover:bg-[#55d6e8]/20 px-3 py-1.5 font-mono text-[11px] font-bold text-[#55d6e8] transition-colors cursor-pointer"
                >
                  <span>VIEW ON MAP</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Voyage Time Breakdown */}
          <div className="grid grid-cols-2 gap-4 border-t border-[#1d445c]/50 light:border-[#e8e0d2] p-4 md:grid-cols-4 font-mono">
            <Metric label="Geodesic Distance" value={route.distanceNm.toLocaleString()} unit="nm" />
            <Metric label="Total Estimated Voyage Time" value={route.eta} accent="#55d6e8" />
            <Metric label="Bunker Fuel Burn" value={route.fuelT} unit="t" />
            <Metric label="Route Waypoints" value={route.coordinates.length} />
          </div>

          {nav.totalBreakHours > 0 && (
            <div className="flex items-center gap-2 border-t border-[#1d445c]/40 bg-[#0d2433]/40 px-4 py-2 text-[11px] font-mono text-[#8ccfe0]">
              <Clock size={13} className="text-[#55d6e8]" />
              <span>
                Breakdown: <b>{Math.floor(nav.baseTravelHours / 24)}d {nav.baseTravelHours % 24}h</b> base transit + <b>{nav.totalBreakHours}h</b> operational/rest breaks = <b>{Math.floor(nav.totalVoyageHours / 24)}d {nav.totalVoyageHours % 24}h</b> total voyage time.
              </span>
            </div>
          )}
        </Card>

        {/* Live Route Corridor Visualization Map */}
        <div className="relative h-[340px] min-h-[300px] overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg border border-[#1d445c]/80 light:border-[#e2d8c7]">
          <AntarcticPolarMap
            routes={nav.routes}
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
        </div>

        {/* Why Recommended / Decision Support Reasoning */}
        <Card title="Autonomous Decision Support Intelligence" action={<span className="font-mono text-[10px] text-[#10b981] font-bold">SYSTEM RECOMMENDED</span>}>
          <div className="p-4">
            <div className="text-[11px] text-[#91aeb9] light:text-[#5a7686] mb-2 font-mono">
              Evaluated Multi-Criteria Tradeoffs vs Direct Passage:
            </div>
            <ul className="space-y-2 font-mono text-[11.5px]">
              {nav.whyRecommended.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-[#10b981]">
                  <span>✓</span>
                  <span className="text-[#eaf6f8] light:text-[#0d2433]">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Geodetic Waypoint Coordinates Table */}
        <Card title="Calculated Geodetic Coordinates & Waypoints" action={<span className="font-mono text-[10px] text-[#91aeb9] light:text-[#5a7686]">{route.coordinates.length} points</span>}>
          <div className="max-h-80 overflow-y-auto flex flex-col divide-y divide-[#1d445c]/40 light:divide-[#e8e0d2]">
            {route.coordinates.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 text-[11.5px] font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#1d445c] bg-[#0d2433] text-[9.5px] text-[#55d6e8] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-[#c8dde3] light:text-[#0d2433]">
                    {i === 0
                      ? `Departure (${activeStart.name})`
                      : i === route.coordinates.length - 1
                      ? `Destination (${activeDest.name})`
                      : `Waypoint 0${i}`}
                  </span>
                </div>
                <span className="text-[#91aeb9] light:text-[#5a7686] font-semibold">
                  {Math.abs(c.lat).toFixed(4)}°S, {Math.abs(c.lon).toFixed(4)}°{c.lon >= 0 ? "E" : "W"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Routes;
