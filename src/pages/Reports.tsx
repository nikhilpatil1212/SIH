import { Download, FileText } from "lucide-react";
import { Card, Chip, Metric } from "../components/ui/primitives";
import { hazards } from "../data/mock";
import { useNav } from "../state";

export function Reports() {
  const nav = useNav();
  const route = nav.routes.find((r) => r.id === nav.selectedRouteId)!;
  const majorHazards = hazards.filter((h) => h.severity !== "low").slice(0, 4);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <Card
        title="ध्रुव सारथी · Voyage & Mission Summary"
        action={
          <button className="flex items-center gap-2 rounded-md border border-[#55d6e8]/50 bg-[#55d6e8]/10 light:border-[#0f768e]/40 light:bg-[#0f768e]/10 px-3 py-1.5 text-[11px] font-semibold text-[#55d6e8] light:text-[#0f768e] transition-colors hover:bg-[#55d6e8]/20">
            <Download size={13} /> Export Mission Audit
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3 lg:grid-cols-5">
          <Metric label="Mission Name" value="Indian Antarctic Expedition" />
          <Metric label="Vessel" value="RV Polar Star (PC6)" />
          <Metric label="Active Corridor" value={route.name} accent="#55d6e8" />
          <Metric label="Transit Distance" value={route.distanceNm.toLocaleString()} unit="nm" />
          <Metric label="Projected ETA" value={route.eta} />
          <Metric label="Fuel Expenditure" value={route.fuelT} unit="t" />
          <Metric label="Composite Risk" value={`${route.riskScore}/100`} accent={route.riskScore >= 60 ? "#ef4444" : "#10b981"} />
          <Metric label="Dynamic Reroutes" value={nav.rerouted ? 1 : 0} />
          <Metric label="Neural Platform" value="ध्रुव सारथी v1.2" />
        </div>
      </Card>

      <Card title="Critical Hazards Intercept Log">
        <div className="flex flex-col divide-y divide-[#1d445c]/40 light:divide-[#e8e0d2]">
          {majorHazards.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText size={14} className="text-[#91aeb9] light:text-[#5a7686]" />
                <div>
                  <div className="font-mono text-[12px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{h.id} · {h.type}</div>
                  <div className="text-[11px] text-[#91aeb9] light:text-[#4a6878]">{h.location} · Intersects {h.affectedRoute}</div>
                </div>
              </div>
              <Chip level={h.severity}>{h.severity.toUpperCase()}</Chip>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Tactical Rerouting Log">
        <div className="p-4">
          {nav.rerouted ? (
            <div className="rounded-md border-l-2 border-[#f59e0b] bg-[#f59e0b]/10 light:bg-[#fef3c7] p-3.5 text-[12px]">
              <div className="font-mono text-[10px] text-[#91aeb9] light:text-[#78350f]">10:31 UTC · AUTONOMOUS DISPATCH</div>
              <div className="mt-0.5 text-[#eaf6f8] light:text-[#0d2433] font-medium">
                Automated reroute from Route B → Route C triggered following newly accelerated tabular iceberg IBG-1247 trajectory.
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-[12px] text-[#91aeb9] light:text-[#7a93a1]">
              No rerouting events recorded for current voyage leg.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
