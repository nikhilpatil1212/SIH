import { useState } from "react";
import {
  Anchor,
  ArrowRight,
  Calculator,
  Compass,
  CornerDownRight,
  ExternalLink,
  Fuel,
  Gauge,
  Layers,
  MapPin,
  Navigation,
  RotateCcw,
  Shield,
  Ship,
  Sparkles,
} from "lucide-react";
import { RouteComparison, RiskFactors } from "../components/panels";
import { Card, Metric, RiskMeter, RISK_COLORS, cx } from "../components/ui/primitives";
import { riskFactorsByRoute, vessel } from "../data/mock";
import type { RiskLevel } from "../data/types";
import { useNav } from "../state";
import type { PageId } from "../components/Sidebar";

const START_PRESETS = [
  { id: "capetown", name: "Port of Cape Town (South Africa)", lat: -33.92, lon: 18.42, flag: "🇿🇦" },
  { id: "ushuaia", name: "Port of Ushuaia (Argentina)", lat: -54.8, lon: -68.3, flag: "🇦🇷" },
  { id: "hobart", name: "Port of Hobart (Australia)", lat: -42.88, lon: 147.32, flag: "🇦🇺" },
  { id: "puntaarenas", name: "Punta Arenas (Chile)", lat: -53.16, lon: -70.91, flag: "🇨🇱" },
  { id: "goa", name: "NCPOR Expedition Base / Mormugao (India)", lat: 15.4, lon: 73.8, flag: "🇮🇳" },
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
  { id: "FUEL EFFICIENT", label: "FUEL EFFICIENT", desc: "Maximize fuel economy utilizing favorable ocean currents", icon: Fuel },
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

  const activeStart =
    startPreset === "custom"
      ? { lat: customStartLat, lon: customStartLon, name: "Custom Departure" }
      : START_PRESETS.find((p) => p.id === startPreset)!;

  const activeDest =
    destPreset === "custom"
      ? { lat: customDestLat, lon: customDestLon, name: "Custom Destination" }
      : DESTINATION_PRESETS.find((p) => p.id === destPreset)!;

  const handleCalculate = async () => {
    await nav.calculateNewRoutes({
      start: { lat: activeStart.lat, lon: activeStart.lon, name: activeStart.name },
      destination: { lat: activeDest.lat, lon: activeDest.lon, name: activeDest.name },
      objective,
      vessel_speed_kn: speedKn,
    });
  };

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-[400px_1fr]">
      {/* 1. Left Column: Interactive Route Planning Form & Route Comparison */}
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
                onChange={(e) => setStartPreset(e.target.value)}
                className="w-full rounded-md border border-[#1d445c] bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#f6f0e4] px-2.5 py-1.5 text-[#eaf6f8] light:text-[#0d2433] outline-none"
              >
                {START_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.flag} {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Selection */}
            <div>
              <label className="mb-1 block font-bold text-[#91aeb9] light:text-[#5a7686]">
                ANTARCTIC DESTINATION:
              </label>
              <select
                value={destPreset}
                onChange={(e) => setDestPreset(e.target.value)}
                className="w-full rounded-md border border-[#1d445c] bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#f6f0e4] px-2.5 py-1.5 text-[#eaf6f8] light:text-[#0d2433] outline-none"
              >
                {DESTINATION_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.flag} {p.name}
                  </option>
                ))}
              </select>
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
                <span className="text-[#91aeb9] light:text-[#5a7686]">PLANNED SPEED:</span>
                <span className="text-[#55d6e8] light:text-[#0f768e]">{speedKn} KNOTS</span>
              </div>
              <input
                type="range"
                min={8}
                max={18}
                value={speedKn}
                onChange={(e) => setSpeedKn(+e.target.value)}
                className="w-full accent-[#55d6e8] light:accent-[#0f768e]"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={nav.isCalculating}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#55d6e8] px-4 py-2.5 text-[12px] font-bold text-[#071521] shadow-lg hover:bg-[#7be3f2] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Calculator size={15} />
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

      {/* 2. Right Column: Selected Route Telemetry, Waypoints & View on Map Action */}
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
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-[#1d445c]/50 light:border-[#e8e0d2] p-4 md:grid-cols-4 font-mono">
            <Metric label="Geodesic Distance" value={route.distanceNm.toLocaleString()} unit="nm" />
            <Metric label="Calculated ETA" value={route.eta} accent="#55d6e8" />
            <Metric label="Bunker Fuel Burn" value={route.fuelT} unit="t" />
            <Metric label="Route Waypoints" value={route.coordinates.length} />
          </div>
        </Card>

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
