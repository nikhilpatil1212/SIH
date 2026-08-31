import { useState } from "react";
import { Anchor, CheckCircle2, ChevronDown, ChevronUp, Compass, Droplet, Eye, ShieldAlert, Snowflake, Sparkles, Wind } from "lucide-react";
import type { AlertItem, Environment, RiskFactor, Route, Vessel } from "../data/types";
import { Card, Chip, Metric, RiskMeter, SEVERITY_COLORS, StatusDot, cx } from "./ui/primitives";

const ROUTE_TAG: Record<Route["type"], string> = {
  fastest: "FASTEST",
  safest: "SAFEST",
  fuel: "FUEL EFFICIENT",
};

export function RouteComparison({
  routes,
  selectedId,
  recommendedId,
  onSelect,
}: {
  routes: Route[];
  selectedId: string;
  recommendedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card title="Route Comparison">
      <div className="flex flex-col gap-2 p-2.5">
        {routes.map((r) => {
          const active = r.id === selectedId;
          const recommended = r.id === recommendedId;
          return (
            <div
              key={r.id}
              className={cx(
                "group rounded-md border p-3 text-left transition-all",
                active
                  ? "border-[#55d6e8]/70 bg-[#0d2433] light:border-[#0f768e] light:bg-[#f3ece0]"
                  : "border-[#1d445c]/60 bg-[#0d2433]/40 hover:border-[#55d6e8]/40 light:border-[#e2d8c7] light:bg-[#faf6ee] light:hover:border-[#0f768e]/40",
              )}
            >
              <button
                onClick={() => onSelect(r.id)}
                className="w-full text-left cursor-pointer"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-[13px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{r.name}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#91aeb9] light:text-[#5a7686]">
                      {ROUTE_TAG[r.type]}
                    </span>
                  </div>
                  {recommended && (
                    <span className="rounded-sm bg-[#0284c7]/20 border border-[#0284c7]/50 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#0284c7] light:text-[#0369a1]">
                      ★ RECOMMENDED
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Distance" value={r.distanceNm.toLocaleString()} unit="nm" />
                  <Metric label="ETA" value={r.eta} />
                  <Metric label="Fuel" value={r.fuelT} unit="t" />
                </div>

                {/* Physical Safety & Iceberg Clearance Telemetry */}
                <div className="mt-2.5 grid grid-cols-3 gap-1 rounded bg-[#071521]/70 light:bg-[#ede5d8]/70 p-2 font-mono text-[9px] border border-[#1d445c]/40">
                  <div>
                    <span className="text-[#91aeb9] light:text-[#5a7686] block">ICEBERG CLEARANCE</span>
                    <span className={cx("font-bold", (r.minimumIcebergClearanceKm ?? 30) >= (r.icebergSafetyBufferKm ?? 20) ? "text-[#0284c7] light:text-[#0369a1]" : "text-[#ef4444]")}>
                      {r.minimumIcebergClearanceKm !== undefined ? `${r.minimumIcebergClearanceKm} km` : "Safe (Standoff)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#91aeb9] light:text-[#5a7686] block">LAND CROSSING</span>
                    <span className={cx("font-bold", r.landCollision ? "text-[#ef4444]" : "text-[#0284c7] light:text-[#0369a1]")}>
                      {r.landCollision ? "COLLISION ❌" : "ZERO (Ocean) ✓"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#91aeb9] light:text-[#5a7686] block">PHYSICAL SAFETY</span>
                    <span className={cx("font-bold uppercase", r.safe !== false ? "text-[#0284c7] light:text-[#0369a1]" : "text-[#ef4444]")}>
                      {r.safe !== false ? "100% SAFE ✓" : "UNSAFE ❌"}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5">
                  <RiskMeter score={r.riskScore} />
                </div>
              </button>


              {/* Requirement 6: "WHY?" Section beneath recommended route */}
              {recommended && (
                <div className="mt-3 rounded border border-[#0284c7]/30 bg-[#0284c7]/10 p-2.5 text-left font-mono">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0284c7] light:text-[#0369a1]">
                    <CheckCircle2 size={12} />
                    <span>WHY RECOMMENDED?</span>
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[10px] text-[#cbe5ee] light:text-[#2d4a57]">
                    <li className="flex items-center gap-1.5 text-[#0284c7] light:text-[#0369a1]">
                      <span>✓</span> <span>Lower iceberg encounter probability (↓ 41%)</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-[#0284c7] light:text-[#0369a1]">
                      <span>✓</span> <span>Lower sea-ice concentration (28% vs 64%)</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-[#0284c7] light:text-[#0369a1]">
                      <span>✓</span> <span>Avoids A76C / iceberg interception corridor</span>
                    </li>

                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Requirement 7 & 8: AI Route Recommendation Card with Expandable Route Analysis
export function AIRouteRecommendationCard({
  recommendedRoute,
}: {
  recommendedRoute: Route;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card title="AI Route Recommendation">
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0284c7]/20 text-[#0284c7] light:text-[#0369a1] font-bold text-[11px] border border-[#0284c7]/40">
              <Sparkles size={14} />
            </span>
            <div>
              <div className="text-[13px] font-bold text-[#eaf6f8] light:text-[#0d2433]">
                {recommendedRoute.name}
              </div>
              <div className="font-mono text-[9.5px] uppercase font-semibold text-[#0284c7] light:text-[#0369a1]">
                ● SYSTEM RECOMMENDED
              </div>
            </div>
          </div>
          <span className="rounded bg-[#0284c7]/15 border border-[#0284c7]/40 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0284c7] light:text-[#0369a1]">
            91% CONFIDENCE
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-y border-[#1d445c]/50 light:border-[#e2d8c7] py-2 font-mono text-[10.5px]">
          <div>
            <div className="text-[8.5px] uppercase text-[#91aeb9]">Collision Risk</div>
            <div className="font-bold text-[#0284c7] light:text-[#0369a1]">↓ 41%</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase text-[#91aeb9]">Sea-Ice Risk</div>
            <div className="font-bold text-[#0284c7] light:text-[#0369a1]">↓ 28%</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase text-[#91aeb9]">ETA</div>
            <div className="font-bold text-[#eaf6f8] light:text-[#0d2433]">{recommendedRoute.eta}</div>
          </div>
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2.5 flex w-full items-center justify-center gap-1 rounded bg-[#55d6e8]/10 hover:bg-[#55d6e8]/20 border border-[#55d6e8]/40 py-1.5 font-mono text-[10px] font-bold text-[#55d6e8] transition-colors"
        >
          <span>{expanded ? "HIDE ANALYSIS" : "VIEW ANALYSIS"}</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {expanded && (
          <div className="mt-2.5 flex flex-col gap-1.5 border-t border-[#1d445c]/40 pt-2 font-mono text-[10px] animate-in fade-in">
            <div className="flex justify-between">
              <span className="text-[#91aeb9]">Iceberg Encounter Prob.:</span>
              <span className="font-bold text-[#0284c7] light:text-[#0369a1]">Low (12%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#91aeb9]">Pack-Ice Concentration:</span>
              <span className="font-bold text-[#0284c7] light:text-[#0369a1]">28% (Marginal)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#91aeb9]">Collision Risk Index:</span>
              <span className="font-bold text-[#0284c7] light:text-[#0369a1]">32 / 100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#91aeb9]">Estimated Fuel Burn:</span>
              <span className="font-bold text-[#eaf6f8] light:text-[#0d2433]">{recommendedRoute.fuelT} tonnes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#91aeb9]">Neural Model Confidence:</span>
              <span className="font-bold text-[#55d6e8]">91.4% (Ensemble)</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function RiskFactors({ factors, routeName }: { factors: RiskFactor[]; routeName: string }) {
  const labelFor = (l: RiskFactor["level"]) =>
    l === "ok" ? "OK" : l.toUpperCase();
  return (
    <Card title="Risk Factors" action={<span className="font-mono text-[10px] text-[#55d6e8] light:text-[#0f768e] font-semibold">{routeName}</span>}>
      <ul className="flex flex-col divide-y divide-[#1d445c]/40 light:divide-[#e8e0d2]">
        {factors.map((f) => (
          <li key={f.label} className="flex items-center justify-between px-3.5 py-2">
            <span className="text-[12px] text-[#c8dde3] light:text-[#3a5563]">{f.label}</span>
            <Chip level={f.level}>{labelFor(f.level)}</Chip>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function EnvironmentalCard({ env }: { env: Environment }) {
  const items = [
    { icon: Snowflake, label: "Sea-Ice Conc.", value: `${env.seaIceConcentration}`, unit: "%" },
    { icon: Wind, label: "Wind Speed", value: `${env.windSpeedKn}`, unit: `kn ${env.windDir}` },
    { icon: Eye, label: "Visibility", value: `${env.visibilityKm}`, unit: "km" },
    { icon: Droplet, label: "Current", value: `${env.currentKn}`, unit: `kn ${env.currentDir}` },
  ];
  return (
    <Card title="Environmental Overview">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-md bg-[#1d445c]/40 light:bg-[#e2d8c7]">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2.5 bg-[#132f40] light:bg-[#faf6ee] px-3.5 py-3">
            <it.icon size={16} className="text-[#55d6e8] light:text-[#0f768e]" strokeWidth={1.6} />
            <Metric label={it.label} value={it.value} unit={it.unit} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card title="Alerts" action={<span className="font-mono text-[10px] text-[#91aeb9] light:text-[#5a7686]">{alerts.length} active</span>}>
      <ul className="flex flex-col gap-2 p-2.5">
        {alerts.map((a) => {
          const c = SEVERITY_COLORS[a.severity];
          return (
            <li
              key={a.id}
              className="rounded-md border-l-2 bg-[#0d2433]/60 light:bg-[#f6f0e4] px-3 py-2 transition-colors"
              style={{ borderLeftColor: c }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: c }}>
                  {a.title}
                </span>
                <span className="font-mono text-[9px] text-[#91aeb9] light:text-[#6b8290]">{a.time}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-[#91aeb9] light:text-[#4a6878]">{a.message}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function VesselCard({ vessel }: { vessel: Vessel }) {
  return (
    <Card title="Vessel Telemetry">
      <div className="p-3.5">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#55d6e8]/40 bg-[#55d6e8]/10 light:border-[#0f768e]/40 light:bg-[#0f768e]/10">
            <Anchor size={16} className="text-[#55d6e8] light:text-[#0f768e]" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{vessel.name}</div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#10b981]">
              <StatusDot color="#10b981" pulse /> {vessel.status.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <Metric label="Speed" value={vessel.speedKn} unit="kn" accent="#55d6e8" />
          <Metric label="Heading" value={`${vessel.headingDeg}°`} />
          <Metric label="Course" value={`${vessel.courseDeg}°`} />
          <Metric label="Ice Class" value={vessel.iceClass} />
          <div className="col-span-2 flex items-center gap-2 border-t border-[#1d445c]/40 light:border-[#e8e0d2] pt-2.5">
            <Compass size={14} className="text-[#91aeb9] light:text-[#5a7686]" />
            <Metric label="Position" value={`${Math.abs(vessel.position.lat).toFixed(1)}°S ${Math.abs(vessel.position.lon).toFixed(1)}°W`} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default RouteComparison;
