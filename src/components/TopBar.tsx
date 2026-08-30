import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { systemMeta } from "../data/mock";
import { StatusDot } from "./ui/primitives";
import { ThemeToggle } from "../theme";
import type { User } from "../data/auth";
import apiClient from "../api/client";

export function TopBar({
  title,
  subtitle,
  user,
  onSignOut,
  onAlertAdmin,
  onOpenAdmin,
}: {
  title: string;
  subtitle: string;
  user?: User | null;
  onSignOut?: () => void;
  onAlertAdmin?: () => void;
  onOpenAdmin?: () => void;
}) {
  const [backendStatus, setBackendStatus] = useState<"connecting" | "online" | "offline">("connecting");

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const res = await apiClient.checkHealth();
      if (!mounted) return;
      if (res && (res.status === "ok" || res.status === "HEALTHY")) {
        setBackendStatus("online");
      } else {
        setBackendStatus("offline");
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="flex h-13 shrink-0 items-center justify-between gap-4 border-b border-[#1d445c]/50 bg-[#0a1e2d] light:border-[#e2d8c7] light:bg-[#f5efe3] px-5 transition-colors">
      <div className="min-w-0">
        <h1 className="truncate text-[14px] font-bold text-[#eaf6f8] light:text-[#0d2433] tracking-tight">{title}</h1>
        <p className="truncate text-[11px] text-[#91aeb9] light:text-[#5a7686]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Real Backend Status Indicator */}
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1 transition-colors ${
            backendStatus === "online"
              ? "border-[#10b981]/40 bg-[#10b981]/15 text-[#10b981] light:border-[#10b981]/50 light:text-[#059669]"
              : backendStatus === "connecting"
              ? "border-[#f5b942]/40 bg-[#f5b942]/15 text-[#f5b942] light:border-[#d97706]/50 light:text-[#d97706]"
              : "border-[#ef4444]/40 bg-[#ef4444]/15 text-[#ef4444] light:border-[#dc2626]/50 light:text-[#dc2626]"
          }`}
          title={
            backendStatus === "online"
              ? "FastAPI AI Engine Connected"
              : backendStatus === "connecting"
              ? "Connecting to FastAPI..."
              : "Backend Offline (Port 8000)"
          }
        >
          <StatusDot
            color={backendStatus === "online" ? "#10b981" : backendStatus === "connecting" ? "#f5b942" : "#ef4444"}
            pulse={backendStatus === "online" || backendStatus === "connecting"}
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
            {backendStatus === "online"
              ? "BACKEND ONLINE"
              : backendStatus === "connecting"
              ? "CONNECTING..."
              : "BACKEND OFFLINE"}
          </span>
        </div>

        {/* UTC Time Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-[#1d445c]/60 bg-[#071521]/70 light:border-[#d8d0c2] light:bg-[#eae2d4] px-2.5 py-1">
          <span className="text-[10px] font-mono text-[#91aeb9] light:text-[#5a7686]">UTC</span>
          <span className="font-mono text-[11px] font-bold text-[#55d6e8] light:text-[#0f768e]">{systemMeta.utc}</span>
        </div>

        {/* 🚨 Emergency ALERT ADMIN Button */}
        <button
          onClick={onAlertAdmin}
          className="flex items-center gap-1.5 rounded-lg bg-[#ef4444] px-3 py-1.5 text-[11.5px] font-bold text-white shadow-md shadow-[#ef4444]/30 hover:bg-[#dc2626] transition-all hover:scale-105"
          title="Send Immediate Distress / Hazard Alert to Mission Admin"
        >
          <span>🚨</span>
          <span className="font-extrabold tracking-wide">ALERT ADMIN</span>
        </button>

        {onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="hidden sm:flex items-center gap-1 rounded-lg border border-[#55d6e8]/40 bg-[#55d6e8]/10 px-2.5 py-1 text-[11px] font-bold text-[#55d6e8] hover:bg-[#55d6e8]/20 transition-colors"
            title="Open Administrator Console"
          >
            <span>Admin Hub →</span>
          </button>
        )}

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
