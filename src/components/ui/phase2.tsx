import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, WifiOff } from "lucide-react";
import type { Horizon } from "../../data/types";
import { cx } from "./primitives";

// Small, widely-reused Phase 2 primitives.
export function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 80 ? "#10b981" : value >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold"
      style={{ color, backgroundColor: `${color}1f`, border: `1px solid ${color}44` }}
    >
      {value}% CONF
    </span>
  );
}

export function DemoTag({ label = "AI PREDICTION" }: { label?: string }) {
  return (
    <span className="rounded-sm bg-[#f5b942]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#f5b942] light:bg-[#f59e0b]/15 light:text-[#d97706]">
      {label}
    </span>
  );
}

export function TimelineSelector({
  horizons,
  value,
  onChange,
  labelFor,
}: {
  horizons: Horizon[];
  value: Horizon;
  onChange: (h: Horizon) => void;
  labelFor?: (h: Horizon) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-[#1d445c]/60 bg-[#0d2433]/60 light:border-[#e2d8c7] light:bg-[#f4eee3] p-1">
      {horizons.map((h) => (
        <button
          key={h}
          onClick={() => onChange(h)}
          className={cx(
            "rounded-sm px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
            value === h
              ? "bg-[#55d6e8]/20 text-[#55d6e8] light:bg-[#0f768e] light:text-white"
              : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#4a6878] light:hover:text-[#0d2433]",
          )}
        >
          {labelFor ? labelFor(h) : `+${h}`}
        </button>
      ))}
    </div>
  );
}

export function EnvironmentalMetric({
  icon: Icon,
  label,
  value,
  unit,
  sub,
}: {
  icon: typeof AlertCircle;
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-[#1d445c]/60 bg-[#132f40]/70 light:border-[#e2d8c7] light:bg-white p-3.5 shadow-sm transition-colors">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#91aeb9] light:text-[#5a7686]">
        <Icon size={13} className="text-[#55d6e8] light:text-[#0f768e]" strokeWidth={1.7} /> {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[22px] font-semibold tnum text-[#eaf6f8] light:text-[#0d2433]">{value}</span>
        {unit && <span className="text-[12px] text-[#91aeb9] light:text-[#78909e]">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[11px] text-[#8ccfe0] light:text-[#0f768e]">{sub}</div>}
    </div>
  );
}

type StateKind = "loading" | "empty" | "error" | "offline";

const STATE_ICON = {
  loading: Loader2,
  empty: Inbox,
  error: AlertCircle,
  offline: WifiOff,
} as const;

export function StateBlock({
  kind,
  message,
  className,
}: {
  kind: StateKind;
  message: string;
  className?: string;
}) {
  const Icon = STATE_ICON[kind];
  const color = kind === "error" ? "#ef4444" : kind === "offline" ? "#f59e0b" : "#91aeb9";
  return (
    <div className={cx("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <Icon size={26} className={kind === "loading" ? "animate-spin" : ""} style={{ color }} strokeWidth={1.6} />
      <p className="text-[12px]" style={{ color }}>
        {message}
      </p>
    </div>
  );
}
