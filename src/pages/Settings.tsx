import { useState } from "react";
import { Card, cx } from "../components/ui/primitives";
import { useTheme } from "../theme";
import { Moon, Sun } from "lucide-react";

function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#1d445c]/40 light:border-[#e8e0d2] px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[12px] text-[#c8dde3] light:text-[#3a5563] font-medium">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cx(
              "rounded-sm border px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors",
              value === o
                ? "border-[#55d6e8]/60 bg-[#55d6e8]/20 text-[#55d6e8] light:border-[#0f768e] light:bg-[#0f768e] light:text-white"
                : "border-[#1d445c]/60 text-[#91aeb9] hover:text-[#eaf6f8] light:border-[#e2d8c7] light:text-[#4a6878] light:hover:text-[#0d2433]",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [distance, setDistance] = useState("Nautical miles");
  const [speed, setSpeed] = useState("Knots");
  const [temp, setTemp] = useState("°C");
  const [risk, setRisk] = useState("Balanced");
  const [refresh, setRefresh] = useState("15 min");

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Visual Theme Configuration */}
      <div className="max-w-2xl">
        <Card title="Interface & Visual Theme">
          <div className="p-4 space-y-3">
            <p className="text-[12px] text-[#91aeb9] light:text-[#4a6878] leading-relaxed">
              Select your preferred visual mode for <span className="font-semibold text-[#eaf6f8] light:text-[#0d2433]">Dhruv Sarthi</span>.
              Light theme provides an authentic warm cream/off-white palette optimized for daytime bridge operations,
              while Dark theme provides deep contrast for night watch.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all ${
                  theme === "dark"
                    ? "border-[#55d6e8] bg-[#0d2433] text-[#55d6e8] shadow-md shadow-[#55d6e8]/10"
                    : "border-[#1d445c]/60 bg-[#132f40]/40 text-[#91aeb9] hover:border-[#55d6e8]/40"
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#071521] text-[#55d6e8]">
                  <Moon size={18} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#eaf6f8]">Dark Mode (Polar Navy)</div>
                  <div className="text-[11px] text-[#91aeb9]">High-contrast night watch</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all ${
                  theme === "light"
                    ? "border-[#0f768e] bg-[#f0eae0] text-[#0d2433] shadow-md"
                    : "border-[#e2d8c7] bg-white text-[#4a6878] hover:border-[#0f768e]/50"
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f8f5ee] text-[#d97706] border border-[#e2d8c7]">
                  <Sun size={18} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#0d2433]">Light Mode (Warm Cream)</div>
                  <div className="text-[11px] text-[#4a6878]">Soft off-white daylight bridge</div>
                </div>
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="max-w-2xl">
        <Card title="Measurement Units">
          <OptionGroup label="Distance unit" options={["Nautical miles", "Kilometers"]} value={distance} onChange={setDistance} />
          <OptionGroup label="Speed unit" options={["Knots", "km/h", "m/s"]} value={speed} onChange={setSpeed} />
          <OptionGroup label="Temperature unit" options={["°C", "°F"]} value={temp} onChange={setTemp} />
        </Card>
      </div>

      <div className="max-w-2xl">
        <Card title="Neural Decision Preferences">
          <OptionGroup label="Risk Optimization Profile" options={["Safety First (PC6)", "Balanced", "Time Efficient", "Minimum Fuel"]} value={risk} onChange={setRisk} />
          <OptionGroup label="Satellite Telemetry Refresh" options={["5 min", "15 min", "30 min", "1 hour"]} value={refresh} onChange={setRefresh} />
        </Card>
      </div>

      <p className="max-w-2xl text-[11px] text-[#91aeb9] light:text-[#7a93a1]">
        Dhruv Sarthi preferences are persisted locally in this environment and apply across all operational modules.
      </p>
    </div>
  );
}
