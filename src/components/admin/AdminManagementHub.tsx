import { useState, useEffect, useCallback, useRef, type FormEvent, type ChangeEvent, type MouseEvent, type ReactNode } from "react";
import {
  Users, Ship, Snowflake, MessageSquare, Plus, Pencil, Trash2, Search,
  RefreshCw, X, Star, CheckCircle2, Clock, AlertTriangle, Shield, LogOut,
  ChevronDown, Eye,
} from "lucide-react";
import { ThemeToggle, useTheme } from "../../theme";
import { apiClient } from "../../api/client";
import type { User } from "../../data/auth";
import { useNav } from "../../state";

// ─── Shared Theme Helpers ────────────────────────────────────────────────────

function useDark() {
  const { theme } = useTheme();
  return theme === "dark";
}

const card = (d: boolean) =>
  d
    ? "border-[#1d445c]/70 bg-[#0d2433]/80 backdrop-blur"
    : "border-[#e2d8c7] bg-white shadow-sm";

const inputCls = (d: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-[13px] outline-none transition-colors ${
    d
      ? "border-[#1d445c] bg-[#071521] text-[#eaf6f8] placeholder:text-[#5f7d89] focus:border-[#55d6e8]"
      : "border-[#dfd8cc] bg-[#faf8f5] text-[#0d2433] placeholder:text-[#9db6c1] focus:border-[#0f768e]"
  }`;

const btnPrimary = (d: boolean) =>
  `rounded-lg px-4 py-2 text-[13px] font-bold transition-colors ${
    d ? "bg-[#55d6e8] text-[#071521] hover:bg-[#7be3f2]" : "bg-[#0d2433] text-[#faf8f5] hover:bg-[#16394f]"
  }`;

const btnDanger = "rounded-lg px-3 py-1.5 text-[12px] font-semibold bg-[#ef4444]/15 text-[#ef4444] hover:bg-[#ef4444]/25 transition-colors";

const btnGhost = (d: boolean) =>
  `rounded-lg px-3 py-1.5 text-[12px] font-semibold border transition-colors ${
    d ? "border-[#1d445c] text-[#91aeb9] hover:bg-[#132f40]" : "border-[#dfd8cc] text-[#4a6878] hover:bg-[#f2ece0]"
  }`;

// ─── Modal Wrapper ───────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const d = useDark();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${card(d)}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-[#1d445c]/30"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Tab Button ──────────────────────────────────────────────────────────────

type AdminTab = "users" | "missions" | "icebergs" | "feedback";

const TABS: { id: AdminTab; label: string; icon: typeof Users; count?: number }[] = [
  { id: "users", label: "User Management", icon: Users },
  { id: "missions", label: "Vessel Missions", icon: Ship },
  { id: "icebergs", label: "Iceberg Fleet", icon: Snowflake },
  { id: "feedback", label: "User Feedback", icon: MessageSquare },
];

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function AdminManagementHub({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const d = useDark();
  const [tab, setTab] = useState<AdminTab>("users");
  const [counts, setCounts] = useState<Record<AdminTab, number>>({ users: 0, missions: 0, icebergs: 0, feedback: 0 });

  const updateCounts = useCallback((t: AdminTab, n: number) => {
    setCounts((prev) => (prev[t] === n ? prev : { ...prev, [t]: n }));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiClient.getUsers().catch(() => []),
      apiClient.getMissions().catch(() => []),
      apiClient.getIcebergRegistry().catch(() => []),
      apiClient.getFeedback().catch(() => []),
    ]).then(([u, m, i, f]) => {
      if (active) {
        setCounts({
          users: Array.isArray(u) ? u.length : 0,
          missions: Array.isArray(m) ? m.length : 0,
          icebergs: Array.isArray(i) ? i.length : 0,
          feedback: Array.isArray(f) ? f.length : 0,
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const onUsersCount = useCallback((n: number) => updateCounts("users", n), [updateCounts]);
  const onMissionsCount = useCallback((n: number) => updateCounts("missions", n), [updateCounts]);
  const onIcebergsCount = useCallback((n: number) => updateCounts("icebergs", n), [updateCounts]);
  const onFeedbackCount = useCallback((n: number) => updateCounts("feedback", n), [updateCounts]);

  return (
    <div className={`flex h-full flex-col overflow-hidden transition-colors duration-300 ${d ? "bg-[#071521] text-[#eaf6f8]" : "bg-[#faf8f5] text-[#0d2433]"}`}>
      {/* Header */}
      <header className={`flex h-14 shrink-0 items-center justify-between border-b px-6 ${d ? "border-[#1d445c]/80 bg-[#0a1e2d]" : "border-[#e2d8c7] bg-[#f5efe3]"}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${d ? "bg-[#132f40] text-[#55d6e8]" : "bg-[#0d2433] text-[#55d6e8]"}`}>
            <Shield size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold">Dhruv Sarthi · Admin Management Hub</div>
            <div className={`text-[11px] ${d ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
              {user.name} · {user.organization}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle variant="icon" />
          <button onClick={onSignOut} className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${d ? "border-[#1d445c] text-[#91aeb9] hover:bg-[#132f40]" : "border-[#dfd8cc] text-[#4a6878] hover:bg-[#f2ece0]"}`}>
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className={`flex shrink-0 gap-1 border-b px-6 py-2 overflow-x-auto ${d ? "border-[#1d445c]/60 bg-[#0a1e2d]/50" : "border-[#e2d8c7] bg-[#f5efe3]/50"}`}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
                active
                  ? d
                    ? "bg-[#55d6e8]/15 text-[#55d6e8] border border-[#55d6e8]/30"
                    : "bg-[#0d2433]/10 text-[#0d2433] border border-[#0d2433]/20"
                  : d
                    ? "text-[#91aeb9] hover:bg-[#132f40] border border-transparent"
                    : "text-[#4a6878] hover:bg-[#f2ece0] border border-transparent"
              }`}
            >
              <t.icon size={15} />
              {t.label}
              {counts[t.id] > 0 && (
                <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${d ? "bg-[#55d6e8]/20 text-[#55d6e8]" : "bg-[#0d2433]/15 text-[#0d2433]"}`}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "users" && <UsersTable onCount={onUsersCount} />}
        {tab === "missions" && <MissionsTable onCount={onMissionsCount} />}
        {tab === "icebergs" && <IcebergRegistryTable onCount={onIcebergsCount} />}
        {tab === "feedback" && <FeedbackTable onCount={onFeedbackCount} />}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TABLE 1: USER MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UsersTable({ onCount }: { onCount?: (n: number) => void }) {
  const d = useDark();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "add" | "edit">("closed");
  const [editUser, setEditUser] = useState<any>(null);
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await apiClient.getUsers();
      setUsers(data);
      onCountRef.current?.(data.length);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const filtered = users.filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user permanently?")) return;
    await apiClient.deleteUser(id);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold">👥 Registered Users</h2>
          <p className={`text-[13px] ${d ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
            Manage platform users — add, edit roles, or remove accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f7d89]" />
            <input
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search users..."
              className={`pl-8 pr-3 py-2 rounded-lg text-[13px] w-56 ${inputCls(d)}`}
            />
          </div>
          <button onClick={load} className={btnGhost(d)} title="Refresh"><RefreshCw size={14} /></button>
          <button onClick={() => { setEditUser(null); setModalMode("add"); }} className={btnPrimary(d)}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Add User</span>
          </button>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${card(d)}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className={d ? "bg-[#0a1e2d]/80" : "bg-[#f5efe3]"}>
                {["Name", "Email", "Organization", "Role", "Actions"].map((h) => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5f7d89]">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5f7d89]">No users found.</td></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className={`border-t ${d ? "border-[#1d445c]/40 hover:bg-[#132f40]/50" : "border-[#e2d8c7]/60 hover:bg-[#f6f0e4]"} transition-colors`}>
                    <td className="px-4 py-3 font-semibold">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{u.email}</td>
                    <td className="px-4 py-3">{u.organization}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        u.role === "Admin"
                          ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                          : u.role === "Vessel Operator"
                            ? "bg-[#3b82f6]/15 text-[#3b82f6]"
                            : "bg-[#10b981]/15 text-[#10b981]"
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setEditUser(u); setModalMode("edit"); }} className={btnGhost(d)} title="Edit"><Pencil size={12} /></button>
                        <button onClick={() => handleDelete(u.id)} className={btnDanger} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        open={modalMode !== "closed"}
        mode={modalMode === "edit" ? "edit" : "add"}
        user={editUser}
        onClose={() => setModalMode("closed")}
        onSaved={load}
      />
    </div>
  );
}

function UserFormModal({ open, mode, user, onClose, onSaved }: { open: boolean; mode: "add" | "edit"; user: any; onClose: () => void; onSaved: () => void }) {
  const d = useDark();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("Researcher");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setOrg(user.organization || "");
      setRole(user.role || "Researcher");
      setPassword("");
    } else {
      setName(""); setEmail(""); setOrg(""); setRole("Researcher"); setPassword("");
    }
    setError("");
  }, [mode, user, open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (mode === "add") {
        const res = await apiClient.createUser({ name, email, password: password || "default123", organization: org, role });
        if (res.detail) { setError(res.detail); setSaving(false); return; }
      } else {
        const payload: any = { name, email, organization: org, role };
        if (password) payload.password = password;
        await apiClient.updateUser(user.id, payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save user.");
    }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "add" ? "Add New User" : `Edit User — ${user?.name}`}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className={`text-[11px] font-semibold ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>Full Name</span>
          <input value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} className={inputCls(d)} required />
        </label>
        <label className="block">
          <span className={`text-[11px] font-semibold ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>Email</span>
          <input type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} className={inputCls(d)} required />
        </label>
        <label className="block">
          <span className={`text-[11px] font-semibold ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>Organization</span>
          <input value={org} onChange={(e: ChangeEvent<HTMLInputElement>) => setOrg(e.target.value)} className={inputCls(d)} />
        </label>
        <label className="block">
          <span className={`text-[11px] font-semibold ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>Role</span>
          <select value={role} onChange={(e: ChangeEvent<HTMLSelectElement>) => setRole(e.target.value)} className={inputCls(d)}>
            <option value="Researcher">Researcher</option>
            <option value="Vessel Operator">Vessel Operator</option>
            <option value="Admin">Admin</option>
          </select>
        </label>
        <label className="block">
          <span className={`text-[11px] font-semibold ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>{mode === "add" ? "Password" : "New Password (leave blank to keep)"}</span>
          <input type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} className={inputCls(d)} {...(mode === "add" ? { required: true } : {})} />
        </label>
        {error && <p className="text-[12px] text-[#ef4444] font-medium">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost(d)}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary(d)}>
            {saving ? "Saving..." : mode === "add" ? "Create User" : "Update User"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TABLE 2: VESSEL & VOYAGE MISSION CONTROL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MissionsTable({ onCount }: { onCount?: (n: number) => void }) {
  const d = useDark();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "add" | "edit">("closed");
  const [editMission, setEditMission] = useState<any>(null);
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await apiClient.getMissions();
      setMissions(data);
      onCountRef.current?.(data.length);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this mission?")) return;
    await apiClient.deleteMission(id);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold">🚢 Expedition & Vessel Mission Control</h2>
          <p className={`text-[13px] ${d ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
            Track ship expeditions, polar ice class, ports, breakpoints, and voyage timing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className={btnGhost(d)} title="Refresh"><RefreshCw size={14} /></button>
          <button onClick={() => { setEditMission(null); setModalMode("add"); }} className={btnPrimary(d)}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Add Mission</span>
          </button>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${card(d)}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className={d ? "bg-[#0a1e2d]/80" : "bg-[#f5efe3]"}>
                {["Ship Name", "Ship No / IMO", "Ice Class", "Start Port", "End Port", "Breakpoints", "Departure", "Arrival", "Travel Time", "Actions"].map((h) => (
                  <th key={h} className={`px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-[#5f7d89]">Loading...</td></tr>
              ) : missions.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-[#5f7d89]">No missions found.</td></tr>
              ) : (
                missions.map((m) => (
                  <tr key={m.id} className={`border-t ${d ? "border-[#1d445c]/40 hover:bg-[#132f40]/50" : "border-[#e2d8c7]/60 hover:bg-[#f6f0e4]"} transition-colors`}>
                    <td className="px-3 py-3 font-semibold whitespace-nowrap">{m.ship_name}</td>
                    <td className="px-3 py-3 font-mono text-[12px]">{m.ship_number}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center rounded-full bg-[#3b82f6]/15 px-2 py-0.5 text-[10px] font-bold text-[#3b82f6]">{m.polar_ice_class}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{m.start_port}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{m.end_port}</td>
                    <td className="px-3 py-3 text-[12px]">{m.breakpoints_count ?? "—"}</td>
                    <td className="px-3 py-3 text-[12px] whitespace-nowrap">{m.departure_time || "—"}</td>
                    <td className="px-3 py-3 text-[12px] whitespace-nowrap">{m.expected_arrival || "—"}</td>
                    <td className="px-3 py-3 text-[12px] whitespace-nowrap">{m.travel_duration || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setEditMission(m); setModalMode("edit"); }} className={btnGhost(d)} title="Edit"><Pencil size={12} /></button>
                        <button onClick={() => handleDelete(m.id)} className={btnDanger} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MissionFormModal
        open={modalMode !== "closed"}
        mode={modalMode === "edit" ? "edit" : "add"}
        mission={editMission}
        onClose={() => setModalMode("closed")}
        onSaved={load}
      />
    </div>
  );
}

function MissionFormModal({ open, mode, mission, onClose, onSaved }: { open: boolean; mode: "add" | "edit"; mission: any; onClose: () => void; onSaved: () => void }) {
  const d = useDark();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && mission) {
      setForm({ ...mission });
    } else {
      setForm({
        ship_name: "", ship_number: "", polar_ice_class: "PC6",
        start_port: "", end_port: "", breakpoints_count: 0,
        departure_time: "", expected_arrival: "", travel_duration: "",
      });
    }
  }, [mode, mission, open]);

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (mode === "add") await apiClient.createMission(form);
    else await apiClient.updateMission(mission.id, form);
    onSaved();
    onClose();
    setSaving(false);
  };

  const fields: [string, string, string][] = [
    ["ship_name", "Ship Name", "text"],
    ["ship_number", "Ship Number / IMO", "text"],
    ["polar_ice_class", "Polar Ice Class", "text"],
    ["start_port", "Start Port", "text"],
    ["end_port", "End Port", "text"],
    ["breakpoints_count", "Number of Breakpoints", "number"],
    ["departure_time", "Departure Time", "text"],
    ["expected_arrival", "Expected Arrival", "text"],
    ["travel_duration", "Travel Duration", "text"],
  ];

  return (
    <Modal open={open} onClose={onClose} title={mode === "add" ? "Add New Mission" : `Edit Mission — ${mission?.ship_name}`}>
      <form onSubmit={submit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {fields.map(([key, label, type]) => (
          <label key={key} className="block">
            <span className={`text-[11px] font-semibold ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>{label}</span>
            <input type={type} value={form[key] ?? ""} onChange={set(key)} className={inputCls(d)} />
          </label>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost(d)}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary(d)}>
            {saving ? "Saving..." : mode === "add" ? "Create Mission" : "Update Mission"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TABLE 3: ICEBERG FLEET REGISTRY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function IcebergRegistryTable({ onCount }: { onCount?: (n: number) => void }) {
  const d = useDark();
  const [bergs, setBergs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [modalMode, setModalMode] = useState<"closed" | "add" | "edit">("closed");
  const [editBerg, setEditBerg] = useState<any>(null);
  const { refreshIcebergs } = useNav();
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await apiClient.getIcebergRegistry();
      setBergs(data);
      onCountRef.current?.(data.length);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const filtered = bergs.filter((b) => {
    const matchSearch = `${b.name} ${b.sector} ${b.risk_level}`.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === "ALL" || b.risk_level?.toUpperCase() === riskFilter;
    return matchSearch && matchRisk;
  });

  const riskColor = (r: string) => {
    switch (r?.toUpperCase()) {
      case "CRITICAL": return "bg-[#ef4444]/15 text-[#ef4444]";
      case "HIGH": return "bg-[#f59e0b]/15 text-[#f59e0b]";
      case "MEDIUM": return "bg-[#3b82f6]/15 text-[#3b82f6]";
      default: return "bg-[#10b981]/15 text-[#10b981]";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this iceberg registry record? This will sync to map.")) return;
    await apiClient.deleteIcebergRecord(id);
    load();
    refreshIcebergs();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold">🧊 Antarctic Iceberg Fleet Registry</h2>
          <p className={`text-[13px] ${d ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
            All 33 US National Ice Center tracked icebergs — positions, sizes, and risk assessment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f7d89]" />
            <input value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search icebergs..." className={`pl-8 pr-3 py-2 rounded-lg text-[13px] w-48 ${inputCls(d)}`} />
          </div>
          <select value={riskFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setRiskFilter(e.target.value)} className={`rounded-lg text-[12px] px-2 py-2 ${inputCls(d)}`}>
            <option value="ALL">All Risks</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <button onClick={load} className={btnGhost(d)} title="Refresh"><RefreshCw size={14} /></button>
          <button onClick={() => { setEditBerg(null); setModalMode("add"); }} className={btnPrimary(d)}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Add Iceberg</span>
          </button>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${card(d)}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className={d ? "bg-[#0a1e2d]/80" : "bg-[#f5efe3]"}>
                {["Name", "Sector", "Latitude", "Longitude", "Length (nm)", "Width (nm)", "Size (km)", "Risk", "Confidence", "Last Updated", "Actions"].map((h) => (
                  <th key={h} className={`px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-[#5f7d89]">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-[#5f7d89]">No icebergs match filters.</td></tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className={`border-t ${d ? "border-[#1d445c]/40 hover:bg-[#132f40]/50" : "border-[#e2d8c7]/60 hover:bg-[#f6f0e4]"} transition-colors`}>
                    <td className="px-3 py-2.5 font-bold font-mono text-[#55d6e8]">{b.name}</td>
                    <td className="px-3 py-2.5">{b.sector}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">{b.latitude?.toFixed(3)}°</td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">{b.longitude?.toFixed(3)}°</td>
                    <td className="px-3 py-2.5 text-center">{b.length_nm ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center">{b.width_nm ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center">{b.size_km ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${riskColor(b.risk_level)}`}>
                        {b.risk_level}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">{b.confidence ? `${(b.confidence * 100).toFixed(0)}%` : "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] whitespace-nowrap">{b.last_updated || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setEditBerg(b); setModalMode("edit"); }} className={btnGhost(d)} title="Edit"><Pencil size={12} /></button>
                        <button onClick={() => handleDelete(b.id)} className={btnDanger} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`mt-3 text-[12px] ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>
        Showing {filtered.length} of {bergs.length} icebergs · Data: US National Ice Center, 18–20 Aug 2026
      </div>

      <IcebergFormModal
        open={modalMode !== "closed"}
        mode={modalMode === "edit" ? "edit" : "add"}
        berg={editBerg}
        onClose={() => setModalMode("closed")}
        onSaved={() => { load(); refreshIcebergs(); }}
      />
    </div>
  );
}

function IcebergFormModal({ open, mode, berg, onClose, onSaved }: { open: boolean; mode: "add" | "edit"; berg: any; onClose: () => void; onSaved: () => void }) {
  const d = useDark();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "edit" && berg) {
      setForm({ ...berg });
    } else {
      setForm({
        name: "", sector: "Antarctic Waters", latitude: -60.0, longitude: -45.0,
        length_nm: 10.0, width_nm: 5.0, area_sqnm: 50.0, size_km: 18.5,
        speed_ms: 0.3, heading_deg: 45.0, risk_level: "medium", confidence: 0.85
      });
    }
    setError("");
  }, [mode, berg, open]);

  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === "number" ? parseFloat(e.target.value) : e.target.value;
    setForm((p: any) => ({ ...p, [k]: val }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (mode === "add") {
        const res = await apiClient.createIcebergRecord(form);
        if (res.detail) { setError(res.detail); setSaving(false); return; }
      } else {
        await apiClient.updateIcebergRecord(berg.id, form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save iceberg record.");
    }
    setSaving(false);
  };

  const fields: [string, string, string][] = [
    ["name", "Iceberg Name (e.g. A81)", "text"],
    ["sector", "Sector Area", "text"],
    ["latitude", "Latitude (decimal deg)", "number"],
    ["longitude", "Longitude (decimal deg)", "number"],
    ["length_nm", "Length (nautical miles)", "number"],
    ["width_nm", "Width (nautical miles)", "number"],
    ["area_sqnm", "Area (square NM)", "number"],
    ["size_km", "Size (km)", "number"],
    ["speed_ms", "Drift Speed (m/s)", "number"],
    ["heading_deg", "Heading (degrees)", "number"],
    ["confidence", "AI Confidence (0.0 - 1.0)", "number"],
  ];

  return (
    <Modal open={open} onClose={onClose} title={mode === "add" ? "Register New Tracked Iceberg" : `Edit Telemetry — ${berg?.name}`}>
      <form onSubmit={submit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {fields.map(([key, label, type]) => (
          <label key={key} className="block">
            <span className={`text-[11px] font-semibold ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>{label}</span>
            <input type={type} step="any" value={form[key] ?? ""} onChange={set(key)} className={inputCls(d)} required />
          </label>
        ))}
        <label className="block">
          <span className={`text-[11px] font-semibold ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>Risk Level</span>
          <select value={form.risk_level ?? "medium"} onChange={set("risk_level")} className={inputCls(d)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        {error && <p className="text-[12px] text-[#ef4444] font-medium">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnGhost(d)}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary(d)}>
            {saving ? "Saving..." : mode === "add" ? "Create Record" : "Update Telemetry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TABLE 4: USER FEEDBACK & INCIDENT CENTRAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function FeedbackTable({ onCount }: { onCount?: (n: number) => void }) {
  const d = useDark();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("ALL");
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await apiClient.getFeedback();
      setFeedback(data);
      onCountRef.current?.(data.length);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const filtered = feedback.filter((f) => catFilter === "ALL" || f.category === catFilter);

  const toggleStatus = async (f: any) => {
    const next = f.status === "REVIEWED" ? "RESOLVED" : f.status === "RESOLVED" ? "NEW" : "REVIEWED";
    await apiClient.updateFeedbackStatus(f.id, next);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this feedback entry?")) return;
    await apiClient.deleteFeedback(id);
    load();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "REVIEWED": return "bg-[#f59e0b]/15 text-[#f59e0b]";
      case "RESOLVED": return "bg-[#10b981]/15 text-[#10b981]";
      default: return "bg-[#3b82f6]/15 text-[#3b82f6]";
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "REVIEWED": return <Eye size={10} />;
      case "RESOLVED": return <CheckCircle2 size={10} />;
      default: return <Clock size={10} />;
    }
  };

  const categories = ["ALL", ...new Set(feedback.map((f) => f.category).filter(Boolean))];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold">💬 User Feedback & Incident Reports</h2>
          <p className={`text-[13px] ${d ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
            Live stream of user-submitted feedback, incident reports, and feature requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={catFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setCatFilter(e.target.value)} className={`rounded-lg text-[12px] px-2 py-2 ${inputCls(d)}`}>
            {categories.map((c) => (
              <option key={c} value={c}>{c === "ALL" ? "All Categories" : c}</option>
            ))}
          </select>
          <button onClick={load} className={btnGhost(d)} title="Refresh"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${card(d)}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className={d ? "bg-[#0a1e2d]/80" : "bg-[#f5efe3]"}>
                {["User", "Category", "Rating", "Message", "Status", "Submitted", "Actions"].map((h) => (
                  <th key={h} className={`px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#5f7d89]">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#5f7d89]">No feedback entries.</td></tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className={`border-t ${d ? "border-[#1d445c]/40 hover:bg-[#132f40]/50" : "border-[#e2d8c7]/60 hover:bg-[#f6f0e4]"} transition-colors`}>
                    <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{f.user_name || f.user_email || "Anonymous"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${d ? "bg-[#1d445c]/50 text-[#91aeb9]" : "bg-[#e2d8c7] text-[#4a6878]"}`}>
                        {f.category || "General"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={12} className={s <= (f.rating || 0) ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#5f7d89]/30"} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[250px] truncate">{f.message}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggleStatus(f)} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${statusColor(f.status)}`}>
                        {statusIcon(f.status)} {f.status || "NEW"}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] whitespace-nowrap">{f.created_at || "—"}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => handleDelete(f.id)} className={btnDanger} title="Delete"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`mt-3 text-[12px] ${d ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>
        Showing {filtered.length} of {feedback.length} feedback entries
      </div>
    </div>
  );
}
