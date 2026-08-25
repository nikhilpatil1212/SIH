import {
  Activity,
  AlertTriangle,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Map as MapIcon,
  Navigation,
  Route as RouteIcon,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Snowflake,
  Thermometer,
  Triangle,
} from "lucide-react";
import { systemMeta } from "../data/mock";
import { StatusDot, cx } from "./ui/primitives";

export type PageId =
  | "dashboard"
  | "map"
  | "routes"
  | "iceberg"
  | "seaice"
  | "environmental"
  | "hazards"
  | "rerouting"
  | "whatif"
  | "reports"
  | "help"
  | "contact"
  | "settings";

type NavItem = { id: PageId; label: string; icon: typeof LayoutDashboard };

const OPERATIONS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "map", label: "Map View", icon: MapIcon },
  { id: "routes", label: "Route Planning", icon: RouteIcon },
  { id: "iceberg", label: "Iceberg Prediction", icon: Triangle },
  { id: "seaice", label: "Sea-Ice Prediction", icon: Snowflake },
  { id: "environmental", label: "Environmental Data", icon: Thermometer },
  { id: "hazards", label: "Hazards", icon: AlertTriangle },
  { id: "rerouting", label: "Re-Routing", icon: Navigation },
  { id: "whatif", label: "What-If Analysis", icon: SlidersHorizontal },
  { id: "reports", label: "Reports", icon: FileText },
];

const SUPPORT: NavItem[] = [
  { id: "help", label: "Help & Support", icon: LifeBuoy },
  { id: "contact", label: "Contact Us", icon: Mail },
];

const SYSTEM: NavItem[] = [{ id: "settings", label: "Settings", icon: SettingsIcon }];

function NavButton({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: (p: PageId) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(item.id)}
      className={cx(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors text-left w-full",
        active
          ? "bg-[#132f40] text-[#eaf6f8] light:bg-[#e8decb] light:text-[#0d2433] font-semibold"
          : "text-[#91aeb9] hover:bg-[#0d2433] hover:text-[#eaf6f8] light:text-[#4a6878] light:hover:bg-[#ede5d6] light:hover:text-[#0d2433]",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#55d6e8] light:bg-[#0f768e]" />
      )}
      <item.icon
        size={16}
        strokeWidth={1.8}
        className={active ? "text-[#55d6e8] light:text-[#0f768e]" : ""}
      />
      <span>{item.label}</span>
    </button>
  );
}

export function Sidebar({ page, onNavigate }: { page: PageId; onNavigate: (p: PageId) => void }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[#1d445c]/60 bg-[#071521] light:border-[#e2d8c7] light:bg-[#f5efe3] transition-colors">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-[#1d445c]/60 light:border-[#e2d8c7] px-4 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#55d6e8]/40 bg-[#55d6e8]/10 light:border-[#0f768e]/40 light:bg-[#0f768e]/10">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path className="text-[#55d6e8] light:text-[#0f768e]" d="M12 3 L20 20 L12 15 L4 20 Z" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-[0.04em] text-[#eaf6f8] light:text-[#0d2433]">
            ध्रुव सारथी
          </div>
          <div className="text-[9px] font-semibold tracking-[0.14em] uppercase text-[#55d6e8] light:text-[#0f768e]">
            Antarctic AI Nav
          </div>
        </div>
      </div>

      {/* Nav list */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
        {OPERATIONS.map((item) => (
          <NavButton key={item.id} item={item} active={page === item.id} onNavigate={onNavigate} />
        ))}

        <div className="px-3 pb-1 pt-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#5f7d89] light:text-[#7a94a2]">
          Support
        </div>
        {SUPPORT.map((item) => (
          <NavButton key={item.id} item={item} active={page === item.id} onNavigate={onNavigate} />
        ))}

        <div className="my-2 h-px bg-[#1d445c]/50 light:bg-[#e2d8c7]" />
        {SYSTEM.map((item) => (
          <NavButton key={item.id} item={item} active={page === item.id} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* System status */}
      <div className="border-t border-[#1d445c]/60 light:border-[#e2d8c7] px-4 py-3.5">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#91aeb9] light:text-[#4a6878]">
          <Activity size={12} /> System Status
        </div>
        <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[#10b981]">
          <StatusDot color="#10b981" pulse /> Live Telemetry
        </div>
        <div className="text-[10px] uppercase tracking-wide text-[#91aeb9] light:text-[#6a8494]">Last Updated</div>
        <div className="font-mono text-[11px] text-[#c8dde3] light:text-[#0d2433]">{systemMeta.lastUpdated}</div>
      </div>
    </aside>
  );
}
