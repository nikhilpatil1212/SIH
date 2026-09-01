import { useState, useRef, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Map as MapIcon,
  Navigation,
  Route as RouteIcon,
  Settings as SettingsIcon,
  Snowflake,
  Thermometer,
  Triangle,
  User as UserIcon,
  Shield,
  Info,
} from "lucide-react";

import { systemMeta } from "../data/mock";
import { StatusDot, cx } from "./ui/primitives";
import type { User } from "../data/auth";

export type PageId =
  | "dashboard"
  | "map"
  | "routes"
  | "iceberg"
  | "seaice"
  | "environmental"
  | "hazards"
  | "rerouting"
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
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: (p: PageId) => void;
  key?: React.Key;
}) {
  return (
    <button
      onClick={() => onNavigate(item.id)}
      title={collapsed ? item.label : undefined}
      className={cx(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-all text-left w-full cursor-pointer",
        collapsed ? "justify-center px-2 py-2.5" : "",
        active
          ? "bg-[#132f40] text-[#eaf6f8] light:bg-[#e8decb] light:text-[#0d2433] font-semibold shadow-sm"
          : "text-[#91aeb9] hover:bg-[#0d2433] hover:text-[#eaf6f8] light:text-[#4a6878] light:hover:bg-[#ede5d6] light:hover:text-[#0d2433]",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#55d6e8] light:bg-[#0f768e]" />
      )}
      <item.icon
        size={17}
        strokeWidth={1.8}
        className={cx("shrink-0", active ? "text-[#55d6e8] light:text-[#0f768e]" : "")}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}

export function Sidebar({
  page,
  onNavigate,
  user,
  onSignOut,
}: {
  page: PageId;
  onNavigate: (p: PageId) => void;
  user?: User | null;
  onSignOut?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  // Derived user display
  const currentUser = user || {
    id: "usr-guest",
    name: "Dr. Aditi Verma",
    email: "aditi.verma@ncpor.res.in",
    role: "Navigator / Polar Scientist",
    organization: "NCPOR Expedition Logistics",
  };

  const userInitial = (currentUser.name || "U").charAt(0).toUpperCase();

  return (
    <aside
      className={cx(
        "relative flex shrink-0 flex-col border-r border-[#1d445c]/60 bg-[#071521] light:border-[#e2d8c7] light:bg-[#f5efe3] transition-all duration-300 select-none",
        collapsed ? "w-[68px]" : "w-[230px]",
      )}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#1d445c] bg-[#0c2333] text-[#55d6e8] shadow-md hover:scale-110 light:border-[#d8d0c2] light:bg-white light:text-[#0f768e] transition-transform cursor-pointer"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        )}
      </button>

      {/* Brand Header */}
      <div className={cx("flex items-center gap-2.5 border-b border-[#1d445c]/60 light:border-[#e2d8c7] py-3.5", collapsed ? "justify-center px-2" : "px-4")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#55d6e8]/40 bg-[#55d6e8]/10 light:border-[#0f768e]/40 light:bg-[#0f768e]/10">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path className="text-[#55d6e8] light:text-[#0f768e]" d="M12 3 L20 20 L12 15 L4 20 Z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="leading-tight overflow-hidden">
            <div className="text-[15px] font-bold tracking-[0.04em] text-[#eaf6f8] light:text-[#0d2433] truncate">
              Dhruv Sarthi
            </div>
            <div className="text-[9px] font-semibold tracking-[0.14em] uppercase text-[#55d6e8] light:text-[#0f768e] truncate">
              Antarctic AI Nav
            </div>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {OPERATIONS.map((item) => (
          <NavButton key={item.id} item={item} active={page === item.id} collapsed={collapsed} onNavigate={onNavigate} />
        ))}

        {!collapsed && (
          <div className="px-3 pb-1 pt-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#5f7d89] light:text-[#7a94a2]">
            Support
          </div>
        )}
        {SUPPORT.map((item) => (
          <NavButton key={item.id} item={item} active={page === item.id} collapsed={collapsed} onNavigate={onNavigate} />
        ))}

        <div className="my-1.5 h-px bg-[#1d445c]/50 light:bg-[#e2d8c7]" />
        {SYSTEM.map((item) => (
          <NavButton key={item.id} item={item} active={page === item.id} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* User Profile Section in Sidebar (Requirement 11) */}
      <div className="relative border-t border-[#1d445c]/60 light:border-[#e2d8c7] p-2" ref={profileMenuRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={cx(
            "flex w-full items-center gap-2.5 rounded-lg p-2 transition-colors cursor-pointer text-left",
            showProfileMenu
              ? "bg-[#132f40] light:bg-[#e8decb]"
              : "hover:bg-[#0d2433] light:hover:bg-[#ede5d6]",
            collapsed ? "justify-center px-1" : "",
          )}
          title={collapsed ? `${currentUser.name} (${currentUser.role || "User"})` : undefined}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#55d6e8] to-[#0284c7] font-mono text-[13px] font-bold text-[#071521] shadow-sm">
            {userInitial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12px] font-bold text-[#eaf6f8] light:text-[#0d2433]">
                {currentUser.name}
              </div>
              <div className="truncate text-[10px] text-[#91aeb9] light:text-[#5a7686]">
                {currentUser.role || (currentUser as any).organization || "Polar Navigator"}
              </div>
            </div>
          )}
        </button>

        {/* Profile Popover / Dropdown Menu */}
        {showProfileMenu && (
          <div
            className={cx(
              "absolute bottom-16 z-50 rounded-xl border border-[#1d445c] bg-[#0c2333] p-1.5 shadow-2xl backdrop-blur-md light:border-[#dfd8cc] light:bg-white",
              collapsed ? "left-14 w-52" : "left-2 right-2",
            )}
          >
            <div className="border-b border-[#1d445c]/40 px-3 py-2 light:border-[#dfd8cc]/60">
              <div className="text-[12px] font-bold text-[#eaf6f8] light:text-[#0d2433]">{currentUser.name}</div>
              <div className="truncate text-[10px] text-[#91aeb9] light:text-[#5a7686]">{currentUser.email}</div>
              {(currentUser as any).organization && (
                <div className="mt-0.5 text-[9.5px] font-semibold text-[#55d6e8] light:text-[#0f768e]">{(currentUser as any).organization}</div>
              )}
            </div>

            <div className="flex flex-col gap-0.5 pt-1 text-[11.5px]">
              <button
                onClick={() => {
                  setShowAccountModal(true);
                  setShowProfileMenu(false);
                }}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8] light:text-[#4a6878] light:hover:bg-[#f3ede1] light:hover:text-[#0d2433]"
              >
                <UserIcon size={14} /> Profile & Details
              </button>
              <button
                onClick={() => {
                  setShowAccountModal(true);
                  setShowProfileMenu(false);
                }}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8] light:text-[#4a6878] light:hover:bg-[#f3ede1] light:hover:text-[#0d2433]"
              >
                <Info size={14} /> Account Information
              </button>
              <button
                onClick={() => {
                  onNavigate("settings");
                  setShowProfileMenu(false);
                }}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8] light:text-[#4a6878] light:hover:bg-[#f3ede1] light:hover:text-[#0d2433]"
              >
                <SettingsIcon size={14} /> Settings
              </button>
              {onSignOut && (
                <>
                  <div className="my-1 h-px bg-[#1d445c]/40 light:bg-[#dfd8cc]/60" />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSignOut();
                    }}
                    className="flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-[#ef4444] hover:bg-[#ef4444]/15"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Account Info Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[#1d445c] bg-[#071521] p-6 text-[#eaf6f8] shadow-2xl light:border-[#dfd8cc] light:bg-white light:text-[#0d2433]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#55d6e8] to-[#0284c7] text-[18px] font-bold text-[#071521]">
                {userInitial}
              </div>
              <div>
                <h3 className="text-[16px] font-bold">{currentUser.name}</h3>
                <p className="text-[11px] text-[#55d6e8] light:text-[#0f768e] font-semibold">{currentUser.role || "Scientist / Navigator"}</p>
              </div>
            </div>
            <div className="space-y-2.5 rounded-lg border border-[#1d445c]/60 bg-[#0d2433] p-3 text-[11.5px] font-mono light:border-[#dfd8cc] light:bg-[#f8f5ee]">
              <div>
                <span className="text-[#91aeb9] light:text-[#6a8494] block text-[10px] uppercase">Email:</span>
                <span>{currentUser.email}</span>
              </div>
              <div>
                <span className="text-[#91aeb9] light:text-[#6a8494] block text-[10px] uppercase">Organization:</span>
                <span>{currentUser.organization || "National Centre for Polar and Ocean Research"}</span>
              </div>
              <div>
                <span className="text-[#91aeb9] light:text-[#6a8494] block text-[10px] uppercase">Authentication Protocol:</span>
                <span>JWT Bearer (SARATHI Mission Control)</span>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowAccountModal(false)}
                className="rounded-lg bg-[#55d6e8] px-4 py-2 text-[12px] font-bold text-[#071521] shadow hover:bg-[#7be3f2] light:bg-[#0f768e] light:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

