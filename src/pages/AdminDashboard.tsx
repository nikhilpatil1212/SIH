import { useState, useEffect, useCallback, useMemo } from "react";
import {
  User as UserIcon,
  Ship,
  ShieldAlert,
  MessageSquare,
  Snowflake,
  Sun,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  X,
  Shield,
  Clock,
  MapPin,
  Compass,
} from "lucide-react";
import apiClient from "../api/client";
import type {
  AdminStats,
  UserItem,
  TravelItem,
  FeedbackItem,
  HelpAlertItem,
  IcebergTableItem,
  WeatherTableItem,
} from "../data/types";
import type { User } from "../data/auth";
import { ThemeToggle, useTheme } from "../theme";
import { SeaIceTable } from "../components/seaice/SeaIceTable";
import { DataSourcesPanel } from "../components/DataSourcesPanel";
import { useRealtime } from "../hooks/useRealtime";


type AdminTab = "overview" | "users" | "travel" | "alerts" | "feedback" | "icebergs" | "weather" | "seaice";

function formatUtc(isoStr?: string): string {
  if (!isoStr) return "N/A";
  try {
    const d = new Date(isoStr);
    return `${d.getUTCDate()} ${d.toLocaleString("en-US", { month: "short" })} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
  } catch {
    return isoStr;
  }
}

export function AdminDashboard({
  user,
  onSignOut,
  onOpenConsole,
}: {
  user: User;
  onSignOut: () => void;
  onOpenConsole?: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [tab, setTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Management State
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [travelList, setTravelList] = useState<TravelItem[]>([]);
  const [alertsList, setAlertsList] = useState<HelpAlertItem[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [icebergList, setIcebergList] = useState<IcebergTableItem[]>([]);
  const [weatherList, setWeatherList] = useState<WeatherTableItem[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Modal Dialogs state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TravelItem | null>(null);
  const [showAddIcebergModal, setShowAddIcebergModal] = useState(false);
  const [showAddWeatherModal, setShowAddWeatherModal] = useState(false);

  // Fetch verified stats from backend
  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const s = await apiClient.admin.getStats();
      setStats(s);
    } catch (e) {
      console.warn("Failed to fetch admin stats:", e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch individual table data on tab change
  const loadTabContent = useCallback(async () => {
    try {
      if (tab === "overview" || tab === "users") {
        const u = await apiClient.admin.getUsers();
        setUsersList(u);
      }
      if (tab === "overview" || tab === "travel") {
        const t = await apiClient.travel.getRecords();
        setTravelList(t);
      }
      if (tab === "overview" || tab === "alerts") {
        const a = await apiClient.alerts.getAlerts();
        setAlertsList(a);
      }
      if (tab === "overview" || tab === "feedback") {
        const f = await apiClient.feedback.getList();
        setFeedbackList(f);
      }
      if (tab === "overview" || tab === "icebergs") {
        const ib = await apiClient.adminIcebergs.getList();
        setIcebergList(ib);
      }
      if (tab === "overview" || tab === "weather") {
        const wx = await apiClient.adminWeather.getList();
        setWeatherList(wx);
      }
    } catch (e) {
      console.warn("Failed to load tab content:", e);
    }
  }, [tab]);

  useEffect(() => {
    loadStats();
    loadTabContent();
  }, [loadStats, loadTabContent]);

  // Hook into real-time WebSocket events
  const { isConnected } = useRealtime((event) => {
    if (event.type === "ALERT_CREATED" || event.type === "ALERT_UPDATED") {
      loadStats();
      apiClient.alerts.getAlerts().then(setAlertsList);
    }
    if (event.type === "TRAVEL_UPDATED") {
      loadStats();
      apiClient.travel.getRecords().then(setTravelList);
    }
  });

  // Action handlers
  const handleAcknowledgeAlert = async (id: string) => {
    await apiClient.alerts.updateStatus(id, "ACKNOWLEDGED");
    apiClient.alerts.getAlerts().then(setAlertsList);
    loadStats();
  };

  const handleResolveAlert = async (id: string) => {
    await apiClient.alerts.updateStatus(id, "RESOLVED");
    apiClient.alerts.getAlerts().then(setAlertsList);
    loadStats();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm(`Are you sure you want to delete user ${id}?`)) return;
    try {
      await apiClient.admin.deleteUser(id);
      setUsersList((prev) => prev.filter((u) => u.id !== id));
      loadStats();
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm(`Delete travel record ${id}?`)) return;
    await apiClient.travel.deleteRecord(id);
    setTravelList((prev) => prev.filter((t) => t.id !== id));
    loadStats();
  };

  const handleReviewFeedback = async (id: string) => {
    await apiClient.feedback.updateStatus(id, "REVIEWED");
    apiClient.feedback.getList().then(setFeedbackList);
    loadStats();
  };

  const handleDeleteFeedback = async (id: string) => {
    await apiClient.feedback.delete(id);
    setFeedbackList((prev) => prev.filter((f) => f.id !== id));
    loadStats();
  };

  const handleDeleteIceberg = async (id: string) => {
    await apiClient.adminIcebergs.delete(id);
    setIcebergList((prev) => prev.filter((i) => i.id !== id));
    loadStats();
  };

  const handleDeleteWeather = async (id: string) => {
    await apiClient.adminWeather.delete(id);
    setWeatherList((prev) => prev.filter((w) => w.id !== id));
    loadStats();
  };

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden transition-colors duration-300 ${
      isDark ? "bg-[#071521] text-[#eaf6f8]" : "bg-[#faf8f5] text-[#0d2433]"
    }`}>
      {/* Top Header */}
      <header className={`flex h-16 shrink-0 items-center justify-between border-b px-6 backdrop-blur z-20 ${
        isDark ? "border-[#1d445c] bg-[#071521]/90" : "border-[#dfd8cc] bg-white/90"
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#55d6e8]/20 text-[#55d6e8] border border-[#55d6e8]/40">
            <Shield size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold tracking-tight">Dhruv Sarthi · Mission Administration</span>
              <span className="rounded bg-[#ef4444]/20 border border-[#ef4444]/40 px-1.5 py-0.2 text-[9px] font-bold uppercase text-[#ef4444]">
                FLEET ROOT
              </span>
            </div>
            <div className={`text-[11px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
              Logged in as <span className="font-semibold">{user.name}</span> ({user.organization || "NCPOR"})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live WS connection tag */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono border-[#1d445c] bg-[#0d2433]">
            <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-[#10b981] animate-pulse" : "bg-[#ef4444]"}`} />
            <span className={isConnected ? "text-[#10b981]" : "text-[#ef4444]"}>
              {isConnected ? "WS Realtime Live" : "WS Reconnecting..."}
            </span>
          </div>

          {onOpenConsole && (
            <button
              onClick={onOpenConsole}
              className="flex items-center gap-1.5 rounded-lg bg-[#55d6e8] px-3 py-1.5 text-[12px] font-bold text-[#071521] shadow hover:bg-[#7be3f2]"
            >
              <span>User Console</span>
              <Compass size={13} />
            </button>
          )}

          <ThemeToggle variant="icon" />

          <button
            onClick={onSignOut}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              isDark ? "border-[#1d445c] hover:bg-[#132f40]" : "border-[#dfd8cc] hover:bg-[#f2ede4]"
            }`}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <nav className={`flex shrink-0 gap-1 overflow-x-auto border-b px-6 py-2 ${
        isDark ? "border-[#1d445c] bg-[#091b29]" : "border-[#dfd8cc] bg-[#f5efe4]"
      }`}>
        {[
          { id: "overview", label: "System Overview", icon: Layers },
          { id: "users", label: `User Management (${usersList.length || stats?.total_users || 0})`, icon: UserIcon },
          { id: "travel", label: `Ships & Voyages (${travelList.length || stats?.total_trips || 0})`, icon: Ship },
          { id: "alerts", label: `Help Alerts (${stats?.open_help_alerts ?? alertsList.length})`, icon: ShieldAlert, badge: stats?.open_help_alerts },
          { id: "seaice", label: "Sea-Ice Table (15 Sectors)", icon: Snowflake },
          { id: "icebergs", label: `Iceberg Records (${icebergList.length || stats?.iceberg_records || 0})`, icon: Compass },
          { id: "weather", label: `Weather Updates (${weatherList.length || 4})`, icon: Sun },
          { id: "feedback", label: `Feedback (${stats?.pending_feedback ?? feedbackList.length})`, icon: MessageSquare, badge: stats?.pending_feedback },
        ].map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id as AdminTab);
                setSearch("");
              }}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? isDark
                    ? "bg-[#55d6e8] text-[#071521] shadow-md shadow-[#55d6e8]/20"
                    : "bg-[#0d2433] text-white"
                  : isDark
                    ? "text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8]"
                    : "text-[#5a7686] hover:bg-[#eae2d5] hover:text-[#0d2433]"
              }`}
            >
              <t.icon size={14} />
              <span>{t.label}</span>
              {t.badge != null && t.badge > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? "bg-[#071521] text-[#55d6e8]" : "bg-[#ef4444] text-white"
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* ===================== TAB: OVERVIEW ===================== */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight">Fleet Operations Overview</h1>
              <p className={`text-[13px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
                Real-time operational telemetry, verified database counts, and live satellite ingestion status.
              </p>
            </div>

            {/* Overview Metric Cards (Strictly from Backend Database) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Users", value: stats?.total_users ?? 0, icon: UserIcon, tag: "REGISTERED", color: "text-[#55d6e8]" },
                { label: "Active Users", value: stats?.active_users ?? 0, icon: UserIcon, tag: "ONLINE", color: "text-[#10b981]" },
                { label: "Total Ships/Trips", value: stats?.total_trips ?? 0, icon: Ship, tag: "FLEET", color: "text-[#38bdf8]" },
                { label: "Active In-Transit Trips", value: stats?.active_trips ?? 0, icon: Ship, tag: "UNDERWAY", color: "text-[#f59e0b]" },
                { label: "Pending Feedback", value: stats?.pending_feedback ?? 0, icon: MessageSquare, tag: "UNREVIEWED", color: "text-[#a855f7]" },
                { label: "Open Help Alerts", value: stats?.open_help_alerts ?? 0, icon: ShieldAlert, tag: "DISTRESS", color: "text-[#ef4444]" },
                { label: "Iceberg Records", value: stats?.iceberg_records ?? 0, icon: Compass, tag: "TRACKED", color: "text-[#55d6e8]" },
                { label: "Latest Weather Update", value: formatUtc(stats?.latest_weather_update), icon: Sun, tag: "ECMWF", isTime: true },
              ].map((c) => (
                <div
                  key={c.label}
                  className={`rounded-xl border p-5 shadow-sm transition-all ${
                    isDark ? "border-[#1d445c] bg-[#0d2433]/70" : "border-[#dfd8cc] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#55d6e8]/10 text-[#55d6e8]">
                      <c.icon size={18} />
                    </div>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider rounded bg-[#55d6e8]/15 px-1.5 py-0.5 text-[#55d6e8]">
                      {c.tag}
                    </span>
                  </div>
                  <div className={`font-mono ${c.isTime ? "text-[14px]" : "text-[26px]"} font-bold ${c.color || ""}`}>
                    {c.value}
                  </div>
                  <div className={`mt-1 text-[12px] font-medium ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
                    {c.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Data Governance & Open Source Provenance Panel */}
            <div className="pt-2">
              <DataSourcesPanel />
            </div>

            {/* Quick Access Sea-Ice Overview */}
            <div className="pt-2">
              <SeaIceTable />
            </div>
          </div>
        )}


        {/* ===================== TAB: USER MANAGEMENT ===================== */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight">User Management</h2>
                <p className={`text-[12px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
                  Full CRUD access control, password modification, and role assignment.
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#55d6e8] px-3.5 py-2 text-[12px] font-bold text-[#071521] shadow hover:bg-[#7be3f2]"
              >
                <Plus size={14} /> Add User
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={14} className="absolute left-3 top-2.5 text-[#5f7d89]" />
                <input
                  type="text"
                  placeholder="Search user by name, email, or phone..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className={`w-full rounded-lg border pl-9 pr-3 py-1.5 text-[13px] outline-none ${
                    isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
                  }`}
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-[#1d445c]/50">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead className={`border-b font-semibold text-[11px] uppercase tracking-wider ${
                  isDark ? "bg-[#0c1f2e] text-[#91aeb9] border-[#1d445c]" : "bg-[#f2ede4] text-[#4a6878] border-[#dfd8cc]"
                }`}>
                  <tr>
                    <th className="py-3 px-3">User ID</th>
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Created At</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d445c]/30 font-mono">
                  {usersList
                    .filter((u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
                    .map((u) => (
                      <tr key={u.id} className={isDark ? "hover:bg-[#0f2a3d]" : "hover:bg-[#f6f2ea]"}>
                        <td className="py-2.5 px-3 font-bold text-[#55d6e8]">{u.id}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-[#eaf6f8] light:text-[#0d2433]">{u.name}</td>
                        <td className="py-2.5 px-3 text-[#91aeb9]">{u.email}</td>
                        <td className="py-2.5 px-3 text-[#91aeb9]">{u.phone || "N/A"}</td>
                        <td className="py-2.5 px-3">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            u.role === "ADMIN" ? "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40" : "bg-[#55d6e8]/20 text-[#55d6e8]"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            u.status === "ACTIVE" ? "bg-[#10b981]/20 text-[#10b981]" : "bg-[#ef4444]/20 text-[#ef4444]"
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-[#5f7d89]">{formatUtc(u.created_at)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="rounded px-2 py-0.5 text-[11px] font-semibold border border-[#55d6e8]/40 text-[#55d6e8] hover:bg-[#55d6e8]/15"
                              title="Edit User"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="rounded px-2 py-0.5 text-[11px] font-semibold border border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/15"
                              title="Delete User"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB: SHIPS & TRAVEL ===================== */}
        {tab === "travel" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight">Ships & Voyage Travel Information</h2>
                <p className={`text-[12px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
                  Real coordinates, live status, departure locations, and passage timeline.
                </p>
              </div>
              <button
                onClick={() => setShowAddTripModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#55d6e8] px-3.5 py-2 text-[12px] font-bold text-[#071521] shadow hover:bg-[#7be3f2]"
              >
                <Plus size={14} /> Add Voyage
              </button>
            </div>

            {/* Travel Table */}
            <div className="overflow-x-auto rounded-xl border border-[#1d445c]/50">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead className={`border-b font-semibold text-[11px] uppercase tracking-wider ${
                  isDark ? "bg-[#0c1f2e] text-[#91aeb9] border-[#1d445c]" : "bg-[#f2ede4] text-[#4a6878] border-[#dfd8cc]"
                }`}>
                  <tr>
                    <th className="py-3 px-3">Travel ID</th>
                    <th className="py-3 px-3">Ship Name</th>
                    <th className="py-3 px-3">Navigator</th>
                    <th className="py-3 px-3">Departure</th>
                    <th className="py-3 px-3">ETA</th>
                    <th className="py-3 px-3">Required Time</th>
                    <th className="py-3 px-3">Destination</th>
                    <th className="py-3 px-3">Coordinates (Lat / Lon)</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d445c]/30 font-mono">
                  {travelList.map((t) => (
                    <tr key={t.id} className={isDark ? "hover:bg-[#0f2a3d]" : "hover:bg-[#f6f2ea]"}>
                      <td className="py-2.5 px-3 font-bold text-[#55d6e8]">{t.travel_id}</td>
                      <td className="py-2.5 px-3 font-sans font-bold text-[#eaf6f8] light:text-[#0d2433]">{t.ship_name}</td>
                      <td className="py-2.5 px-3 font-sans text-[#91aeb9]">{t.user_name || "NCPOR Officer"}</td>
                      <td className="py-2.5 px-3 text-[11px] text-[#91aeb9]">{formatUtc(t.departure_time)}</td>
                      <td className="py-2.5 px-3 text-[11px] text-[#55d6e8]">{formatUtc(t.estimated_arrival_time)}</td>
                      <td className="py-2.5 px-3 text-[#cbe5ee]">{t.required_time || "170h"}</td>
                      <td className="py-2.5 px-3 font-sans text-[#eaf6f8] light:text-[#0d2433]">{t.destination}</td>
                      <td className="py-2.5 px-3 font-bold text-[#38bdf8]">
                        {Math.abs(t.latitude).toFixed(2)}°{t.latitude < 0 ? "S" : "N"}, {Math.abs(t.longitude).toFixed(2)}°{t.longitude < 0 ? "W" : "E"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          t.status === "IN_TRANSIT" ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40" : "bg-[#f59e0b]/20 text-[#f59e0b]"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDeleteTrip(t.id)}
                            className="rounded px-2 py-0.5 text-[11px] font-semibold border border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/15"
                            title="Delete Record"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB: EMERGENCY HELP ALERTS ===================== */}
        {tab === "alerts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-[#ef4444] flex items-center gap-2">
                  <ShieldAlert size={22} />
                  Emergency Help Alert Register (Real-Time Live)
                </h2>
                <p className={`text-[12px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
                  Incoming user distress reports, severe pack ice compression alerts, and iceberg collision threats.
                </p>
              </div>
            </div>

            {/* Alerts Table */}
            <div className="overflow-x-auto rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/5 p-2">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead className={`border-b font-semibold text-[11px] uppercase tracking-wider ${
                  isDark ? "bg-[#1f1015] text-[#ef4444] border-[#ef4444]/30" : "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]"
                }`}>
                  <tr>
                    <th className="py-3 px-3">Alert ID</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Navigator</th>
                    <th className="py-3 px-3">Coordinates</th>
                    <th className="py-3 px-3">Distress Message</th>
                    <th className="py-3 px-3">Received Time</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ef4444]/20 font-mono">
                  {alertsList.map((a) => (
                    <tr key={a.id} className={a.status === "OPEN" ? "bg-[#ef4444]/10" : ""}>
                      <td className="py-3 px-3 font-bold text-[#ef4444]">{a.id}</td>
                      <td className="py-3 px-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          a.severity === "CRITICAL"
                            ? "bg-[#ef4444] text-white animate-pulse"
                            : a.severity === "HIGH"
                              ? "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40"
                              : "bg-[#38bdf8]/20 text-[#38bdf8]"
                        }`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans font-semibold text-[#eaf6f8] light:text-[#0d2433]">{a.user_name}</td>
                      <td className="py-3 px-3 font-bold text-[#55d6e8]">
                        {Math.abs(a.latitude).toFixed(2)}°{a.latitude < 0 ? "S" : "N"}, {Math.abs(a.longitude).toFixed(2)}°{a.longitude < 0 ? "W" : "E"}
                      </td>
                      <td className="py-3 px-3 font-sans max-w-xs text-[12px] text-[#eaf6f8] light:text-[#0d2433] leading-relaxed">
                        {a.message}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#5f7d89]">{formatUtc(a.created_at)}</td>
                      <td className="py-3 px-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          a.status === "OPEN"
                            ? "bg-[#ef4444] text-white"
                            : a.status === "ACKNOWLEDGED"
                              ? "bg-[#f59e0b] text-black"
                              : "bg-[#10b981] text-white"
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {a.status === "OPEN" && (
                            <button
                              onClick={() => handleAcknowledgeAlert(a.id)}
                              className="rounded bg-[#f59e0b] px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#fbbf24]"
                            >
                              Acknowledge
                            </button>
                          )}
                          {a.status !== "RESOLVED" && (
                            <button
                              onClick={() => handleResolveAlert(a.id)}
                              className="rounded bg-[#10b981] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#059669]"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB: SEA-ICE CONCENTRATION TABLE ===================== */}
        {tab === "seaice" && (
          <div className="space-y-4">
            <SeaIceTable />
          </div>
        )}

        {/* ===================== TAB: ICEBERG MANAGEMENT ===================== */}
        {tab === "icebergs" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight">Antarctic Iceberg Database Records</h2>
                <p className={`text-[12px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
                  Tabular iceberg tracking database (size, movement vector, risk level).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1d445c]/50">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead className={`border-b font-semibold text-[11px] uppercase tracking-wider ${
                  isDark ? "bg-[#0c1f2e] text-[#91aeb9] border-[#1d445c]" : "bg-[#f2ede4] text-[#4a6878] border-[#dfd8cc]"
                }`}>
                  <tr>
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">Name / Identifier</th>
                    <th className="py-3 px-3">Latitude</th>
                    <th className="py-3 px-3">Longitude</th>
                    <th className="py-3 px-3">Size (km²)</th>
                    <th className="py-3 px-3">Movement</th>
                    <th className="py-3 px-3">Risk Level</th>
                    <th className="py-3 px-3">Confidence</th>
                    <th className="py-3 px-3">Last Updated</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d445c]/30 font-mono">
                  {icebergList.map((ib) => (
                    <tr key={ib.id} className={isDark ? "hover:bg-[#0f2a3d]" : "hover:bg-[#f6f2ea]"}>
                      <td className="py-2.5 px-3 font-bold text-[#55d6e8]">{ib.id}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-[#eaf6f8] light:text-[#0d2433]">{ib.name}</td>
                      <td className="py-2.5 px-3">{ib.latitude.toFixed(2)}°S</td>
                      <td className="py-2.5 px-3">{Math.abs(ib.longitude).toFixed(2)}°{ib.longitude < 0 ? "W" : "E"}</td>
                      <td className="py-2.5 px-3 font-bold text-[#38bdf8]">{ib.size_km} km²</td>
                      <td className="py-2.5 px-3">{ib.movement_speed_kn} kn @ {ib.movement_heading_deg}°</td>
                      <td className="py-2.5 px-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          ib.risk_level === "HIGH" ? "bg-[#ef4444]/20 text-[#ef4444]" : "bg-[#f59e0b]/20 text-[#f59e0b]"
                        }`}>
                          {ib.risk_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#10b981]">{ib.confidence}%</td>
                      <td className="py-2.5 px-3 text-[11px] text-[#5f7d89]">{formatUtc(ib.last_updated)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteIceberg(ib.id)}
                          className="rounded px-2 py-0.5 text-[11px] font-semibold border border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/15"
                          title="Delete Record"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB: WEATHER MANAGEMENT ===================== */}
        {tab === "weather" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight">Weather & Metocean Observations</h2>
                <p className={`text-[12px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
                  Active atmospheric and ocean surface telemetry from ERA5/ECMWF stations.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1d445c]/50">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead className={`border-b font-semibold text-[11px] uppercase tracking-wider ${
                  isDark ? "bg-[#0c1f2e] text-[#91aeb9] border-[#1d445c]" : "bg-[#f2ede4] text-[#4a6878] border-[#dfd8cc]"
                }`}>
                  <tr>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Temperature</th>
                    <th className="py-3 px-3">Wind Speed</th>
                    <th className="py-3 px-3">Wind Direction</th>
                    <th className="py-3 px-3">Visibility</th>
                    <th className="py-3 px-3">Pressure</th>
                    <th className="py-3 px-3">Conditions</th>
                    <th className="py-3 px-3">Observation Time</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d445c]/30 font-mono">
                  {weatherList.map((w) => (
                    <tr key={w.id} className={isDark ? "hover:bg-[#0f2a3d]" : "hover:bg-[#f6f2ea]"}>
                      <td className="py-2.5 px-3 font-sans font-bold text-[#eaf6f8] light:text-[#0d2433]">{w.location}</td>
                      <td className="py-2.5 px-3 font-bold text-[#38bdf8]">{w.temperature_c}°C</td>
                      <td className="py-2.5 px-3">{w.wind_speed_kn} kn</td>
                      <td className="py-2.5 px-3">{w.wind_direction_deg}°</td>
                      <td className="py-2.5 px-3">{w.visibility_km} km</td>
                      <td className="py-2.5 px-3">{w.pressure_hpa} hPa</td>
                      <td className="py-2.5 px-3 font-sans text-[#eaf6f8] light:text-[#0d2433]">{w.conditions}</td>
                      <td className="py-2.5 px-3 text-[11px] text-[#5f7d89]">{formatUtc(w.observation_time)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteWeather(w.id)}
                          className="rounded px-2 py-0.5 text-[11px] font-semibold border border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/15"
                          title="Delete Record"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB: FEEDBACK MANAGEMENT ===================== */}
        {tab === "feedback" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight">Navigator Feedback Management</h2>
                <p className={`text-[12px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
                  Feedback reviews, operational ratings, and feature requests.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1d445c]/50">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead className={`border-b font-semibold text-[11px] uppercase tracking-wider ${
                  isDark ? "bg-[#0c1f2e] text-[#91aeb9] border-[#1d445c]" : "bg-[#f2ede4] text-[#4a6878] border-[#dfd8cc]"
                }`}>
                  <tr>
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Rating</th>
                    <th className="py-3 px-3">Feedback</th>
                    <th className="py-3 px-3">Submitted At</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d445c]/30 font-mono">
                  {feedbackList.map((f) => (
                    <tr key={f.id} className={isDark ? "hover:bg-[#0f2a3d]" : "hover:bg-[#f6f2ea]"}>
                      <td className="py-3 px-3 font-bold text-[#55d6e8]">{f.id}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-[#eaf6f8] light:text-[#0d2433]">{f.user_name}</td>
                      <td className="py-3 px-3 text-[#f59e0b]">{"★".repeat(f.rating)}</td>
                      <td className="py-3 px-3 font-sans max-w-md text-[#eaf6f8] light:text-[#0d2433] leading-relaxed">
                        {f.feedback}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#5f7d89]">{formatUtc(f.submitted_at)}</td>
                      <td className="py-3 px-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          f.status === "REVIEWED" ? "bg-[#10b981]/20 text-[#10b981]" : "bg-[#f59e0b]/20 text-[#f59e0b]"
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {f.status === "PENDING" && (
                            <button
                              onClick={() => handleReviewFeedback(f.id)}
                              className="rounded bg-[#10b981] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#059669]"
                            >
                              Mark Reviewed
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFeedback(f.id)}
                            className="rounded px-2 py-0.5 text-[11px] font-semibold border border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/15"
                            title="Delete Feedback"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ===================== MODAL: ADD USER ===================== */}
      {showAddUserModal && (
        <AddUserModal
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => {
            setShowAddUserModal(false);
            apiClient.admin.getUsers().then(setUsersList);
            loadStats();
          }}
        />
      )}

      {/* ===================== MODAL: EDIT USER ===================== */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            apiClient.admin.getUsers().then(setUsersList);
          }}
        />
      )}

      {/* ===================== MODAL: ADD TRIP ===================== */}
      {showAddTripModal && (
        <AddTripModal
          onClose={() => setShowAddTripModal(false)}
          onSuccess={() => {
            setShowAddTripModal(false);
            apiClient.travel.getRecords().then(setTravelList);
            loadStats();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [status, setStatus] = useState("ACTIVE");
  const [org, setOrg] = useState("NCPOR / MoES");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await apiClient.admin.createUser({
        name,
        email,
        phone,
        password,
        role,
        status,
        organization: org,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-xl border p-6 shadow-2xl ${
        isDark ? "border-[#1d445c] bg-[#071521] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
      }`}>
        <div className="flex items-center justify-between border-b pb-3 mb-4 border-[#1d445c]/40">
          <h3 className="text-[17px] font-bold">Add New User</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Full Name</label>
            <input
              required
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Phone</label>
            <input
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Role</label>
              <select
                value={role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value)}
                className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                  isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
                }`}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Status</label>
              <select
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                  isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
                }`}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          {error && <p className="text-[12px] text-[#ef4444]">{error}</p>}
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-1.5 text-[12px]">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-[#55d6e8] px-4 py-1.5 text-[12px] font-bold text-[#071521]">
              {submitting ? "Saving..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSuccess }: { user: UserItem; onClose: () => void; onSuccess: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiClient.admin.updateUser(user.id, {
        name,
        email,
        phone,
        role,
        status,
        password: password ? password : undefined,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-xl border p-6 shadow-2xl ${
        isDark ? "border-[#1d445c] bg-[#071521] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
      }`}>
        <div className="flex items-center justify-between border-b pb-3 mb-4 border-[#1d445c]/40">
          <h3 className="text-[17px] font-bold">Edit User ({user.id})</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Full Name</label>
            <input
              required
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Role</label>
              <select
                value={role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value)}
                className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                  isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
                }`}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Status</label>
              <select
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                  isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
                }`}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">New Password (Leave blank to keep current)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-1.5 text-[12px]">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-[#55d6e8] px-4 py-1.5 text-[12px] font-bold text-[#071521]">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTripModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [shipName, setShipName] = useState("RV Bharati Explorer");
  const [travelId, setTravelId] = useState(`EXP-${Date.now().toString().slice(-4)}`);
  const [destination, setDestination] = useState("Bharati Station");
  const [lat, setLat] = useState(-69.4);
  const [lon, setLon] = useState(76.2);
  const [status, setStatus] = useState("IN_TRANSIT");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const now = new Date();
      const eta = new Date(now.getTime() + 7 * 86400000);
      await apiClient.travel.createRecord({
        ship_name: shipName,
        travel_id: travelId,
        destination,
        latitude: lat,
        longitude: lon,
        departure_time: now.toISOString(),
        estimated_arrival_time: eta.toISOString(),
        required_time: "168 hours",
        status,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to create voyage");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-xl border p-6 shadow-2xl ${
        isDark ? "border-[#1d445c] bg-[#071521] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
      }`}>
        <div className="flex items-center justify-between border-b pb-3 mb-4 border-[#1d445c]/40">
          <h3 className="text-[17px] font-bold">Add Voyage / Ship Journey</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Ship Name</label>
            <input
              required
              value={shipName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShipName(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Travel / Mission ID</label>
            <input
              required
              value={travelId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTravelId(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Destination</label>
            <input
              required
              value={destination}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDestination(e.target.value)}
              className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
              }`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Latitude</label>
              <input
                type="number"
                step="0.01"
                required
                value={lat}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLat(parseFloat(e.target.value) || 0)}
                className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                  isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
                }`}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#91aeb9] mb-1">Longitude</label>
              <input
                type="number"
                step="0.01"
                required
                value={lon}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLon(parseFloat(e.target.value) || 0)}
                className={`w-full rounded-lg border p-2 text-[13px] outline-none ${
                  isDark ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
                }`}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-1.5 text-[12px]">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-[#55d6e8] px-4 py-1.5 text-[12px] font-bold text-[#071521]">
              Add Voyage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
