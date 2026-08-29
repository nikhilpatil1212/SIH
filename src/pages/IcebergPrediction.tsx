import { useState } from "react";
import { AntarcticPolarMap } from "../components/map/AntarcticPolarMap";
import { PredictionLegend, IcebergDetailPanel, IcebergRiskPanel } from "../components/predictions";
import { Card, cx } from "../components/ui/primitives";
import { DemoTag, TimelineSelector } from "../components/ui/phase2";
import { StateBlock } from "../components/ui/phase2";
import { HORIZON_TIME, HORIZONS } from "../data/phase2";
import { vessel } from "../data/mock";
import type { Horizon } from "../data/types";
import { useNav } from "../state";

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
  const selected = nav.icebergs.find((i) => i.id === nav.selectedIcebergId) ?? nav.icebergs[0];

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col gap-3">
        {/* Header bar with Horizon timeline */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9] light:text-[#5a7686]">
              Neural Drift Horizon
            </span>
            <DemoTag label="PINN ENSEMBLE" />
            <span className="rounded bg-[#f5b942]/15 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#f5b942] light:text-[#d97706]">
              95% Dispersion · {horizon}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#55d6e8] light:text-[#0f768e] font-medium">
              {horizon === "0h" ? "Current State" : `+${horizon}`} · {HORIZON_TIME[horizon]}
            </span>
          </div>
        </div>

        <TimelineSelector
          horizons={["0h", ...HORIZONS] as Horizon[]}
          value={horizon}
          onChange={setHorizon}
          labelFor={(h) => (h === "0h" ? "NOW" : `+${h.toUpperCase()}`)}
        />

        {/* 2D Antarctic Polar Map container */}
        <div className="relative min-h-[480px] flex-1 overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors">
          <AntarcticPolarMap
            routes={nav.routes}
            selectedRouteId={nav.selectedRouteId}
            onSelectRoute={nav.setSelectedRoute}
            vessel={{
              name: vessel.name,
              position: { lat: vessel.position.lat, lon: vessel.position.lon },
              headingDeg: vessel.headingDeg,
              speedKn: vessel.speedKn,
              status: vessel.status,
            }}
            icebergs={nav.icebergs}
            selectedIcebergId={selected?.id}
            onSelectIceberg={nav.setSelectedIceberg}
            horizonFraction={HORIZON_FRACTION[horizon]}
            className="h-full w-full"
          />
          <PredictionLegend />
        </div>
      </div>

      {/* Right Column: Tracked Iceberg Fleet & Intelligence Panels */}
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <Card title={`Antarctic Iceberg Fleet (${nav.icebergs.length})`}>
          <div className="flex flex-col p-2 gap-1 max-h-[220px] overflow-y-auto">
            {nav.icebergs.length === 0 ? (
              <StateBlock kind="error" message="Unable to load USNIC iceberg data." />
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

          {/* USNIC Source Indicator Footer */}
          <div className="border-t border-[#1e2d3d]/50 light:border-[#e0d6c8] p-2 bg-[#081524] light:bg-[#f6ebd9] rounded-b-lg">
            <div className="flex flex-col gap-0.5 text-[9px] font-mono text-[#91aeb9] light:text-[#5a7686]">
              <div className="flex justify-between">
                <span>SOURCE:</span>
                <span className="font-bold text-[#55d6e8] light:text-[#0f768e]">USNIC Tracked</span>
              </div>
              <div className="flex justify-between">
                <span>LAST TRACKED:</span>
                <span className="text-[#eaf6f8] light:text-[#0d2433]">
                  {selected?.observedAt ? selected.observedAt.replace(" (USNIC tracked)", "") : "Weekly"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>DATA FREQUENCY:</span>
                <span className="text-[#eaf6f8] light:text-[#0d2433]">Weekly (Updated Weekly)</span>
              </div>
            </div>
          </div>
        </Card>

        {selected && <IcebergDetailPanel iceberg={selected} />}
        {selected && <IcebergRiskPanel icebergId={selected.id} />}
      </div>
    </div>
  );
}

export default IcebergPrediction;
