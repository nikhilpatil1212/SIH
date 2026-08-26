import { LogOut } from "lucide-react";
import { systemMeta } from "../data/mock";
import { StatusDot } from "./ui/primitives";
import { ThemeToggle } from "../theme";
import type { User } from "../data/auth";

export function TopBar({
  title,
  subtitle,
  user,
  onSignOut,
}: {
  title: string;
  subtitle: string;
  user?: User | null;
  onSignOut?: () => void;
}) {
  return (
    <header className="flex h-13 shrink-0 items-center justify-between gap-4 border-b border-[#1d445c]/50 bg-[#0a1e2d] light:border-[#e2d8c7] light:bg-[#f5efe3] px-5 transition-colors">
      <div className="min-w-0">
        <h1 className="truncate text-[14px] font-bold text-[#eaf6f8] light:text-[#0d2433] tracking-tight">{title}</h1>
        <p className="truncate text-[11px] text-[#91aeb9] light:text-[#5a7686]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Live Telemetry Status Pill */}
        <div className="flex items-center gap-2 rounded-full border border-[#10b981]/30 bg-[#10b981]/10 light:border-[#10b981]/40 light:bg-[#10b981]/15 px-3 py-1">
          <StatusDot color="#10b981" pulse />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#10b981] light:text-[#059669]">
            Live Telemetry
          </span>
        </div>

        {/* UTC Time Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-[#1d445c]/60 bg-[#071521]/70 light:border-[#d8d0c2] light:bg-[#eae2d4] px-2.5 py-1">
          <span className="text-[10px] font-mono text-[#91aeb9] light:text-[#5a7686]">UTC</span>
          <span className="font-mono text-[11px] font-bold text-[#55d6e8] light:text-[#0f768e]">{systemMeta.utc}</span>
        </div>

        <div className="h-6 w-px bg-[#1d445c]/60 light:bg-[#d8d0c2]" />

        {/* Theme Toggle Button */}
        <ThemeToggle variant="icon" />

        {user && (
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#55d6e8]/40 bg-[#55d6e8]/10 light:border-[#0f768e]/40 light:bg-[#0f768e]/10 font-mono text-[10px] font-bold text-[#55d6e8] light:text-[#0f768e]">
              {user.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
            <div className="hidden leading-tight md:block">
              <div className="text-[11px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{user.name}</div>
              <div className="text-[9px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">{user.role}</div>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="ml-1 flex items-center gap-1 rounded-md border border-[#1d445c] light:border-[#d8d0c2] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#91aeb9] light:text-[#4a6878] transition-colors hover:border-[#ff5c5c]/50 hover:text-[#ff5c5c]"
                title="Sign Out"
              >
                <LogOut size={12} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
