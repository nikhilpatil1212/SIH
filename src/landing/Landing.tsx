import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Compass,
  Cpu,
  Eye,
  Gauge,
  LineChart,
  Navigation2,
  Route,
  ShieldCheck,
  Ship,
  Snowflake,
  Waves,
} from "lucide-react";
import { AntarcticPolarMap } from "../components/map/AntarcticPolarMap";
import { icebergs, routes, vessel } from "../data/mock";
import { ThemeToggle, useTheme } from "../theme";

export type LandingTarget = "user-login" | "admin-login" | "signup";

const NAV = [
  { id: "how", label: "How It Works" },
  { id: "features", label: "Capabilities" },
  { id: "about", label: "About Dhruv Sarthi" },
  { id: "why", label: "Why It Matters" },
];

const WORKFLOW = [
  {
    icon: Eye,
    title: "Satellite & Sensor Telemetry Ingestion",
    short: "Observe",
    body: "Continuous multi-modal acquisition of Synthetic Aperture Radar (SAR), optical feeds, polar bathymetry, and shipboard metocean telemetry across Antarctic operational sectors.",
  },
  {
    icon: Activity,
    title: "Multi-Layer Environmental Fusion",
    short: "Analyze",
    body: "Deep neural fusion across dynamic pack-ice concentration, polar wind vectors, ocean currents, surface temperatures, and atmospheric visibility constraints.",
  },
  {
    icon: LineChart,
    title: "72-Hour Ice Drift & Hazard Forecasting",
    short: "Predict",
    body: "Physics-informed neural modeling of tabular iceberg trajectories, pack-ice compressive deformation, and multi-day probabilistic spatial uncertainty envelopes.",
  },
  {
    icon: Gauge,
    title: "Multi-Criteria Operational Risk Scoring",
    short: "Assess Risk",
    body: "Real-time probabilistic risk indices factoring Polar Code vessel hull class (PC6), ice-collision closing velocities, and safety stand-off perimeters.",
  },
  {
    icon: Navigation2,
    title: "Tactical Passage & Route Optimization",
    short: "Navigate",
    body: "Autonomous synthesis of optimal waypoint corridors with granular speed profiles, minimum fuel consumption, and icebreaker escort coordination.",
  },
  {
    icon: Route,
    title: "Dynamic Operational Re-Routing",
    short: "Re-Route",
    body: "Immediate threat detection triggers automated alternative corridor dispatch and live bridge alerts when newly drifting ice obstacles intersect voyage tracks.",
  },
];

const FEATURES = [
  {
    icon: Snowflake,
    title: "Iceberg Trajectory & Drift Forecasting",
    body: "Probabilistic neural drift forecasting with 95% spatial dispersion corridors that project tabular iceberg movements up to 72 hours forward.",
  },
  {
    icon: Waves,
    title: "Basin-Scale Sea-Ice Dynamics",
    body: "High-resolution sea-ice concentration and compression mapping, forecasting lead formation and pack-ice convergence across navigation tracks.",
  },
  {
    icon: Route,
    title: "Multi-Route Comparative Intelligence",
    body: "Simultaneously evaluate fastest, safest, and fuel-optimized corridors with explainable composite risk quantification.",
  },
  {
    icon: AlertTriangle,
    title: "Real-Time Rerouting & Collision Mitigation",
    body: "Event-driven automated recalculation that detects drifting ice hazards and delivers safer headings directly to the ship's bridge.",
  },
  {
    icon: Compass,
    title: "Deep Metocean & Environmental Intelligence",
    body: "Fused wind, ocean current vectors, sea temperature, and blizzard visibility forecasting tailored for Southern Ocean operations.",
  },
  {
    icon: ShieldCheck,
    title: "Polar Code Risk Compliance",
    body: "Every waypoint is evaluated against vessel structural ice class limits — delivering realistic, safety-critical decision support.",
  },
];

const WHY = [
  {
    stat: "72 h",
    label: "Predictive Horizon",
    body: "Anticipate drifting icebergs and closing leads days ahead of time instead of reacting at the ice edge.",
  },
  {
    stat: "3+ Corridors",
    label: "Compared In Real-Time",
    body: "Balance transit velocity, bunker fuel expenditure, and structural safety with transparent mathematical scoring.",
  },
  {
    stat: "Live AI",
    label: "Dynamic Re-Route Dispatch",
    body: "Continuous tactical course corrections that automatically adapt as the Antarctic ice pack shifts around the vessel.",
  },
];

function Header({ onAuth }: { onAuth: (t: LandingTarget) => void }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur transition-colors ${
        isDark
          ? "border-[#1d445c]/80 bg-[#071521]/90 text-[#eaf6f8]"
          : "border-[#e2d8c7] bg-[#faf8f5]/90 text-[#0d2433]"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              isDark
                ? "border-[#55d6e8]/40 bg-[#55d6e8]/10 text-[#55d6e8]"
                : "border-[#0f768e]/40 bg-[#0f768e]/10 text-[#0f768e]"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M12 3 L20 20 L12 15 L4 20 Z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[17px] font-bold tracking-[0.03em]">Dhruv Sarthi</div>
            <div
              className={`text-[9px] font-semibold uppercase tracking-[0.2em] ${
                isDark ? "text-[#8ccfe0]" : "text-[#0f768e]"
              }`}
            >
              Antarctic Navigation AI
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={`text-[13px] font-medium transition-colors ${
                isDark ? "text-[#91aeb9] hover:text-[#55d6e8]" : "text-[#4a6878] hover:text-[#0d2433]"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {/* Header Actions: Theme Toggle + Login + Console */}
        <div className="flex items-center gap-3">
          <ThemeToggle variant="icon" />

          <div className="relative" onMouseLeave={() => setLoginOpen(false)}>
            <button
              onClick={() => setLoginOpen((o) => !o)}
              className={`flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                isDark
                  ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8] hover:bg-[#132f40]"
                  : "border-[#dfd8cc] bg-[#f2ece0] text-[#0d2433] hover:bg-[#eae2d4]"
              }`}
            >
              <span>Login</span> <ChevronDown size={14} />
            </button>
            {loginOpen && (
              <div
                className={`absolute right-0 top-full mt-1 w-44 overflow-hidden rounded-md border shadow-xl ${
                  isDark
                    ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8]"
                    : "border-[#e2d8c7] bg-white text-[#0d2433]"
                }`}
              >
                <button
                  onClick={() => onAuth("user-login")}
                  className={`block w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    isDark ? "hover:bg-[#132f40]" : "hover:bg-[#f6f0e4]"
                  }`}
                >
                  Researcher Login
                </button>
                <button
                  onClick={() => onAuth("admin-login")}
                  className={`block w-full border-t px-4 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    isDark
                      ? "border-[#1d445c]/60 hover:bg-[#132f40]"
                      : "border-[#e8e0d2] hover:bg-[#f6f0e4]"
                  }`}
                >
                  Operator / Admin
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onAuth("signup")}
            className={`rounded-md px-4 py-2 text-[13px] font-semibold transition-colors ${
              isDark
                ? "bg-[#55d6e8] text-[#071521] hover:bg-[#7be3f2]"
                : "bg-[#0d2433] text-[#faf8f5] hover:bg-[#16394f]"
            }`}
          >
            Launch Console
          </button>
        </div>
      </div>
    </header>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <div
      className={`mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] ${
        theme === "dark" ? "text-[#55d6e8]" : "text-[#0f768e]"
      }`}
    >
      {children}
    </div>
  );
}

export function Landing({ onAuth }: { onAuth: (t: LandingTarget) => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`h-full overflow-y-auto transition-colors duration-300 ${
        isDark ? "bg-[#071521] text-[#eaf6f8]" : "bg-[#faf8f5] text-[#0d2433]"
      }`}
    >
      <Header onAuth={onAuth} />

      {/* Hero Section */}
      <section
        className={`relative overflow-hidden border-b transition-colors ${
          isDark ? "border-[#1d445c]/60" : "border-[#e2d8c7]"
        }`}
      >
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-[#55d6e8]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-0 h-[460px] w-[460px] rounded-full bg-[#3b82f6]/10 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative">
            <div
              className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 backdrop-blur ${
                isDark
                  ? "border-[#1d445c] bg-[#0d2433]/70 text-[#8ccfe0]"
                  : "border-[#dfd8cc] bg-[#f2ece0]/80 text-[#3a5563]"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em]">
                Antarctic Maritime Decision Support · 2D AI Polar Telemetry
              </span>
            </div>

            <h1 className="text-[42px] font-bold leading-[1.08] tracking-tight sm:text-[54px]">
              Navigate the Antarctic with intelligent risk awareness
            </h1>

            <p
              className={`mt-5 max-w-xl text-[16px] leading-relaxed ${
                isDark ? "text-[#91aeb9]" : "text-[#4a6878]"
              }`}
            >
              <strong className={isDark ? "text-[#eaf6f8]" : "text-[#0d2433]"}>Dhruv Sarthi</strong> is
              an AI-powered polar navigation and route decision-support platform. Forecast iceberg drift, assess
              sea-ice compression dynamics, and dynamically re-route around drifting hazards across Southern Ocean waters.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onAuth("user-login")}
                className={`rounded-md px-6 py-3.5 text-[14px] font-semibold shadow-lg transition-all ${
                  isDark
                    ? "bg-[#55d6e8] text-[#071521] hover:bg-[#7be3f2] shadow-[#55d6e8]/10"
                    : "bg-[#0d2433] text-[#faf8f5] hover:bg-[#16394f] shadow-[#0d2433]/15"
                }`}
              >
                Launch Console
              </button>
              <button
                onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
                className={`rounded-md border px-6 py-3.5 text-[14px] font-semibold transition-colors ${
                  isDark
                    ? "border-[#1d445c] bg-[#0d2433]/60 text-[#eaf6f8] hover:bg-[#132f40]"
                    : "border-[#d8d0c2] bg-white text-[#0d2433] hover:bg-[#f2ebe0]"
                }`}
              >
                Explore 6-Stage Workflow
              </button>
            </div>
          </div>

          {/* Hero 2D Antarctic Polar Map Preview */}
          <div className="relative">
            <div
              className={`overflow-hidden rounded-2xl border shadow-2xl transition-colors ${
                isDark
                  ? "border-[#1d445c]/80 bg-[#050d17] shadow-black/60"
                  : "border-[#dfd8cc] bg-[#ede6da] shadow-[#0d2433]/15"
              }`}
            >
              <div
                className={`flex items-center justify-between border-b px-4 py-2.5 ${
                  isDark
                    ? "border-[#1d445c]/60 bg-[#071521] text-[#8ccfe0]"
                    : "border-[#e2d8c7] bg-[#f8f5ee] text-[#0f768e]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Ship size={14} className={isDark ? "text-[#55d6e8]" : "text-[#0f768e]"} />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">
                    Dhruv Sarthi · Live Polar Chart
                  </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#10b981]">
                  ● Live 2D Polar Chart
                </span>
              </div>
              <div className="h-[380px]">
                <AntarcticPolarMap
                  routes={routes}
                  icebergs={icebergs}
                  selectedRouteId="route-b"
                  vessel={{
                    name: vessel.name,
                    position: { lat: vessel.position.lat, lon: vessel.position.lon },
                    headingDeg: vessel.headingDeg,
                    speedKn: vessel.speedKn,
                    status: vessel.status,
                  }}
                  compact
                  className="h-full w-full border-none rounded-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 STAGES OF HOW IT WORKS (ENLARGED & ENHANCED TYPOGRAPHY) */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <SectionLabel>Six-Stage Operational Pipeline</SectionLabel>
          <h2 className="text-[34px] sm:text-[40px] font-bold tracking-tight">
            From raw satellite telemetry to tactical route guidance
          </h2>
          <p
            className={`mt-4 text-[17px] leading-relaxed ${
              isDark ? "text-[#91aeb9]" : "text-[#4a6878]"
            }`}
          >
            Six integrated AI stages translate complex polar environmental data into transparent, actionable, and
            explainable voyage recommendations.
          </p>
        </div>

        {/* 6 Stage Grid with substantially larger text & clear typography hierarchy */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW.map((w, i) => (
            <div
              key={w.title}
              className={`group relative flex flex-col justify-between rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                isDark
                  ? "border-[#1d445c]/80 bg-[#0d2433]/70 hover:border-[#55d6e8]/60 hover:bg-[#132f40]/80 shadow-black/30"
                  : "border-[#e2d8c7] bg-white hover:border-[#0f768e]/50 hover:bg-[#fdfbf8] shadow-sm"
              }`}
            >
              <div>
                {/* Header: Icon & Big Stage Number */}
                <div className="mb-5 flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
                      isDark
                        ? "border-[#55d6e8]/30 bg-[#55d6e8]/10 text-[#55d6e8]"
                        : "border-[#0f768e]/30 bg-[#0f768e]/10 text-[#0f768e]"
                    }`}
                  >
                    <w.icon size={24} strokeWidth={1.8} />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-[22px] font-bold tracking-wider ${
                        isDark ? "text-[#55d6e8]" : "text-[#0f768e]"
                      }`}
                    >
                      0{i + 1}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${
                        isDark ? "text-[#91aeb9]" : "text-[#7a94a2]"
                      }`}
                    >
                      / 06
                    </span>
                  </div>
                </div>

                {/* Stage Short Badge */}
                <div className="mb-2">
                  <span
                    className={`inline-block rounded-md px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                      isDark
                        ? "bg-[#1d445c]/80 text-[#8ccfe0]"
                        : "bg-[#f2ece0] text-[#0f768e]"
                    }`}
                  >
                    Stage {i + 1} · {w.short}
                  </span>
                </div>

                {/* Stage Title */}
                <h3 className="text-[19px] font-bold leading-snug tracking-tight">
                  {w.title}
                </h3>

                {/* Description - substantially enlarged and readable */}
                <p
                  className={`mt-3 text-[15px] leading-relaxed ${
                    isDark ? "text-[#91aeb9]" : "text-[#4a6878]"
                  }`}
                >
                  {w.body}
                </p>
              </div>

              {/* Bottom Subtle Indicator */}
              <div
                className={`mt-6 flex items-center justify-between border-t pt-3 font-mono text-[11px] ${
                  isDark ? "border-[#1d445c]/50 text-[#5f7d89]" : "border-[#ede5d6] text-[#8ea5b3]"
                }`}
              >
                <span>Automated Neural Engine</span>
                <span className="text-[#10b981]">● Verified</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities / Features */}
      <section
        id="features"
        className={`border-y transition-colors ${
          isDark ? "border-[#1d445c]/60 bg-[#0a1b28]/60" : "border-[#e2d8c7] bg-[#f4eee3]/60"
        }`}
      >
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <SectionLabel>Core Capabilities</SectionLabel>
            <h2 className="text-[34px] sm:text-[40px] font-bold tracking-tight">
              Purpose-built for harsh polar maritime operations
            </h2>
            <p
              className={`mt-3 text-[16px] ${
                isDark ? "text-[#91aeb9]" : "text-[#4a6878]"
              }`}
            >
              Enterprise-grade tools for research expedition leaders, vessel masters, and polar operations managers.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`rounded-xl border p-6 transition-all ${
                  isDark
                    ? "border-[#1d445c]/70 bg-[#0d2433]/70 hover:border-[#55d6e8]/50"
                    : "border-[#e2d8c7] bg-white hover:border-[#0f768e]/50 shadow-sm"
                }`}
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${
                    isDark ? "bg-[#132f40] text-[#55d6e8]" : "bg-[#0d2433] text-[#55d6e8]"
                  }`}
                >
                  <f.icon size={20} strokeWidth={1.8} />
                </div>
                <div className="text-[17px] font-bold leading-tight">{f.title}</div>
                <p
                  className={`mt-2 text-[14px] leading-relaxed ${
                    isDark ? "text-[#91aeb9]" : "text-[#4a6878]"
                  }`}
                >
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Dhruv Sarthi */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionLabel>About The Project</SectionLabel>
            <h2 className="text-[34px] font-bold leading-tight tracking-tight">
              {"Advanced decision support for the world's most perilous ocean"}
            </h2>
          </div>
          <div
            className={`space-y-4 text-[16px] leading-relaxed ${
              isDark ? "text-[#91aeb9]" : "text-[#4a6878]"
            }`}
          >
            <p>
              <strong className={isDark ? "text-[#eaf6f8]" : "text-[#0d2433]"}>Dhruv Sarthi</strong> is
              a dedicated polar navigation decision-support platform. It unites tabular iceberg drift modeling,
              sea-ice concentration forecasting, environmental hazard fusion, and composite risk scoring into an
              intuitive 2D Polar Navigation console.
            </p>
            <p>
              The platform is architected so operational data streams (e.g. Synthetic Aperture Radar, numerical weather
              prediction, and AIS telemetry) feed seamlessly into automated risk algorithms while preserving transparent
              oversight on the bridge.
            </p>
            <div
              className={`rounded-xl border p-4 text-[13px] ${
                isDark
                  ? "border-[#f5b942]/30 bg-[#f5b942]/10 text-[#f5b942]"
                  : "border-[#d97706]/30 bg-[#fef3c7] text-[#92400e]"
              }`}
            >
              <strong>Mission Prototype:</strong> All values shown in this demo build are simulated high-fidelity data
              designed for system validation.
            </div>
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section
        id="why"
        className={`border-t transition-colors ${
          isDark ? "border-[#1d445c]/60 bg-[#050d17] text-[#eaf6f8]" : "border-[#e2d8c7] bg-[#0d2433] text-[#eaf6f8]"
        }`}
      >
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>Operational Impact</SectionLabel>
          <h2 className="max-w-2xl text-[34px] font-bold tracking-tight text-[#eaf6f8]">
            Anticipate hazards hours in advance, never react unprepared
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {WHY.map((w) => (
              <div key={w.label} className="rounded-xl border border-[#1d445c] bg-[#0d2433]/90 p-7">
                <div className="font-mono text-[38px] font-bold text-[#55d6e8]">{w.stat}</div>
                <div className="mt-1 text-[13px] font-bold uppercase tracking-wider text-[#8ccfe0]">{w.label}</div>
                <p className="mt-3 text-[14px] leading-relaxed text-[#91aeb9]">{w.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onAuth("signup")}
              className="rounded-md bg-[#55d6e8] px-7 py-3.5 text-[15px] font-bold text-[#071521] transition-colors hover:bg-[#7be3f2] shadow-lg shadow-[#55d6e8]/20"
            >
              Access Dhruv Sarthi Console
            </button>
            <button
              onClick={() => onAuth("user-login")}
              className="rounded-md border border-[#1d445c] px-7 py-3.5 text-[15px] font-semibold text-[#eaf6f8] transition-colors hover:bg-[#132f40]"
            >
              Sign In to Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`border-t transition-colors ${
          isDark ? "border-[#1d445c]/60 bg-[#071521]" : "border-[#e2d8c7] bg-[#faf8f5]"
        }`}
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-[16px] font-bold tracking-wide">Dhruv Sarthi</div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#55d6e8] light:text-[#0f768e]">
              Antarctic Navigation AI
            </div>
            <p
              className={`mt-3 max-w-xs text-[13px] leading-relaxed ${
                isDark ? "text-[#91aeb9]" : "text-[#4a6878]"
              }`}
            >
              AI-powered route decision-support platform for Antarctic research and maritime navigation.
            </p>
          </div>
          <FooterCol title="Navigation" items={["How It Works", "Core Capabilities", "About Dhruv Sarthi", "Why It Matters"]} />
          <FooterCol title="Decision Support" items={["Iceberg Drift AI", "Sea-Ice Compression", "Multi-Route Risk", "Dynamic Rerouting"]} />
          <FooterCol title="Operations" items={["NCPOR Research Fleet", "Ministry of Earth Sciences", "Polar Telemetry Lab", "Goa, India"]} />
        </div>
        <div
          className={`border-t px-6 py-5 ${
            isDark ? "border-[#1d445c]/40 text-[#5f7d89]" : "border-[#e8e0d2] text-[#7a93a1]"
          }`}
        >
          <div className="mx-auto max-w-6xl text-[12px] flex flex-wrap items-center justify-between gap-2">
            <span>© 2026 Dhruv Sarthi (Dhruva Sarathi) — Polar Maritime AI Decision Support.</span>
            <span>All coordinates & telemetry are high-fidelity demonstrations.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div>
      <div
        className={`mb-3 text-[11px] font-bold uppercase tracking-[0.16em] ${
          isDark ? "text-[#8ccfe0]" : "text-[#0f768e]"
        }`}
      >
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it} className={`text-[13px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
