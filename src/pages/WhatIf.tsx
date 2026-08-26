import { useMemo, useState, type ChangeEvent } from "react";
import { Card, Metric, RiskMeter, cx } from "../components/ui/primitives";

type Scenario = "normal" | "heavy-ice" | "iceberg" | "poor-vis" | "high-wind";

const SCENARIOS: { id: Scenario; label: string; riskMod: number; etaMod: number; fuelMod: number }[] = [
  { id: "normal", label: "Normal polar conditions", riskMod: 0, etaMod: 0, fuelMod: 0 },
  { id: "heavy-ice", label: "Heavy sea ice & compression", riskMod: 22, etaMod: 14, fuelMod: 12 },
  { id: "iceberg", label: "High iceberg activity & tabular calvings", riskMod: 30, etaMod: 8, fuelMod: 6 },
  { id: "poor-vis", label: "Polar whiteout & poor visibility", riskMod: 16, etaMod: 10, fuelMod: 4 },
  { id: "high-wind", label: "Katabatic gale winds & swell", riskMod: 18, etaMod: 6, fuelMod: 9 },
];

export function WhatIf() {
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [speed, setSpeed] = useState(14);
  const [tolerance, setTolerance] = useState(50);
  const [departure, setDeparture] = useState("2026-08-26T10:30");

  const sc = SCENARIOS.find((s) => s.id === scenario)!;

  const result = useMemo(() => {
    const baseHours = 132;
    const speedFactor = 14 / speed;
    const etaH = Math.round(baseHours * speedFactor * (1 + sc.etaMod / 100));
    const fuel = Math.round(112 * (1 + sc.fuelMod / 100) * (0.9 + speed / 140));
    let risk = Math.round(38 + sc.riskMod + (50 - tolerance) * 0.25 + (speed - 14) * 1.5);
    risk = Math.max(8, Math.min(96, risk));
    const recommended = risk >= 60 ? "Route B — Safest" : risk >= 42 ? "Route C — Fuel Efficient" : "Route A — Fastest";
    return {
      eta: `${Math.floor(etaH / 24)}d ${etaH % 24}h`,
      fuel,
      risk,
      recommended,
    };
  }, [scenario, speed, tolerance, sc]);

  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-[420px_1fr]">
      <div className="flex flex-col gap-3">
        <Card title="Operational Scenarios">
          <div className="grid grid-cols-1 gap-1.5 p-2.5">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={cx(
                  "rounded-md border px-3 py-2.5 text-left text-[12px] font-medium transition-colors",
                  scenario === s.id
                    ? "border-[#55d6e8]/60 bg-[#0d2433] text-[#eaf6f8] light:border-[#0f768e] light:bg-[#f2ebe0] light:text-[#0d2433]"
                    : "border-[#1d445c]/50 text-[#91aeb9] hover:border-[#55d6e8]/30 light:border-[#e2d8c7] light:text-[#4a6878] light:hover:bg-[#f5efe3]",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Vessel & Simulation Parameters">
          <div className="flex flex-col gap-4 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-[#91aeb9] light:text-[#5a7686]">Departure timestamp</span>
              <input
                type="datetime-local"
                value={departure}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDeparture(e.target.value)}
                className="rounded-md border border-[#1d445c] bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#fdfbf7] px-3 py-2 font-mono text-[12px] text-[#eaf6f8] light:text-[#0d2433] outline-none focus:border-[#55d6e8]/60"
              />
            </label>
            <Slider label="Vessel cruising speed" value={speed} min={8} max={18} unit="kn" onChange={setSpeed} />
            <div>
              <div className="mb-1.5 flex justify-between text-[11px]">
                <span className="text-[#91aeb9] light:text-[#5a7686]">Risk tolerance profile</span>
                <span className="font-mono text-[#55d6e8] light:text-[#0f768e] font-semibold">
                  {tolerance < 34 ? "Safety First (PC6)" : tolerance > 66 ? "Time Efficient" : "Balanced Optimization"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={tolerance}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTolerance(+e.target.value)}
                className="w-full accent-[#55d6e8] light:accent-[#0f768e]"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <Card title="Projected Strategic Outcome" action={<span className="font-mono text-[10px] text-[#f59e0b]">Simulated Projection</span>}>
          <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
            <Metric label="Expected Voyage ETA" value={result.eta} accent="#55d6e8" />
            <Metric label="Bunker Fuel Estimate" value={result.fuel} unit="t" />
            <Metric label="Active Scenario" value={sc.label} />
          </div>
          <div className="border-t border-[#1d445c]/50 light:border-[#e8e0d2] p-5">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">Calculated Risk Index</div>
            <RiskMeter score={result.risk} />
          </div>
          <div className="border-t border-[#1d445c]/50 light:border-[#e8e0d2] p-5">
            <div className="text-[11px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">Recommended Corridor</div>
            <div className="mt-1 text-[18px] font-bold text-[#10b981]">{result.recommended}</div>
          </div>
        </Card>
        <div className="rounded-md border border-[#1d445c]/50 bg-[#0d2433]/40 light:border-[#e2d8c7] light:bg-[#f6f0e4] p-4 text-[11px] leading-relaxed text-[#91aeb9] light:text-[#5a7686]">
          Simulated sensitivity modeling for ice resistance, speed-over-ground drag, and hazard encounter probabilities.
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[11px]">
        <span className="text-[#91aeb9] light:text-[#5a7686]">{label}</span>
        <span className="font-mono text-[#eaf6f8] light:text-[#0d2433] font-bold">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(+e.target.value)}
        className="w-full accent-[#55d6e8] light:accent-[#0f768e]"
      />
    </div>
  );
}
