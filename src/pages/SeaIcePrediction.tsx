import { useMemo, useState } from "react";
import { AntarcticPolarMap } from "../components/map/AntarcticPolarMap";
import { SeaIceLegend } from "../components/predictions";
import { Card, Chip, Metric, cx } from "../components/ui/primitives";
import { DemoTag, TimelineSelector } from "../components/ui/phase2";
import type { Horizon } from "../data/types";
import { useNav } from "../state";
import { SeaIceTable } from "../components/seaice/SeaIceTable";
import { Layers, Compass } from "lucide-react";

const SI_HORIZONS: Horizon[] = ["0h", "24h", "48h", "72h"];

function formatUtcTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = d.getUTCDate();
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const mins = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${mins} UTC`;
  } catch {
    return isoStr;
  }
}

export function SeaIcePrediction() {
  const nav = useNav();
  const [horizon, setHorizon] = useState<Horizon>("0h");
  const [region, setRegion] = useState<string>("Weddell Sea");
  const [displayMode, setDisplayMode] = useState<"table" | "map">("table");

  // Show loading state if backend sea-ice prediction data has not resolved yet
  if (!nav.seaIcePrediction) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <span className="text-sm font-semibold text-[#91aeb9] animate-pulse">
          Retrieving EUMETSAT OSI-SAF observations and Copernicus Marine forecasts...
        </span>
      </div>
    );
  }

  const predictionData = nav.seaIcePrediction.horizons[horizon] || nav.seaIcePrediction.horizons["0h"];
  const baselineData = nav.seaIcePrediction.horizons["0h"];
  const listForRegions = predictionData.regions || [];

  const heat = useMemo(
    () =>
      listForRegions.map((p) => ({
        region: p.region,
        polygon: (p.polygon || [])
          .filter((pt) => pt && pt.lat != null && pt.lon != null && !isNaN(pt.lat) && !isNaN(pt.lon))
          .map((pt) => ({ lat: pt.lat, lon: pt.lon })),
        concentration: p.currentConcentration,
      })),
    [listForRegions],
  );

  const currentAvg = baselineData.avg_concentration;
  const avgChange = +(predictionData.avg_concentration - currentAvg).toFixed(1);

  const currentRegionData = listForRegions.find((p) => p.region === region) || listForRegions[0];
  const baselineRegionData = (baselineData.regions || []).find((p) => p.region === region) || currentRegionData;
  const regionCurrent = baselineRegionData?.currentConcentration || 0;
  const regionSelectedHorizon = currentRegionData?.currentConcentration || regionCurrent;
  const regionChange = +(regionSelectedHorizon - regionCurrent).toFixed(1);

  const isObservation = horizon === "0h";
  const formattedTime = formatUtcTimestamp(predictionData.timestamp);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {/* Top View Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1d445c]/40 pb-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight">Antarctic Sea-Ice Intelligence</h1>
          <p className="text-[12px] text-[#91aeb9]">Regional satellite concentration grids, daily observations, and multi-horizon regional ML forecasts.</p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-[#1d445c] bg-[#0d2433] p-1">
          <button
            onClick={() => setDisplayMode("table")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold transition-all ${
              displayMode === "table"
                ? "bg-[#55d6e8] text-[#071521] shadow-md"
                : "text-[#91aeb9] hover:text-[#eaf6f8]"
            }`}
          >
            <Layers size={14} />
            <span>15-Region Scientific Table</span>
          </button>
          <button
            onClick={() => setDisplayMode("map")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold transition-all ${
              displayMode === "map"
                ? "bg-[#55d6e8] text-[#071521] shadow-md"
                : "text-[#91aeb9] hover:text-[#eaf6f8]"
            }`}
          >
            <Compass size={14} />
            <span>Polar Geographic View</span>
          </button>
        </div>
      </div>

      {displayMode === "table" ? (
        <div className="flex-1 min-h-0">
          <SeaIceTable />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_360px]">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9] light:text-[#5a7686]">
                  Pack-Ice Concentration {isObservation ? "Observation" : "Forecast"}
                </span>
                <DemoTag label={isObservation ? "EUMETSAT OSI-SAF" : "COPERNICUS MARINE"} />
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#55d6e8] light:text-[#0f768e]">
                <span>{isObservation ? "Observed:" : "Forecast Valid:"} {formattedTime}</span>
              </div>
            </div>

            <TimelineSelector
              horizons={SI_HORIZONS}
              value={horizon}
              onChange={setHorizon}
              labelFor={(h) => (h === "0h" ? "NOW (ANALYSIS)" : `+${h.toUpperCase()}`)}
            />

            <div className="relative min-h-[460px] flex-1 overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors">
              <AntarcticPolarMap
                icebergs={nav.usnicIcebergs}
                selectedIcebergId={nav.selectedUsnicIcebergId}
                onSelectIceberg={nav.setSelectedUsnicIcebergId}
                seaIceHeat={heat}
                selectedRegion={region}
                onSelectRegion={setRegion}
                className="h-full w-full"
              />
              <SeaIceLegend />
            </div>
          </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <Card
          title="Basin Concentration Summary"
          action={
            <span className="font-mono text-[10px] text-[#8ccfe0] light:text-[#0f768e] font-semibold">
              {isObservation ? "Current Analysis" : `+${horizon} Forecast`}
            </span>
          }
        >
          <div className="grid grid-cols-3 gap-px overflow-hidden bg-[#1d445c]/40 light:bg-[#e2d8c7]">
            <div className="bg-[#132f40] light:bg-[#faf6ee] px-3 py-3">
              <Metric label="Average" value={`${predictionData.avg_concentration}%`} accent="#55d6e8" />
            </div>
            <div className="bg-[#132f40] light:bg-[#faf6ee] px-3 py-3">
              <Metric label="Minimum" value={`${predictionData.min_concentration}%`} />
            </div>
            <div className="bg-[#132f40] light:bg-[#faf6ee] px-3 py-3">
              <Metric label="Maximum" value={`${predictionData.max_concentration}%`} />
            </div>
          </div>
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <span className="text-[11px] text-[#91aeb9] light:text-[#5a7686]">
              {isObservation ? "Baseline status" : "Change from Current Analysis"}
            </span>
            <span className="font-mono text-[12px] font-semibold text-[#f59e0b]">
              {isObservation ? "Active Baseline" : `${avgChange >= 0 ? `+${avgChange}` : `${avgChange}`}%`}
            </span>
          </div>
        </Card>

        <Card title={`Antarctic Regional Sectors (${isObservation ? "NOW" : `+${horizon}`})`}>
          <div className="flex flex-col p-2 gap-1">
            {listForRegions.map((p) => (
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
                <span className="font-mono text-[11px] text-[#8ccfe0] light:text-[#0f768e] font-semibold">
                  {p.currentConcentration}%
                </span>
              </button>
            ))}
          </div>
        </Card>

        {currentRegionData && (
          <Card title="Sector Details" action={<DemoTag label={isObservation ? "OSI-401-d" : "Copernicus PHY"} />}>
            <div className="p-3.5">
              <div className="mb-3 text-[14px] font-bold text-[#eaf6f8] light:text-[#0d2433]">
                {currentRegionData.region}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <Metric label="Current (0h)" value={`${regionCurrent}%`} />
                <Metric
                  label={isObservation ? "Selected (0h)" : `Forecast (+${horizon})`}
                  value={`${regionSelectedHorizon}%`}
                  accent="#55d6e8"
                />
                <Metric
                  label="Trend"
                  value={isObservation ? "Baseline" : `${regionChange >= 0 ? `+${regionChange}` : `${regionChange}`}%`}
                  accent="#f59e0b"
                />
                <Metric label="Confidence" value={`${currentRegionData.confidence}%`} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#1d445c]/40 light:border-[#e8e0d2] pt-3">
                <span className="text-[11px] text-[#91aeb9] light:text-[#5a7686]">
                  Route Impact · <span className="text-[#c8dde3] light:text-[#0d2433] font-semibold">{currentRegionData.affectedRoute}</span>
                </span>
                <Chip level={currentRegionData.routeImpact}>{currentRegionData.routeImpact.toUpperCase()}</Chip>
              </div>
            </div>
          </Card>
        )}

        {/* Data Provenance Metadata Card */}
        <div className="border border-[#1d445c]/60 light:border-[#e2d8c7] p-3 bg-[#0d2433]/40 light:bg-[#fcfbf9] rounded-lg">
          <div className="flex flex-col gap-1.5 text-[10px] font-mono text-[#91aeb9] light:text-[#5a7686]">
            <div className="flex justify-between">
              <span>SOURCE PRODUCT:</span>
              <span className="font-semibold text-[#55d6e8] light:text-[#0f768e] text-right truncate max-w-[200px]" title={predictionData.source_product}>
                {predictionData.source_product}
              </span>
            </div>
            <div className="flex justify-between">
              <span>DATA TYPE:</span>
              <span className="text-[#eaf6f8] light:text-[#0d2433]">
                {isObservation ? "Current Analysis (Observation)" : "Copernicus Marine Forecast"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{isObservation ? "OBSERVATION TIME:" : "FORECAST VALID TIME:"}</span>
              <span className="text-[#eaf6f8] light:text-[#0d2433]">{formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span>SPATIAL RES:</span>
              <span className="text-[#eaf6f8] light:text-[#0d2433]">{predictionData.spatial_resolution}</span>
            </div>
            <div className="flex justify-between">
              <span>UNITS:</span>
              <span className="text-[#eaf6f8] light:text-[#0d2433]">Fractional concentration (%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
      )}
    </div>
  );
}

export default SeaIcePrediction;
