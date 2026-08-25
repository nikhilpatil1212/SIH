import { useState } from "react";
import { Globe } from "../components/globe/Globe";
import MapView from "../components/map/MapView";
import { PredictionLegend, IcebergDetailPanel, IcebergRiskPanel } from "../components/predictions";
import { Card, cx } from "../components/ui/primitives";
import { DemoTag, TimelineSelector } from "../components/ui/phase2";
import { StateBlock } from "../components/ui/phase2";
import { HORIZON_TIME, HORIZONS } from "../data/phase2";
import { vessel } from "../data/mock";
import type { Horizon } from "../data/types";
import { useNav } from "../state";
import { Globe2, Map as MapIcon } from "lucide-react";

const HORIZON_FRACTION: Record<Horizon, number> = {
  "0h": 0.001,
  "6h": 0.12,
  "12h": 0.25,
  "24h": 0.45,
  "48h": 0.75,
  "72h": 1,
};

export function IcebergPrediction() {
  const nav = useNav();
  const [horizon, setHorizon] = useState<Horizon>("72h");
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const selected = nav.icebergs.find((i) => i.id === nav.selectedIcebergId) ?? nav.icebergs[0];

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col gap-3">
        {/* Header bar with Horizon timeline and 3D/2D switch */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9] light:text-[#5a7686]">
              Neural Drift Horizon
            </span>
            <DemoTag label="PINN ENSEMBLE" />
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#55d6e8] light:text-[#0f768e] font-medium">
              {horizon === "0h" ? "Current State" : `+${horizon}`} · {HORIZON_TIME[horizon]}
            </span>

            {/* 3D Earth / 2D Chart toggle */}
            <div className="flex items-center rounded-md border border-[#1d445c]/60 bg-[#0d2433]/70 light:border-[#e2d8c7] light:bg-[#f2ebe0] p-0.5">
              <button
                onClick={() => setViewMode("3d")}
                className={cx(
                  "flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  viewMode === "3d"
                    ? "bg-[#55d6e8]/20 text-[#55d6e8] light:bg-[#0f768e] light:text-white"
                    : "text-[#91aeb9] light:text-[#5a7686] hover:text-[#eaf6f8] light:hover:text-[#0d2433]",
                )}
                title="3D Earth Globe View"
              >
                <Globe2 size={12} /> 3D Globe
              </button>
              <button
                onClick={() => setViewMode("2d")}
                className={cx(
                  "flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  viewMode === "2d"
                    ? "bg-[#55d6e8]/20 text-[#55d6e8] light:bg-[#0f768e] light:text-white"
                    : "text-[#91aeb9] light:text-[#5a7686] hover:text-[#eaf6f8] light:hover:text-[#0d2433]",
                )}
                title="2D Polar Chart View"
              >
                <MapIcon size={12} /> 2D Chart
              </button>
            </div>
          </div>
        </div>

        <TimelineSelector
          horizons={["0h", ...HORIZONS] as Horizon[]}
          value={horizon}
          onChange={setHorizon}
          labelFor={(h) => (h === "0h" ? "NOW" : `+${h.toUpperCase()}`)}
        />

        {/* 3D Earth Globe / 2D Map container */}
        <div className="relative min-h-[480px] flex-1 overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors">
          {viewMode === "3d" ? (
            <Globe
              routes={nav.routes}
              selectedRouteId={nav.selectedRouteId}
              showRoutes
              vessel={vessel}
              icebergs={nav.icebergs}
              showTrajectories
              selectedIcebergId={selected?.id}
              onSelectIceberg={nav.setSelectedIceberg}
              horizonFraction={HORIZON_FRACTION[horizon]}
            />
          ) : (
            <MapView
              routes={nav.routes}
              icebergs={nav.icebergs}
              selectedRouteId={nav.selectedRouteId}
              layers={{ icebergs: true, seaice: false, currents: false, weather: false }}
              zoom={1}
              selectedIcebergId={selected?.id}
              onSelectIceberg={nav.setSelectedIceberg}
              horizonFraction={HORIZON_FRACTION[horizon]}
              hazardHighlight
            />
          )}

          <PredictionLegend />

          {/* Uncertainty banner */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-[#f5b942]/40 bg-[#071521]/90 light:border-[#d97706]/40 light:bg-[#fdfbf7]/90 px-2.5 py-1.5 backdrop-blur shadow-sm">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#f5b942] light:text-[#d97706]">
              95% Spatial Dispersion Corridor · {horizon}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Tracked Iceberg Fleet & Intelligence Panels */}
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <Card title={`Antarctic Iceberg Fleet (${nav.icebergs.length})`}>
          <div className="flex flex-col p-2 gap-1 max-h-[220px] overflow-y-auto">
            {nav.icebergs.length === 0 ? (
              <StateBlock kind="error" message="Unable to load iceberg observations." />
            ) : (
              nav.icebergs.map((ib) => {
                const active = ib.id === selected?.id;
                const c = ib.riskLevel === "high" ? "#ef4444" : ib.riskLevel === "medium" ? "#f59e0b" : "#10b981";
                return (
                  <button
                    key={ib.id}
                    onClick={() => nav.setSelectedIceberg(ib.id)}
                    className={cx(
                      "flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                      active
                        ? "border-[#55d6e8]/60 bg-[#0d2433] light:border-[#0f768e] light:bg-[#f2ebe0]"
                        : "border-transparent hover:bg-[#0d2433]/50 light:hover:bg-[#f5efe3]",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                      <span className="font-mono text-[12px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{ib.id}</span>
                      <span className="text-[10px] text-[#91aeb9] light:text-[#6a8494]">({ib.sizeKm} km)</span>
                    </span>
                    <span className="font-mono text-[10px] font-semibold uppercase" style={{ color: c }}>
                      {ib.riskLevel}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {selected && <IcebergDetailPanel iceberg={selected} />}
        {selected && <IcebergRiskPanel icebergId={selected.id} />}
      </div>
    </div>
  );
}
