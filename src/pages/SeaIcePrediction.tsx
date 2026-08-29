import { useMemo, useState, useEffect } from "react";
import { AntarcticPolarMap } from "../components/map/AntarcticPolarMap";
import { SeaIceLegend } from "../components/predictions";
import { Card, Chip, Metric, cx } from "../components/ui/primitives";
import { DemoTag, TimelineSelector } from "../components/ui/phase2";
import { seaIceBasin, seaIcePredictions, seaIceModelMetrics } from "../data/phase2";
import type { Horizon } from "../data/types";
import { useNav } from "../state";
import type { PageId } from "../components/Sidebar";
import { apiClient } from "../api/client";
import { Cpu, CheckCircle2, AlertTriangle, Layers } from "lucide-react";

const SI_HORIZONS: Horizon[] = ["0h", "24h", "48h", "72h"];

function concentrationAt(regionIdx: number, horizon: Horizon, customPredictions?: any[]): number {
  const list = customPredictions ?? seaIcePredictions;
  const p = list[regionIdx];
  if (!p) return 50;
  if (horizon === "0h") return p.currentConcentration ?? p.current_concentration ?? 50;
  return p.predictions?.find((x: any) => x.horizon === horizon)?.concentration ?? p.currentConcentration ?? 50;
}

export function SeaIcePrediction({ onNavigate }: { onNavigate?: (p: PageId) => void }) {
  const nav = useNav();
  const [horizon, setHorizon] = useState<Horizon>("0h");
  const [region, setRegion] = useState<string>(seaIcePredictions[0].region);
  const [liveForecast, setLiveForecast] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.getSeaIceForecast().then((data) => {
      if (!cancelled && data && data.regional_predictions) {
        setLiveForecast(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const effectivePredictions = liveForecast?.regional_predictions
    ? liveForecast.regional_predictions.map((r: any, idx: number) => ({
        region: r.region,
        currentConcentration: r.current_concentration,
        confidence: r.confidence,
        routeImpact: r.route_impact,
        affectedRoute: r.affected_route,
        predictions: r.predictions,
        polygon: (seaIcePredictions[idx] || seaIcePredictions[0]).polygon,
      }))
    : seaIcePredictions;

  const heat = useMemo(
    () =>
      effectivePredictions.map((p: any, i: number) => ({
        region: p.region,
        polygon: p.polygon.map((pt: any) => ({ lat: pt.lat, lon: pt.lon })),
        concentration: concentrationAt(i, horizon, effectivePredictions),
      })),
    [horizon, effectivePredictions],
  );

  const basinList = liveForecast?.basin_statistics ?? seaIceBasin;
  const basin = basinList.find((b: any) => b.horizon === horizon) ?? basinList[0];
  const regionIdx = effectivePredictions.findIndex((p: any) => p.region === region);
  const pred = effectivePredictions[regionIdx >= 0 ? regionIdx : 0];
  const regionCurrent = pred.currentConcentration;
  const regionVal = concentrationAt(regionIdx >= 0 ? regionIdx : 0, horizon, effectivePredictions);
  const region24 = concentrationAt(regionIdx >= 0 ? regionIdx : 0, "24h", effectivePredictions);
  const region48 = concentrationAt(regionIdx >= 0 ? regionIdx : 0, "48h", effectivePredictions);
  const region72 = concentrationAt(regionIdx >= 0 ? regionIdx : 0, "72h", effectivePredictions);

  const extentForHorizon =
    horizon === "0h"
      ? seaIceModelMetrics.currentExtent
      : horizon === "24h"
      ? seaIceModelMetrics.predicted24hExtent
      : horizon === "48h"
      ? seaIceModelMetrics.predicted48hExtent
      : seaIceModelMetrics.predicted72hExtent;

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-[1fr_360px]">
      <div className="flex min-h-0 flex-col gap-3">
        {/* ML Model Training Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1d445c]/80 bg-[#071927]/90 px-3 py-2 text-[11px] backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#10b981]/20 text-[#10b981]">
              <Cpu size={12} />
            </span>
            <span className="font-mono font-bold text-[#eaf6f8]">
              ML Model: Trained on antarctic_sea_ice_ml_dataset.csv ({seaIceModelMetrics.totalSamples.toLocaleString()} records, 1978–2026)
            </span>
            <span className="rounded bg-[#10b981]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#10b981]">
              R²: {(seaIceModelMetrics.r2_24h * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#55d6e8] font-mono">
            <CheckCircle2 size={12} className="text-[#10b981]" />
            <span>Colormap Active: Rendered strictly on OpenStreetMap</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9] light:text-[#5a7686]">
              Pack-Ice Concentration Forecast
            </span>
            <DemoTag label="AUTOREGRESSIVE RIDGE ML" />
          </div>
          <span className="font-mono text-[10px] text-[#8ccfe0]">
            Antarctic Sea Ice Extent: <strong className="text-[#55d6e8]">{extentForHorizon} M km²</strong>
          </span>
        </div>

        <TimelineSelector
          horizons={SI_HORIZONS}
          value={horizon}
          onChange={setHorizon}
          labelFor={(h) => (h === "0h" ? "CURRENT (0h)" : `+${h.toUpperCase()}`)}
        />

        <div className="relative min-h-[460px] flex-1 overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors">
          <AntarcticPolarMap
            icebergs={nav.icebergs}
            selectedIcebergId={nav.selectedIcebergId}
            onSelectIceberg={(id) => {
              nav.setSelectedIceberg(id);
              onNavigate?.("iceberg");
            }}
            initialProviderId="osm"
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

        <Card title="Antarctic Regional Sectors" action={<span className="font-mono text-[9px] text-[#55d6e8]">{horizon}</span>}>
          <div className="flex flex-col p-2 gap-1">
            {effectivePredictions.map((p: any, idx: number) => {
              const concNow = concentrationAt(idx, horizon, effectivePredictions);
              return (
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
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#8ccfe0] light:text-[#0f768e] font-semibold">{concNow}%</span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          concNow < 15
                            ? "#a5f3fc"
                            : concNow < 30
                            ? "#2dd4bf"
                            : concNow < 45
                            ? "#0ea5e9"
                            : concNow < 60
                            ? "#2563eb"
                            : concNow < 75
                            ? "#7c3aed"
                            : concNow < 85
                            ? "#f97316"
                            : "#dc2626",
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Sector Multi-Horizon Forecast" action={<DemoTag label="AI PREDICTION" />}>
          <div className="p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#eaf6f8] light:text-[#0d2433]">{pred.region}</span>
              <span className="font-mono text-[13px] font-extrabold text-[#55d6e8]">{regionVal}% ({horizon})</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              <Metric label="Current (0h)" value={`${regionCurrent}%`} />
              <Metric label="+24h Ahead" value={`${region24}%`} accent="#55d6e8" />
              <Metric label="+48h Ahead" value={`${region48}%`} accent="#818cf8" />
              <Metric label="+72h Ahead" value={`${region72}%`} accent="#f59e0b" />
              <Metric label="Net Delta" value={`${regionVal >= regionCurrent ? "+" : ""}${(regionVal - regionCurrent).toFixed(1)}%`} accent="#f59e0b" />
              <Metric label="Model Confidence" value={`${pred.confidence}%`} />
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
