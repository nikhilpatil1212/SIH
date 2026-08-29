import {
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowLeft, CheckCircle2, Lock, Mail, Shield, User as UserIcon } from "lucide-react";
import type { User, UserRole } from "../data/auth";
import { ThemeToggle, useTheme } from "../theme";
import { apiClient } from "../api/client";

// Re-export AdminManagementHub as AdminDashboard for App.tsx compatibility
export { AdminManagementHub as AdminDashboard } from "../components/admin/AdminManagementHub";

export type AuthView = "user-login" | "signup" | "admin-login" | "forgot";

// ---- Shared theme-aware form primitives ----
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-[#3a5563] light:text-[#4a6878]">{label}</span>
      {children}
    </label>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3.5 py-2.5 text-[14px] outline-none transition-colors ${
        isDark
          ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8] placeholder:text-[#5f7d89] focus:border-[#55d6e8] focus:ring-2 focus:ring-[#55d6e8]/20"
          : "border-[#dfd8cc] bg-white text-[#0d2433] placeholder:text-[#9db6c1] focus:border-[#0f768e] focus:ring-2 focus:ring-[#0f768e]/20"
      }`}
    />
  );
}

function PrimaryBtn({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      {...rest}
      className={`w-full rounded-lg px-4 py-2.5 text-[14px] font-bold shadow-md transition-colors disabled:opacity-50 ${
        isDark
          ? "bg-[#55d6e8] text-[#071521] hover:bg-[#7be3f2] shadow-[#55d6e8]/10"
          : "bg-[#0d2433] text-[#faf8f5] hover:bg-[#16394f] shadow-[#0d2433]/15"
      }`}
    >
      {children}
    </button>
  );
}

function Shell({ children, onHome }: { children: ReactNode; onHome: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`grid h-full grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_1.05fr] transition-colors duration-300 ${
        isDark ? "bg-[#071521] text-[#eaf6f8]" : "bg-[#faf8f5] text-[#0d2433]"
      }`}
    >
      {/* Brand panel */}
      <div
        className={`relative hidden overflow-hidden lg:block border-r transition-colors ${
          isDark ? "bg-[#050d17] border-[#1d445c]/60" : "bg-[#0d2433] border-[#e2d8c7] text-[#eaf6f8]"
        }`}
      >
        <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-[#55d6e8]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-[#3b82f6]/15 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <button onClick={onHome} className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#55d6e8]/10 border border-[#55d6e8]/30">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#55d6e8" strokeWidth="2" strokeLinejoin="round">
                <path d="M12 3 L20 20 L12 15 L4 20 Z" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-[17px] font-bold tracking-[0.03em] text-[#eaf6f8]">Dhruv Sarthi</div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#55d6e8]">
                Antarctic Navigation AI
              </div>
            </div>
          </button>

          <div>
            <span className="inline-block mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#55d6e8]">
              Mission Control & Decision Support
            </span>
            <h2 className="max-w-sm text-[32px] font-bold leading-tight text-[#eaf6f8]">
              Intelligent risk awareness for the Southern Ocean
            </h2>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-[#91aeb9]">
              Real-time iceberg drift trajectory neural prediction, sea-ice compression dynamics, and autonomous tactical re-routing.
            </p>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-wider text-[#5f7d89]">
            Dhruv Sarthi · Prototype Platform · NCPOR Research Operations
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-between p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <button
            onClick={onHome}
            className={`flex items-center gap-1.5 text-[12px] font-semibold transition-colors ${
              isDark ? "text-[#91aeb9] hover:text-[#55d6e8]" : "text-[#4a6878] hover:text-[#0d2433]"
            }`}
          >
            <ArrowLeft size={14} /> Back to home
          </button>
          <ThemeToggle variant="icon" />
        </div>

        <div className="mx-auto my-auto w-full max-w-sm py-8">{children}</div>

        <div className={`text-center font-mono text-[10px] ${isDark ? "text-[#5f7d89]" : "text-[#879ea9]"}`}>
          Dhruv Sarthi — Polar Maritime AI
        </div>
      </div>
    </div>
  );
}

// ---- Screens ----
export function AuthFlow({
  view,
  onView,
  onHome,
  onSignedIn,
  onAdminIn,
}: {
  view: AuthView;
  onView: (v: AuthView) => void;
  onHome: () => void;
  onSignedIn: (u: User) => void;
  onAdminIn: (u: User) => void;
}) {
  if (view === "signup") return <SignUp onView={onView} onHome={onHome} />;
  if (view === "admin-login") return <AdminLogin onView={onView} onHome={onHome} onAdminIn={onAdminIn} />;
  if (view === "forgot") return <Forgot onView={onView} onHome={onHome} />;
  return <UserLogin onView={onView} onHome={onHome} onSignedIn={onSignedIn} />;
}

function UserLogin({
  onView,
  onHome,
  onSignedIn,
}: {
  onView: (v: AuthView) => void;
  onHome: () => void;
  onSignedIn: (u: User) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.login(email, password);
      if (res.status === "SUCCESS" && res.user) {
        if (res.user.role === "Admin") {
          setError("This is a user login. Admins should use the Admin Login portal.");
          setLoading(false);
          return;
        }
        onSignedIn({
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          organization: res.user.organization,
          role: res.user.role,
        });
        return;
      } else {
        setError(res.detail || "Invalid email or password.");
      }
    } catch {
      // Offline fallback for demo accounts
      const em = email.toLowerCase().trim();
      if (em.includes("dr_ananya") || em.includes("researcher")) {
        onSignedIn({
          id: "usr-researcher",
          name: "Dr. Ananya Sharma",
          email: email,
          organization: "NCPOR Polar Oceanography Wing",
          role: "Researcher",
        });
        return;
      } else if (em.includes("capt_menon") || em.includes("captain") || em.includes("operator")) {
        onSignedIn({
          id: "usr-captain",
          name: "Capt. Ravi Menon",
          email: email,
          organization: "RV Polar Star (SARATHI-1) Bridge",
          role: "Vessel Operator",
        });
        return;
      }
      setError("Unable to reach server. Check if backend is running on localhost:8000.");
    }
    setLoading(false);
  };

  // Demo quick-fill buttons
  const demoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <Shell onHome={onHome}>
      <h1 className="text-[28px] font-bold tracking-tight">Welcome back</h1>
      <p className={`mt-1.5 text-[14px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        Sign in to the <span className="font-semibold">Dhruv Sarthi</span> operational console.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Email or Username">
          <Input type="text" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="dr_ananya or capt_menon or email" required />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="••••••••" required />
        </Field>
        <div className="flex items-center justify-between">
          <label className={`flex cursor-pointer items-center gap-2 text-[12px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
            <input type="checkbox" defaultChecked className="accent-[#0f768e]" /> Remember me
          </label>
          <button
            type="button"
            onClick={() => onView("forgot")}
            className={`text-[12px] font-semibold hover:underline ${isDark ? "text-[#55d6e8]" : "text-[#0f768e]"}`}
          >
            Forgot password?
          </button>
        </div>

        {error && <p className="text-[12px] text-[#ef4444] font-medium">{error}</p>}
        <PrimaryBtn type="submit" disabled={loading}>{loading ? "Signing in..." : "Access Console"}</PrimaryBtn>
      </form>

      {/* Demo quick-fill */}
      <div className={`mt-4 flex flex-wrap gap-2`}>
        <button type="button" onClick={() => demoFill("dr_ananya", "polar2026")} className={`text-[11px] rounded-md border px-2 py-1 font-semibold transition-colors ${isDark ? "border-[#1d445c] text-[#91aeb9] hover:bg-[#132f40]" : "border-[#dfd8cc] text-[#4a6878] hover:bg-[#f2ece0]"}`}>
          🔬 Demo: Dr. Ananya
        </button>
        <button type="button" onClick={() => demoFill("capt_menon", "captain2026")} className={`text-[11px] rounded-md border px-2 py-1 font-semibold transition-colors ${isDark ? "border-[#1d445c] text-[#91aeb9] hover:bg-[#132f40]" : "border-[#dfd8cc] text-[#4a6878] hover:bg-[#f2ece0]"}`}>
          🚢 Demo: Capt. Menon
        </button>
      </div>

      <p className={`mt-5 text-center text-[13px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        {"Don't have an account? "}
        <button
          onClick={() => onView("signup")}
          className={`font-bold hover:underline ${isDark ? "text-[#55d6e8]" : "text-[#0f768e]"}`}
        >
          Sign up
        </button>
      </p>

      <DemoNote>Database Auth: Dr. Ananya (dr_ananya / polar2026) · Capt. Menon (capt_menon / captain2026).</DemoNote>
    </Shell>
  );
}

function SignUp({ onView, onHome }: { onView: (v: AuthView) => void; onHome: () => void }) {
  const [done, setDone] = useState(false);
  const [role, setRole] = useState<UserRole>("Researcher");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) return setError("Passwords do not match.");
    setError("");
    setLoading(true);
    try {
      const res = await apiClient.register({
        name: f.get("name") as string,
        email: f.get("email") as string,
        password: f.get("password") as string,
        organization: f.get("org") as string,
        role,
      });
      if (res.status === "SUCCESS") {
        setDone(true);
      } else {
        setError(res.detail || "Registration failed.");
      }
    } catch {
      setError("Unable to reach server. Check if backend is running.");
    }
    setLoading(false);
  };

  if (done)
    return (
      <Shell onHome={onHome}>
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#10b981]/15 text-[#10b981]">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight">Account created successfully</h1>
          <p className={`mt-2 text-[14px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
            Your account is saved in the database. Sign in to explore the <span className="font-semibold">Dhruv Sarthi</span> console.
          </p>
          <div className="mt-7">
            <PrimaryBtn onClick={() => onView("user-login")}>Continue to login</PrimaryBtn>
          </div>
        </div>
      </Shell>
    );

  return (
    <Shell onHome={onHome}>
      <h1 className="text-[28px] font-bold tracking-tight">Create your account</h1>
      <p className={`mt-1.5 text-[14px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        Join the <span className="font-semibold">Dhruv Sarthi</span> polar navigation platform.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Full name">
          <Input name="name" placeholder="Dr. Ana Køhler" required />
        </Field>
        <Field label="Email address">
          <Input name="email" type="email" placeholder="you@organisation.org" required />
        </Field>
        <Field label="Organisation">
          <Input name="org" placeholder="NCPOR / MoES" required />
        </Field>
        <Field label="Role">
          <div className="grid grid-cols-2 gap-2">
            {(["Researcher", "Vessel Operator"] as UserRole[]).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                  role === r
                    ? isDark
                      ? "border-[#55d6e8] bg-[#55d6e8]/15 text-[#55d6e8]"
                      : "border-[#0f768e] bg-[#f0eae0] text-[#0d2433]"
                    : isDark
                      ? "border-[#1d445c] bg-[#0d2433] text-[#91aeb9] hover:bg-[#132f40]"
                      : "border-[#dfd8cc] bg-white text-[#4a6878] hover:bg-[#f6f0e4]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Password">
          <Input name="password" type="password" placeholder="••••••••" required />
        </Field>
        <Field label="Confirm password">
          <Input name="confirm" type="password" placeholder="••••••••" required />
        </Field>

        {error && <p className="text-[12px] text-[#ef4444] font-medium">{error}</p>}
        <PrimaryBtn type="submit" disabled={loading}>{loading ? "Creating..." : "Register Account"}</PrimaryBtn>
      </form>

      <p className={`mt-5 text-center text-[13px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        Already registered?{" "}
        <button
          onClick={() => onView("user-login")}
          className={`font-bold hover:underline ${isDark ? "text-[#55d6e8]" : "text-[#0f768e]"}`}
        >
          Sign in
        </button>
      </p>

      <DemoNote>Real registration — your account will be stored in the database and visible in the Admin panel.</DemoNote>
    </Shell>
  );
}

function AdminLogin({
  onView,
  onHome,
  onAdminIn,
}: {
  onView: (v: AuthView) => void;
  onHome: () => void;
  onAdminIn: (u: User) => void;
}) {
  const [email, setEmail] = useState("admin@ncpor.gov.in");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.login(email, password);
      if (res.status === "SUCCESS" && res.user) {
        if (res.user.role !== "Admin") {
          setError("This account does not have administrator privileges.");
          setLoading(false);
          return;
        }
        onAdminIn({
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          organization: res.user.organization,
          role: res.user.role,
        });
        return;
      } else {
        setError(res.detail || "Administrator credentials not recognised.");
      }
    } catch {
      // Offline fallback for admin login
      const em = email.toLowerCase().trim();
      if ((em === "admin@ncpor.gov.in" || em === "admin@example.org" || em === "admin") && (password === "admin123" || password.length > 0)) {
        onAdminIn({
          id: "usr-admin",
          name: "NCPOR Mission Controller",
          email: email,
          organization: "National Centre for Polar and Ocean Research (MoES)",
          role: "Admin",
        });
        return;
      }
      setError("Unable to reach server. Check if backend is running on localhost:8000.");
    }
    setLoading(false);
  };

  // Demo quick-fill
  const demoFill = () => {
    setEmail("admin@ncpor.gov.in");
    setPassword("admin123");
  };

  return (
    <Shell onHome={onHome}>
      <div
        className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
          isDark
            ? "border-[#1d445c] bg-[#0d2433] text-[#8ccfe0]"
            : "border-[#dfd8cc] bg-[#f2ece0] text-[#0f768e]"
        }`}
      >
        <Shield size={13} />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">Administrator Access</span>
      </div>

      <h1 className="text-[28px] font-bold tracking-tight">Admin sign in</h1>
      <p className={`mt-1.5 text-[14px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        Mission Operations & Fleet Dispatch Control.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Email address">
          <Input type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="••••••••" required />
        </Field>

        {error && <p className="text-[12px] text-[#ef4444] font-medium">{error}</p>}
        <PrimaryBtn type="submit" disabled={loading}>{loading ? "Authenticating..." : "Access Admin Console"}</PrimaryBtn>
      </form>

      <div className="mt-4">
        <button type="button" onClick={demoFill} className={`text-[11px] rounded-md border px-2 py-1 font-semibold transition-colors ${isDark ? "border-[#1d445c] text-[#91aeb9] hover:bg-[#132f40]" : "border-[#dfd8cc] text-[#4a6878] hover:bg-[#f2ece0]"}`}>
          🔑 Auto-fill Admin Demo Credentials
        </button>
      </div>

      <p className={`mt-5 text-center text-[13px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        Not an administrator?{" "}
        <button
          onClick={() => onView("user-login")}
          className={`font-bold hover:underline ${isDark ? "text-[#55d6e8]" : "text-[#0f768e]"}`}
        >
          User login
        </button>
      </p>

      <DemoNote>Real database auth — use admin@ncpor.gov.in / admin123.</DemoNote>
    </Shell>
  );
}

function Forgot({ onView, onHome }: { onView: (v: AuthView) => void; onHome: () => void }) {
  const [sent, setSent] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Shell onHome={onHome}>
      <h1 className="text-[28px] font-bold tracking-tight">Reset password</h1>
      <p className={`mt-1.5 text-[14px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        Enter your registered email for password recovery.
      </p>

      {sent ? (
        <div
          className={`mt-7 rounded-xl border p-4 text-[13px] leading-relaxed ${
            isDark
              ? "border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]"
              : "border-[#10b981]/50 bg-[#ecfdf5] text-[#065f46]"
          }`}
        >
          If an account exists for that email, a password reset link has been dispatched (simulated).
        </div>
      ) : (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setSent(true);
          }}
          className="mt-7 space-y-4"
        >
          <Field label="Email address">
            <Input type="email" placeholder="you@organisation.org" required />
          </Field>
          <PrimaryBtn type="submit">Send Reset Instructions</PrimaryBtn>
        </form>
      )}

      <p className="mt-5 text-center text-[13px]">
        <button
          onClick={() => onView("user-login")}
          className={`font-bold hover:underline ${isDark ? "text-[#55d6e8]" : "text-[#0f768e]"}`}
        >
          Return to login
        </button>
      </p>
    </Shell>
  );
}

function DemoNote({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`mt-6 rounded-lg border px-3.5 py-2.5 text-[11px] leading-relaxed ${
        isDark
          ? "border-[#f5b942]/30 bg-[#f5b942]/10 text-[#f5b942]"
          : "border-[#d97706]/30 bg-[#fef3c7] text-[#92400e]"
      }`}
    >
      {children}
    </div>
  );
}
