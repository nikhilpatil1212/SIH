import { Cloud, Minus, Plus, Snowflake, Triangle, Waves } from "lucide-react";
import type { LayerState } from "./MapView";
import { cx } from "../ui/primitives";

const LAYER_DEFS: { key: keyof LayerState; label: string; icon: typeof Snowflake }[] = [
  { key: "icebergs", label: "Icebergs", icon: Triangle },
  { key: "seaice", label: "Sea-Ice", icon: Snowflake },
  { key: "currents", label: "Currents", icon: Waves },
  { key: "weather", label: "Weather", icon: Cloud },
];

export function LayerControl({
  layers,
  onToggle,
}: {
  layers: LayerState;
  onToggle: (k: keyof LayerState) => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-10 w-40 rounded-md border border-[#1d445c]/70 bg-[#071521]/90 p-1.5 backdrop-blur">
      <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9]">Layers</div>
      {LAYER_DEFS.map((l) => {
        const on = layers[l.key];
        return (
          <button
            key={l.key}
            onClick={() => onToggle(l.key)}
            className={cx(
              "flex w-full items-center justify-between rounded px-2 py-1.5 text-[12px] transition-colors",
              on ? "text-[#eaf6f8]" : "text-[#5f7d89]",
            )}
          >
            <span className="flex items-center gap-2">
              <l.icon size={13} className={on ? "text-[#55d6e8]" : ""} />
              {l.label}
            </span>
            <span
              className={cx(
                "relative h-3.5 w-6 rounded-full transition-colors",
                on ? "bg-[#55d6e8]/70" : "bg-[#1d445c]",
              )}
            >
              <span
                className={cx(
                  "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-[#eaf6f8] transition-all",
                  on ? "left-3" : "left-0.5",
                )}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ZoomControl({ onZoom }: { onZoom: (d: number) => void }) {
  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col overflow-hidden rounded-md border border-[#1d445c]/70 bg-[#071521]/90 backdrop-blur">
      <button onClick={() => onZoom(0.2)} className="p-2 text-[#c8dde3] hover:bg-[#132f40] hover:text-[#55d6e8]" aria-label="Zoom in">
        <Plus size={15} />
      </button>
      <div className="h-px bg-[#1d445c]/70" />
      <button onClick={() => onZoom(-0.2)} className="p-2 text-[#c8dde3] hover:bg-[#132f40] hover:text-[#55d6e8]" aria-label="Zoom out">
        <Minus size={15} />
      </button>
    </div>
  );
}

const LEGEND: { color: string; label: string; dashed?: boolean }[] = [
  { color: "#55d6e8", label: "Vessel" },
  { color: "#ff5c5c", label: "Iceberg" },
  { color: "#b8e8f0", label: "Sea Ice" },
  { color: "#3b82f6", label: "Current Route" },
  { color: "#55d6e8", label: "Predicted Route", dashed: true },
  { color: "#ff5c5c", label: "Hazard Zone" },
];

export function Legend() {
  return (
    <div className="absolute bottom-3 right-3 z-10 rounded-md border border-[#1d445c]/70 bg-[#071521]/90 p-2.5 backdrop-blur">
      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9]">Legend</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            {l.dashed ? (
              <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: l.color }} />
            ) : (
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
            )}
            <span className="text-[10px] text-[#c8dde3]">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
