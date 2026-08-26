import { useMemo, useState } from "react";
import { AntarcticPolarMap } from "../components/map/AntarcticPolarMap";
import { SeaIceLegend } from "../components/predictions";
import { Card, Chip, Metric, cx } from "../components/ui/primitives";
import { DemoTag, TimelineSelector } from "../components/ui/phase2";
import { seaIceBasin, seaIcePredictions } from "../data/phase2";
import type { Horizon } from "../data/types";
import { useNav } from "../state";

const SI_HORIZONS: Horizon[] = ["0h", "24h", "48h", "72h"];

function concentrationAt(regionIdx: number, horizon: Horizon): number {
  const p = seaIcePredictions[regionIdx];
  if (horizon === "0h") return p.currentConcentration;
  return p.predictions.find((x) => x.horizon === horizon)?.concentration ?? p.currentConcentration;
}

export function SeaIcePrediction() {
  const nav = useNav();
  const [horizon, setHorizon] = useState<Horizon>("0h");
  const [region, setRegion] = useState<string>(seaIcePredictions[0].region);

  const heat = useMemo(
    () =>
      seaIcePredictions.map((p, i) => ({
        region: p.region,
        polygon: p.polygon.map((pt) => ({ lat: pt.lat, lon: pt.lon })),
        concentration: concentrationAt(i, horizon),
      })),
    [horizon],
  );

  const basin = seaIceBasin.find((b) => b.horizon === horizon) ?? seaIceBasin[0];
  const regionIdx = seaIcePredictions.findIndex((p) => p.region === region);
  const pred = seaIcePredictions[regionIdx] ?? seaIcePredictions[0];
  const regionCurrent = pred.currentConcentration;
  const region24 = concentrationAt(regionIdx >= 0 ? regionIdx : 0, "24h");

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-[1fr_360px]">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9] light:text-[#5a7686]">
              Pack-Ice Concentration Forecast
            </span>
            <DemoTag label="MICROWAVE RADIOMETRY" />
          </div>
        </div>
        <TimelineSelector
          horizons={SI_HORIZONS}
          value={horizon}
          onChange={setHorizon}
          labelFor={(h) => (h === "0h" ? "CURRENT" : `+${h.toUpperCase()}`)}
        />

        <div className="relative min-h-[460px] flex-1 overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors">
          <AntarcticPolarMap
            icebergs={nav.icebergs}
            selectedIcebergId={nav.selectedIcebergId}
            onSelectIceberg={nav.setSelectedIceberg}
            seaIceHeat={heat}
            selectedRegion={region}
            onSelectRegion={setRegion}
            className="h-full w-full"
          />
          <SeaIceLegend />
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <Card title="Basin Summary" action={<span className="font-mono text-[10px] text-[#8ccfe0] light:text-[#0f768e] font-semibold">{horizon === "0h" ? "Current" : `+${horizon}`}</span>}>
          <div className="grid grid-cols-3 gap-px overflow-hidden bg-[#1d445c]/40 light:bg-[#e2d8c7]">
            <div className="bg-[#132f40] light:bg-[#faf6ee] px-3 py-3">
              <Metric label="Average" value={`${basin.avg}%`} accent="#55d6e8" />
            </div>
            <div className="bg-[#132f40] light:bg-[#faf6ee] px-3 py-3">
              <Metric label="Minimum" value={`${basin.min}%`} />
            </div>
            <div className="bg-[#132f40] light:bg-[#faf6ee] px-3 py-3">
              <Metric label="Maximum" value={`${basin.max}%`} />
            </div>
          </div>
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <span className="text-[11px] text-[#91aeb9] light:text-[#5a7686]">Change from current</span>
            <span className="font-mono text-[12px] font-semibold text-[#f59e0b]">
              +{basin.avg - seaIceBasin[0].avg}%
            </span>
          </div>
        </Card>

        <Card title="Antarctic Regional Sectors">
          <div className="flex flex-col p-2 gap-1">
            {seaIcePredictions.map((p) => (
              <button
                key={p.region}
                onClick={() => setRegion(p.region)}
                className={cx(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                  p.region === region
                    ? "border-[#55d6e8]/60 bg-[#0d2433] light:border-[#0f768e] light:bg-[#f2ebe0]"
                    : "border-transparent hover:bg-[#0d2433]/50 light:hover:bg-[#f5efe3]",
                )}
              >
                <span className="text-[12px] font-medium text-[#eaf6f8] light:text-[#0d2433]">{p.region}</span>
                <span className="font-mono text-[11px] text-[#8ccfe0] light:text-[#0f768e] font-semibold">{p.currentConcentration}%</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Sector Details" action={<DemoTag label="AMSR-2" />}>
          <div className="p-3.5">
            <div className="mb-3 text-[14px] font-bold text-[#eaf6f8] light:text-[#0d2433]">{pred.region}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              <Metric label="Current" value={`${regionCurrent}%`} />
              <Metric label="+24h" value={`${region24}%`} accent="#55d6e8" />
              <Metric label="Change" value={`+${region24 - regionCurrent}%`} accent="#f59e0b" />
              <Metric label="Confidence" value={`${pred.confidence}%`} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#1d445c]/40 light:border-[#e8e0d2] pt-3">
              <span className="text-[11px] text-[#91aeb9] light:text-[#5a7686]">
                Route Impact · <span className="text-[#c8dde3] light:text-[#0d2433] font-semibold">{pred.affectedRoute}</span>
              </span>
              <Chip level={pred.routeImpact}>{pred.routeImpact.toUpperCase()}</Chip>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SeaIcePrediction;
