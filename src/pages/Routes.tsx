import { RouteComparison, RiskFactors } from "../components/panels";
import { Card, Metric, RiskMeter, RISK_COLORS } from "../components/ui/primitives";
import { riskFactorsByRoute } from "../data/mock";
import type { RiskLevel } from "../data/types";
import { useNav } from "../state";

const TIMELINE_STAGES = ["Departure", "+12h", "+24h", "+48h", "+72h"];

const stageRisk: Record<string, RiskLevel[][]> = {
  "route-a": [
    ["low", "low", "low"],
    ["medium", "low", "medium"],
    ["high", "medium", "medium"],
    ["high", "high", "medium"],
    ["medium", "high", "low"],
  ],
  "route-b": [
    ["low", "low", "low"],
    ["low", "low", "low"],
    ["low", "medium", "low"],
    ["medium", "medium", "low"],
    ["low", "medium", "medium"],
  ],
  "route-c": [
    ["low", "medium", "low"],
    ["medium", "medium", "medium"],
    ["medium", "high", "medium"],
    ["medium", "high", "medium"],
    ["low", "medium", "low"],
  ],
};

export function Routes() {
  const nav = useNav();
  const route = nav.routes.find((r) => r.id === nav.selectedRouteId) ?? nav.routes[0];
  const risk = (route ? stageRisk[route.id] : null) ?? stageRisk["route-b"];

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-3">
        <RouteComparison
          routes={nav.routes}
          selectedId={nav.selectedRouteId}
          recommendedId={nav.recommendedRouteId}
          onSelect={nav.setSelectedRoute}
        />
        <RiskFactors factors={riskFactorsByRoute[route.id]} routeName={route.name} />
      </div>

      <div className="flex flex-col gap-3">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: route.color }} />
              <div>
                <h2 className="text-[17px] font-bold text-[#eaf6f8] light:text-[#0d2433]">{route.name}</h2>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">{route.type}</p>
              </div>
            </div>
            <div className="w-48"><RiskMeter score={route.riskScore} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-[#1d445c]/50 light:border-[#e8e0d2] p-4 md:grid-cols-4">
            <Metric label="Distance" value={route.distanceNm.toLocaleString()} unit="nm" />
            <Metric label="ETA" value={route.eta} accent="#55d6e8" />
            <Metric label="Fuel" value={route.fuelT} unit="t" />
            <Metric label="Waypoints" value={route.waypoints.length} />
          </div>
        </Card>

        <Card title="Time-Dependent Risk Timeline" action={<span className="font-mono text-[10px] text-[#f59e0b]">Neural Forecast</span>}>
          <div className="overflow-x-auto p-4">
            <div className="grid min-w-[560px]" style={{ gridTemplateColumns: `120px repeat(${TIMELINE_STAGES.length}, 1fr)` }}>
              <div />
              {TIMELINE_STAGES.map((s) => (
                <div key={s} className="pb-3 text-center font-mono text-[11px] font-bold text-[#eaf6f8] light:text-[#0d2433]">{s}</div>
              ))}
              {["Iceberg risk", "Sea-ice risk", "Weather risk"].map((rowLabel, ri) => (
                <div key={rowLabel} className="contents">
                  <div className="flex items-center py-2 text-[11px] text-[#91aeb9] light:text-[#4a6878] font-medium">{rowLabel}</div>
                  {TIMELINE_STAGES.map((_, si) => {
                    const lvl = risk[si][ri];
                    const c = RISK_COLORS[lvl];
                    return (
                      <div key={si} className="flex items-center justify-center py-2">
                        <span
                          className="flex h-8 w-full max-w-[72px] items-center justify-center rounded-md font-mono text-[9px] font-bold uppercase shadow-sm"
                          style={{ backgroundColor: `${c}1f`, color: c, border: `1px solid ${c}44` }}
                        >
                          {lvl}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Waypoints & Geodetic Waypoint Coordinates">
          <div className="flex flex-col divide-y divide-[#1d445c]/40 light:divide-[#e8e0d2]">
            {route.coordinates.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#1d445c] light:border-[#d8d0c2] bg-[#0d2433] light:bg-[#f2ebe0] font-mono text-[10px] text-[#55d6e8] light:text-[#0f768e] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-[12px] text-[#c8dde3] light:text-[#0d2433] font-medium">
                    {i === 0 ? "Departure Point" : i === route.coordinates.length - 1 ? "Antarctic Destination" : `Waypoint 0${i}`}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#91aeb9] light:text-[#5a7686]">
                  {Math.abs(c.lat).toFixed(2)}°S {Math.abs(c.lon).toFixed(2)}°W
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
