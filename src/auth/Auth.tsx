import {
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowLeft, CheckCircle2, Lock, Mail, Shield, User as UserIcon } from "lucide-react";
import { mockSignIn, type User, type UserRole } from "../data/auth";
import { ThemeToggle, useTheme } from "../theme";
import apiClient from "../api/client";

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
  const [email, setEmail] = useState("user@antarctica.com");
  const [password, setPassword] = useState("User@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      // Real backend authentication
      const res = await apiClient.auth.login(email.trim(), password);
      localStorage.setItem("dhruva_auth_token", res.access_token);
      
      const authUser: User = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role === "ADMIN" ? "Admin" : "Researcher",
        organization: res.user.organization || "NCPOR Expedition",
      };
      
      onSignedIn(authUser);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell onHome={onHome}>
      <h1 className="text-[28px] font-bold tracking-tight">Welcome back</h1>
      <p className={`mt-1.5 text-[14px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        Sign in to the <span className="font-semibold">Dhruv Sarthi</span> operational console.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Email address">
          <Input type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="user@antarctica.com" required />
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
        <PrimaryBtn type="submit" disabled={loading}>
          {loading ? "Authenticating..." : "Access Console"}
        </PrimaryBtn>
      </form>

      <div className="mt-4 flex items-center justify-between text-[13px]">
        <button
          onClick={() => onView("admin-login")}
          className={`font-semibold hover:underline ${isDark ? "text-[#55d6e8]" : "text-[#0f768e]"}`}
        >
          Administrator login →
        </button>
        <button
          onClick={() => onView("signup")}
          className={`font-semibold hover:underline ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}
        >
          Create account
        </button>
      </div>

      <DemoNote>
        <div className="font-bold mb-1">Demo Credentials:</div>
        <div><b>User:</b> user@antarctica.com / User@123 (Role: USER)</div>
        <div><b>Admin:</b> admin@antarctica.com / Admin@123 (Role: ADMIN)</div>
      </DemoNote>
    </Shell>
  );
}

function SignUp({ onView, onHome }: { onView: (v: AuthView) => void; onHome: () => void }) {
  const [done, setDone] = useState(false);
  const [role, setRole] = useState<UserRole>("Researcher");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") || "");
    const confirm = String(f.get("confirm") || "");
    const name = String(f.get("name") || "");
    const email = String(f.get("email") || "");
    const org = String(f.get("org") || "");

    if (password !== confirm) return setError("Passwords do not match.");

    try {
      setSubmitting(true);
      setError("");
      await apiClient.auth.register({
        name,
        email,
        password,
        organization: org,
        role: "USER",
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
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
            Your account is ready. Sign in to access the <span className="font-semibold">Dhruv Sarthi</span> console.
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
        <PrimaryBtn type="submit" disabled={submitting}>
          {submitting ? "Creating Account..." : "Register Account"}
        </PrimaryBtn>
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
  const [email, setEmail] = useState("admin@antarctica.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const res = await apiClient.auth.login(email.trim(), password);
      if (res.user.role !== "ADMIN") {
        throw new Error("This account does not have Administrator privileges. Please use User Login.");
      }
      localStorage.setItem("dhruva_auth_token", res.access_token);
      
      const adminUser: User = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: "Admin",
        organization: res.user.organization || "NCPOR Polar Operations Directorate",
      };
      
      onAdminIn(adminUser);
    } catch (err: any) {
      setError(err.message || "Administrator credentials not recognised.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell onHome={onHome}>
      <div
        className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
          isDark
            ? "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]"
            : "border-[#ef4444]/40 bg-[#fee2e2] text-[#991b1b]"
        }`}
      >
        <Shield size={13} />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">Fleet Administrator Access</span>
      </div>

      <h1 className="text-[28px] font-bold tracking-tight">Admin sign in</h1>
      <p className={`mt-1.5 text-[14px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        Mission Operations & Fleet Dispatch Control.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Administrator Email">
          <Input type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Admin Password">
          <Input type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required />
        </Field>

        {error && <p className="text-[12px] text-[#ef4444] font-medium">{error}</p>}
        <PrimaryBtn type="submit" disabled={loading}>
          {loading ? "Verifying Root Credentials..." : "Access Admin Hub"}
        </PrimaryBtn>
      </form>

      <p className={`mt-5 text-center text-[13px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
        Not an administrator?{" "}
        <button
          onClick={() => onView("user-login")}
          className={`font-bold hover:underline ${isDark ? "text-[#55d6e8]" : "text-[#0f768e]"}`}
        >
          User login
        </button>
      </p>

      <DemoNote>
        <div className="font-bold mb-1">Admin Demo Credentials:</div>
        <div><b>Email:</b> admin@antarctica.com</div>
        <div><b>Password:</b> Admin@123</div>
      </DemoNote>
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

// ---- Admin Dashboard Placeholder ----
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

  const cards = [
    { icon: UserIcon, label: "Active Navigators", value: "128", tag: "FLEET" },
    { icon: Mail, label: "Open Alert Tickets", value: "2", tag: "TELEMETRY" },
    { icon: Lock, label: "Encrypted Uplinks", value: "37", tag: "SATCOM" },
    { icon: Shield, label: "Neural Model Health", value: "99.8%", tag: "OPTIMAL" },
  ];

  return (
    <div
      className={`h-full overflow-y-auto transition-colors duration-300 ${
        isDark ? "bg-[#071521] text-[#eaf6f8]" : "bg-[#faf8f5] text-[#0d2433]"
      }`}
    >
      <header
        className={`sticky top-0 z-10 flex h-16 items-center justify-between border-b px-6 backdrop-blur ${
          isDark
            ? "border-[#1d445c]/80 bg-[#071521]/90 text-[#eaf6f8]"
            : "border-[#e2d8c7] bg-[#faf8f5]/90 text-[#0d2433]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isDark ? "bg-[#132f40] text-[#55d6e8]" : "bg-[#0d2433] text-[#55d6e8]"
            }`}
          >
            <Shield size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold">Dhruv Sarthi · Admin Hub</div>
            <div className={`text-[11px] ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
              {user.name} · {user.organization}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onOpenConsole && (
            <button
              onClick={onOpenConsole}
              className="rounded-md bg-[#55d6e8] px-3.5 py-2 text-[12px] font-bold text-[#071521] shadow transition-colors hover:bg-[#7be3f2]"
            >
              Open Navigation Dashboard →
            </button>
          )}
          <ThemeToggle variant="icon" />
          <button
            onClick={onSignOut}
            className={`rounded-md border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              isDark
                ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8] hover:bg-[#132f40]"
                : "border-[#dfd8cc] bg-white text-[#0d2433] hover:bg-[#f2ebe0]"
            }`}
          >
            Sign out
          </button>
        </div>
      </header>


      <div className="mx-auto max-w-5xl px-6 py-10">
        <div
          className={`mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
            isDark
              ? "border-[#55d6e8]/30 bg-[#55d6e8]/10 text-[#55d6e8]"
              : "border-[#0f768e]/30 bg-[#0f768e]/10 text-[#0f768e]"
          }`}
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">Mission Administration</span>
        </div>

        <h1 className="text-[30px] font-bold tracking-tight">Fleet Administration Overview</h1>
        <p className={`mt-2 max-w-2xl text-[15px] leading-relaxed ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
          Comprehensive polar operations telemetry, neural forecast pipeline health, and research vessel route authorizations.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border p-5 shadow-sm transition-all ${
                isDark
                  ? "border-[#1d445c]/80 bg-[#0d2433]/70"
                  : "border-[#e2d8c7] bg-white shadow-sm"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    isDark ? "bg-[#132f40] text-[#55d6e8]" : "bg-[#f2ece0] text-[#0f768e]"
                  }`}
                >
                  <c.icon size={18} />
                </div>
                <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[#10b981]">
                  {c.tag}
                </span>
              </div>
              <div className="font-mono text-[26px] font-bold">{c.value}</div>
              <div className={`mt-0.5 text-[12px] font-medium ${isDark ? "text-[#91aeb9]" : "text-[#4a6878]"}`}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
