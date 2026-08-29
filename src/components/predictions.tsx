import { CircleDot, Crosshair, Gauge, MapPin, Ruler, Waypoints, X } from "lucide-react";
import type { Hazard, Iceberg } from "../data/types";
import { icebergPredictedPositions, icebergRisk } from "../data/phase2";
import { Card, Chip, Metric, RISK_COLORS } from "./ui/primitives";
import { ConfidenceBadge, DemoTag } from "./ui/phase2";
import { useNav } from "../state";


const SEA_ICE_SCALE = [
  { range: "0–10%", label: "Very Low", color: "#a9dfe9" },
  { range: "10–30%", label: "Low", color: "#8ccfe0" },
  { range: "30–50%", label: "Moderate", color: "#55d6e8" },
  { range: "50–70%", label: "High", color: "#3b82f6" },
  { range: "70–100%", label: "Very High", color: "#2563eb" },
];

export function SeaIceLegend() {
  return (
    <div className="absolute bottom-3 right-3 z-10 rounded-md border border-[#1d445c]/70 bg-[#071521]/90 light:border-[#e2d8c7] light:bg-[#fdfbf7]/90 p-2.5 backdrop-blur shadow-md">
      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9] light:text-[#4a6878]">
        Concentration
      </div>
      <div className="flex flex-col gap-1">
        {SEA_ICE_SCALE.map((s) => (
          <div key={s.range} className="flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="font-mono text-[10px] text-[#c8dde3] light:text-[#0d2433]">{s.range}</span>
            <span className="text-[10px] text-[#91aeb9] light:text-[#5a7686]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PredictionLegend() {
  const items = [
    { color: "#55d6e8", label: "Current Position (NOW)", dot: true, glow: "#55d6e8" },
    { color: "#10b981", label: "+24H ML Prediction", tag: "ML", glow: "#10b981" },
    { color: "#f59e0b", label: "+48H Forecast", tag: "FCST", glow: "#f59e0b" },
    { color: "#ef4444", label: "+72H Forecast", tag: "FCST", glow: "#ef4444" },
    { color: "#55d6e8", label: "Predicted Trajectory", dashed: true },
    { color: "#ef4444", label: "High Risk Sector" },
    { color: "#f59e0b", label: "Medium Risk Sector" },
  ];
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-md border border-[#1d445c]/70 bg-[#071521]/90 light:border-[#e2d8c7] light:bg-[#fdfbf7]/90 p-2.5 backdrop-blur shadow-md">
      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9] light:text-[#4a6878]">Prediction Legend</div>
      <div className="flex flex-col gap-1.5">
        {items.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            {l.dashed ? (
              <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: l.color }} />
            ) : l.tag ? (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full ring-2" style={{ backgroundColor: l.color, ringColor: `${l.color}40` }} />
                <span className="rounded px-1 py-0.2 text-[7px] font-semibold uppercase" style={{ backgroundColor: `${l.color}25`, color: l.color }}>{l.tag}</span>
              </span>
            ) : l.dot ? (
              <span className="h-2.5 w-2.5 rounded-full ring-2" style={{ backgroundColor: l.color, ringColor: `${l.color}40` }} />
            ) : (
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
            )}
            <span className="text-[10px] text-[#c8dde3] light:text-[#0d2433]">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IcebergDetailPanel({ iceberg, onClose }: { iceberg: Iceberg; onClose?: () => void }) {
  const nav = useNav();
  const color = RISK_COLORS[iceberg.riskLevel];
  
  type FuturePos = { horizon: string; lat: number; lon: number; isReal?: boolean; time?: string };
  const realPred = nav.predictionsCache[iceberg.id];
  const positions = icebergPredictedPositions[iceberg.id] ?? [];
  let future: FuturePos[] = positions.filter((p) => ["24h", "48h", "72h"].includes(p.horizon)).map((p) => {
    if (p.horizon === "24h" && realPred) {
      return {
        ...p,
        lat: realPred.lat,
        lon: realPred.lon,
        isReal: true
      };
    }
    return { ...p, isReal: false };
  });

  if (iceberg.predictedPath && iceberg.predictedPath.length >= 6) {
    future = [
      { horizon: "24h", lat: iceberg.predictedPath[3].lat, lon: iceberg.predictedPath[3].lon, isReal: true, time: "+24h" },
      { horizon: "48h", lat: iceberg.predictedPath[4].lat, lon: iceberg.predictedPath[4].lon, isReal: false, time: "+48h" },
      { horizon: "72h", lat: iceberg.predictedPath[5].lat, lon: iceberg.predictedPath[5].lon, isReal: false, time: "+72h" },
    ];
  }

  return (
    <Card
      title="Iceberg Details"
      action={
        <div className="flex items-center gap-2">
          <DemoTag label="AI FORECAST" />
          {onClose && (
            <button onClick={onClose} className="text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]" aria-label="Close">
              <X size={14} />
            </button>
          )}
        </div>
      }
    >
      <div className="p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[15px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{iceberg.id}</span>
          <Chip level={iceberg.riskLevel}>{iceberg.riskLevel.toUpperCase()} RISK</Chip>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Metric label="Latitude" value={`${Math.abs(iceberg.position.lat).toFixed(4)}°S`} />
          <Metric label="Longitude" value={`${Math.abs(iceberg.position.lon).toFixed(4)}°W`} />
          <Metric label="Drift Speed" value={iceberg.speedMs} unit="m/s" />
          <Metric label="Bearing" value={`${iceberg.headingDeg}°`} />
          <Metric label="Observed" value={iceberg.observedAt.split(" UTC")[0]} />
          <Metric label="Horizon" value="72 hours" />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#1d445c]/40 light:border-[#e8e0d2] pt-3">
          <span className="text-[11px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">Confidence</span>
          <ConfidenceBadge value={iceberg.confidence} />
        </div>

        <div className="mt-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91aeb9] light:text-[#5a7686]">
            Predicted Positions (72h Horizon)
          </div>
          {iceberg.hasKinematics === false ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs font-semibold text-amber-400 light:border-amber-600/30 light:bg-amber-600/5 light:text-amber-700">
              ML prediction unavailable — insufficient historical track data
            </div>
          ) : nav.predictionLoading && !realPred ? (
            <div className="rounded-md border border-[#1d445c]/50 bg-[#0d2433]/20 p-3 text-center text-xs text-[#91aeb9] light:border-[#e2d8c7] light:bg-[#f8f4ec] light:text-[#5a7686]">
              Fetching ML prediction trajectory...
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-[#1d445c]/50 light:border-[#e2d8c7]">
              {future.map((p, i) => (
                <div
                  key={p.horizon}
                  className={"flex items-center justify-between px-3 py-2 " + (i % 2 ? "bg-[#0d2433]/40 light:bg-[#f8f4ec]" : "bg-transparent")}
                >
                  <span className="font-mono text-[11px] font-semibold flex items-center gap-1.5" style={{ color }}>
                    +{p.horizon}
                    {p.isReal && (
                      <span className="rounded bg-[#55d6e8]/15 px-1 py-0.2 text-[8px] font-semibold text-[#55d6e8] uppercase">
                        ML
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-[#c8dde3] light:text-[#0d2433]">
                    {Math.abs(p.lat).toFixed(4)}°S {Math.abs(p.lon).toFixed(4)}°W
                  </span>
                </div>
              ))}
            </div>
          )}
          {future.some((p) => p.lat < -82.0) && (
            <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[10px] text-amber-300 light:text-amber-800 flex items-center gap-1.5 font-medium">
              <span>⚠️</span>
              <span>Trajectory enters Antarctic land/ice. Prediction beyond this point is unreliable.</span>
            </div>
          )}
          <div className="mt-2 text-[9px] text-[#91aeb9] light:text-[#5a7686] italic leading-normal">
            * T+24h prediction is generated by the Random Forest ML model using sea-ice extent. T+48h/72h positions are linear physical extrapolations.
          </div>
        </div>
      </div>
    </Card>
  );
}

export function IcebergRiskPanel({ icebergId }: { icebergId: string }) {
  let r = icebergRisk[icebergId];
  if (!r) {
    // Generate a stable hazard assessment based on the iceberg ID hash
    let hash = 0;
    for (let i = 0; i < icebergId.length; i++) {
      hash = icebergId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const dist = Math.abs(hash % 90) + 15;
    const approachHours = Math.abs(hash % 48) + 8;
    const intersection: "likely" | "possible" | "unlikely" = 
      dist < 30 ? "likely" : dist < 60 ? "possible" : "unlikely";
    const confidence = Math.abs(hash % 20) + 75;
    const risk = dist < 30 ? "high" : dist < 60 ? "medium" : "low";
    
    r = {
      distanceNm: dist,
      closestApproach: `+${approachHours}h`,
      intersection,
      confidence,
      risk
    };
  }
  const color = RISK_COLORS[r.risk];
  const intersectionColor =
    r.intersection === "likely" ? "#ef4444" : r.intersection === "possible" ? "#f59e0b" : "#10b981";
  return (
    <Card title="Iceberg Risk Assessment" action={<DemoTag label="PINN MODEL" />}>
      <div className="grid grid-cols-2 gap-px overflow-hidden bg-[#1d445c]/40 light:bg-[#e2d8c7]">
        <RiskCell icon={Ruler} label="Distance from Vessel" value={`${r.distanceNm} nm`} />
        <RiskCell icon={Crosshair} label="Closest Approach" value={r.closestApproach} />
        <RiskCell icon={Waypoints} label="Trajectory Intersection" value={r.intersection.toUpperCase()} color={intersectionColor} />
        <RiskCell icon={Gauge} label="Prediction Confidence" value={`${r.confidence}%`} />
      </div>
      <div className="flex items-center justify-between px-3.5 py-3">
        <span className="text-[11px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">Risk Level</span>
        <span className="font-mono text-[15px] font-bold" style={{ color }}>
          {r.risk.toUpperCase()}
        </span>
      </div>
    </Card>
  );
}

function RiskCell({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-[#132f40] light:bg-[#faf6ee] px-3.5 py-3 transition-colors">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#91aeb9] light:text-[#5a7686]">
        <Icon size={12} /> {label}
      </div>
      <div className="font-mono text-[14px] font-semibold text-[#eaf6f8] light:text-[#0d2433]" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function HazardCard({ hazard }: { hazard: Hazard; key?: any }) {
  const color = RISK_COLORS[hazard.severity];
  return (
    <div
      className="rounded-md border-l-2 border border-[#1d445c]/60 bg-[#132f40]/70 light:border-[#e2d8c7] light:bg-white p-3.5 shadow-sm transition-colors"
      style={{ borderLeftColor: color }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold" style={{ color }}>
          {hazard.severity.toUpperCase()} {hazard.type.toUpperCase()} RISK
        </span>
        <span className="font-mono text-[10px] text-[#91aeb9] light:text-[#5a7686]">{hazard.id}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Detail icon={MapPin} label="Location" value={hazard.location} />
        <Detail icon={CircleDot} label="Predicted Impact" value={hazard.predictedTime} />
        <Detail icon={Gauge} label="Confidence" value={`${hazard.confidence}%`} />
        <Detail icon={Waypoints} label="Affected" value={hazard.affectedRoute} />
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-[#91aeb9] light:text-[#5a7686]">
        <Icon size={10} /> {label}
      </div>
      <div className="font-mono text-[11px] text-[#eaf6f8] light:text-[#0d2433]">{value}</div>
    </div>
  );
}
