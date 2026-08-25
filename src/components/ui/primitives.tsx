import type { ReactNode } from "react";
import type { RiskLevel, Severity } from "../../data/types";

// Shared low-level UI building blocks used across every panel and page.
export const RISK_COLORS: Record<RiskLevel | "ok", string> = {
  low: "#10b981",
  ok: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
};

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-md border backdrop-blur-[1px] transition-colors",
        // Dark theme styles
        "border-[#1d445c]/70 bg-[#132f40]/70",
        // Light theme styles
        "light:border-[#e2d8c7] light:bg-[#ffffff]/90 light:shadow-sm",
        className,
      )}
    >
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-[#1d445c]/60 light:border-[#e8e0d2] px-3.5 py-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9] light:text-[#4a6878]">
            {title}
          </h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Chip({
  level,
  children,
}: {
  level: RiskLevel | "ok";
  children: ReactNode;
}) {
  const c = RISK_COLORS[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: c, backgroundColor: `${c}1a`, border: `1px solid ${c}4d` }}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  color,
  pulse,
}: {
  color: string;
  pulse?: boolean;
}) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ backgroundColor: color, animation: "blink 1.8s ease-in-out infinite" }}
        />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
    </span>
  );
}

export function Metric({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#91aeb9] light:text-[#5a7686]">
        {label}
      </span>
      <span className="font-mono text-[15px] font-semibold tnum text-[#eaf6f8] light:text-[#0d2433]" style={{ color: accent }}>
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-[#91aeb9] light:text-[#78909e]">{unit}</span>}
      </span>
    </div>
  );
}

export const SEVERITY_COLORS: Record<Severity, string> = {
  info: "#55d6e8",
  warning: "#f5b942",
  critical: "#ff5c5c",
};

export function RiskMeter({ score }: { score: number }) {
  const color = score >= 66 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#10b981";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0d2433] light:bg-[#e4dcce]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-[12px] font-semibold tnum" style={{ color }}>
        {score}
        <span className="text-[#91aeb9] light:text-[#78909e]">/100</span>
      </span>
    </div>
  );
}
