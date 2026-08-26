import { useState } from "react";
import { Droplets, Eye, Gauge, Snowflake, Thermometer, Waves, Wind } from "lucide-react";
import { Card } from "../components/ui/primitives";
import { DemoTag, EnvironmentalMetric, TimelineSelector } from "../components/ui/phase2";
import { environmentForecast } from "../data/phase2";
import type { Horizon } from "../data/types";

const ENV_HORIZONS: Horizon[] = ["0h", "6h", "12h", "24h", "48h", "72h"];

function Trend({ label, values, unit, color }: { label: string; values: number[]; unit: string; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 200},${44 - ((v - min) / span) * 36 - 4}`)
    .join(" ");
  return (
    <div className="rounded-md border border-[#1d445c]/60 bg-[#132f40]/70 light:border-[#e2d8c7] light:bg-[#faf6ee] p-3.5 shadow-sm transition-colors">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91aeb9] light:text-[#5a7686]">{label}</span>
        <span className="font-mono text-[11px] text-[#c8dde3] light:text-[#0d2433] font-semibold">
          {values[0]}–{values[values.length - 1]} {unit}
        </span>
      </div>
      <svg viewBox="0 0 200 48" className="h-12 w-full">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle key={i} cx={(i / (values.length - 1)) * 200} cy={44 - ((v - min) / span) * 36 - 4} r="2.5" fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-[#5f7d89] light:text-[#7a93a1]">
        {environmentForecast.map((f) => (
          <span key={f.horizon}>{f.time}</span>
        ))}
      </div>
    </div>
  );
}

export function Environmental() {
  const [horizon, setHorizon] = useState<Horizon>("0h");
  const cur = environmentForecast.find((f) => f.horizon === horizon) ?? environmentForecast[0];

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-bold text-[#eaf6f8] light:text-[#0d2433]">Metocean & Atmospheric Intelligence</h2>
          <DemoTag label="POLAR NUMERICAL FORECAST" />
        </div>
        <TimelineSelector
          horizons={ENV_HORIZONS}
          value={horizon}
          onChange={setHorizon}
          labelFor={(h) => (h === "0h" ? "NOW" : `+${h.toUpperCase()}`)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <EnvironmentalMetric icon={Thermometer} label="Air Temperature" value={cur.airTempC} unit="°C" />
        <EnvironmentalMetric icon={Droplets} label="Sea Surface Temp" value={cur.seaTempC} unit="°C" />
        <EnvironmentalMetric icon={Wind} label="Wind Speed" value={cur.windSpeedKn} unit="kn" sub={cur.windDir} />
        <EnvironmentalMetric icon={Waves} label="Wave Height" value={cur.waveHeightM} unit="m" />
        <EnvironmentalMetric icon={Eye} label="Visibility" value={cur.visibilityKm} unit="km" />
        <EnvironmentalMetric icon={Gauge} label="Ocean Current" value={cur.currentKn} unit="kn" sub={cur.currentDir} />
        <EnvironmentalMetric icon={Snowflake} label="Sea-Ice Conc." value={`${cur.seaIceConcentration}%`} />
        <EnvironmentalMetric icon={Wind} label="Wind Vector" value={cur.windDir} />
      </div>

      <Card title="Environmental Timeline (72h Forecast Window)" action={<span className="font-mono text-[10px] text-[#f59e0b]">Ensemble Metocean Model</span>}>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <Trend label="Air Temp (°C)" values={environmentForecast.map((f) => f.airTempC)} unit="°C" color="#8ccfe0" />
          <Trend label="Wind (kn)" values={environmentForecast.map((f) => f.windSpeedKn)} unit="kn" color="#55d6e8" />
          <Trend label="Wave Height (m)" values={environmentForecast.map((f) => f.waveHeightM)} unit="m" color="#3b82f6" />
          <Trend label="Visibility (km)" values={environmentForecast.map((f) => f.visibilityKm)} unit="km" color="#10b981" />
        </div>
        <p className="border-t border-[#1d445c]/40 light:border-[#e8e0d2] px-4 py-3 text-[11px] leading-relaxed text-[#91aeb9] light:text-[#5a7686]">
          Simulated polar atmospheric and oceanographic observations coupled with physical Navier-Stokes drift dynamics.
        </p>
      </Card>
    </div>
  );
}
