import { LogOut, Radio } from "lucide-react";
import { systemMeta, vessel } from "../data/mock";
import { StatusDot } from "./ui/primitives";
import { ThemeToggle } from "../theme";
import type { User } from "../data/auth";

function HeaderItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-[0.12em] text-[#91aeb9] light:text-[#5a7686]">{label}</span>
      <span
        className="font-mono text-[12px] font-medium text-[#eaf6f8] light:text-[#0d2433]"
        style={{ color: accent }}
      >
        {value}
      </span>
    </div>
  );
}

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
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#1d445c]/60 bg-[#0d2433] light:border-[#e2d8c7] light:bg-[#f2ece0] px-5 transition-colors">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{title}</h1>
        <p className="truncate text-[11px] text-[#91aeb9] light:text-[#4a6878]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Status badges */}
        <div className="hidden items-center gap-2 rounded-md border border-[#10b981]/30 bg-[#10b981]/10 light:border-[#10b981]/40 light:bg-[#10b981]/15 px-2.5 py-1 xl:flex">
          <StatusDot color="#10b981" pulse />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#10b981] light:text-[#059669]">
            System Nominal
          </span>
        </div>
        <div className="hidden items-center gap-1.5 text-[#55d6e8] light:text-[#0f768e] lg:flex">
          <Radio size={13} />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">Telemetry Active</span>
        </div>

        <div className="hidden h-8 w-px bg-[#1d445c]/60 light:bg-[#e2d8c7] md:block" />

        <div className="hidden items-center gap-4 md:flex">
          <HeaderItem label="Date" value="26 Aug 2026" />
          <HeaderItem label="UTC" value={systemMeta.utc} accent="#55d6e8" />
          <HeaderItem label="Last Update" value={systemMeta.lastUpdated.split(" ").slice(2).join(" ")} />
          <HeaderItem label="Mission" value={vessel.mission} />
          <HeaderItem label="Vessel" value={vessel.name} />
          <HeaderItem label="Ice Class" value={vessel.iceClass} />
          <HeaderItem label="Speed" value={`${vessel.speedKn} kn`} />
        </div>

        <div className="h-8 w-px bg-[#1d445c]/60 light:bg-[#e2d8c7]" />

        {/* Theme Toggle Button */}
        <ThemeToggle variant="icon" />

        {user && (
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#55d6e8]/40 bg-[#55d6e8]/10 light:border-[#0f768e]/40 light:bg-[#0f768e]/10 font-mono text-[11px] font-semibold text-[#55d6e8] light:text-[#0f768e]">
                {user.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </div>
              <div className="hidden leading-tight lg:block">
                <div className="text-[11px] font-medium text-[#eaf6f8] light:text-[#0d2433]">{user.name}</div>
                <div className="text-[9px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">{user.role}</div>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="ml-1 flex items-center gap-1 rounded-md border border-[#1d445c] light:border-[#d8d0c2] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#91aeb9] light:text-[#4a6878] transition-colors hover:border-[#ff5c5c]/50 hover:text-[#ff5c5c]"
                >
                  <LogOut size={12} /> Sign Out
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
