import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Hazard } from "../data/types";
import { Card, cx } from "../components/ui/primitives";
import { HazardCard } from "../components/predictions";
import { StateBlock } from "../components/ui/phase2";
import { useNav } from "../state";

const CATEGORIES: { id: Hazard["type"] | "All"; label: string }[] = [
  { id: "All", label: "All" },
  { id: "Iceberg", label: "Iceberg" },
  { id: "Sea-Ice", label: "Sea Ice" },
  { id: "Weather", label: "Weather" },
  { id: "Visibility", label: "Visibility" },
  { id: "Ocean", label: "Ocean Conditions" },
];

export function Hazards() {
  const { hazards } = useNav();
  const [category, setCategory] = useState<Hazard["type"] | "All">("All");
  const filtered = hazards.filter((h) => category === "All" || h.type === category);
  const counts = {
    total: hazards.length,
    active: hazards.filter((h) => h.status === "active").length,
    predicted: hazards.filter((h) => h.status === "predicted").length,
    high: hazards.filter((h) => h.severity === "high").length,
  };


  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total Hazards" value={counts.total} />
        <Stat label="Active Radar Contacts" value={counts.active} accent="#f59e0b" />
        <Stat label="Predicted Intercepts" value={counts.predicted} accent="#55d6e8" />
        <Stat label="Critical Severity" value={counts.high} accent="#ef4444" />
      </div>

      <Card
        title="Hazard Categories"
        action={<span className="font-mono text-[10px] text-[#91aeb9] light:text-[#5a7686]">{filtered.length} active classifications</span>}
      >
        <div className="flex flex-wrap gap-1.5 p-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cx(
                "rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors",
                category === c.id
                  ? "bg-[#55d6e8]/20 text-[#55d6e8] light:bg-[#0f768e] light:text-white"
                  : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#4a6878] light:hover:text-[#0d2433]",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      {hazards.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#55d6e8]/10 text-[#55d6e8]">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-[15px] font-bold text-[#eaf6f8] light:text-[#0d2433]">Live hazard data unavailable</h3>
            <p className="mt-1 text-[12px] text-[#91aeb9] light:text-[#5a7686]">
              No active or predicted iceberg collision hazards detected along Antarctic shipping corridors.
            </p>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <StateBlock kind="empty" message="No hazards in this category." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((h) => (
            <HazardCard key={h.id} hazard={h} />
          ))}
        </div>
      )}


      <div className="flex items-center gap-2 text-[11px] text-[#91aeb9] light:text-[#7a94a2]">
        <AlertTriangle size={13} className="text-[#f59e0b]" /> Continuous satellite radar monitoring and hazard trajectory fusion active.
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-md border border-[#1d445c]/60 bg-[#132f40]/70 light:border-[#e2d8c7] light:bg-white px-4 py-3 shadow-sm transition-colors">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91aeb9] light:text-[#5a7686]">{label}</div>
      <div className="mt-1 font-mono text-[22px] font-bold tnum text-[#eaf6f8] light:text-[#0d2433]" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}
