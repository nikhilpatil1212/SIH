import { useState } from "react";
import { Landing, type LandingTarget } from "./landing/Landing";
import { AuthFlow, type AuthView } from "./auth/Auth";
import { AdminDashboard } from "./pages/AdminDashboard";
import { OperationalApp } from "./OperationalApp";
import { ThemeProvider } from "./theme";
import { NavProvider } from "./state";
import type { User } from "./data/auth";

type Screen = "landing" | "auth" | "app" | "admin";

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [authView, setAuthView] = useState<AuthView>("user-login");
  const [user, setUser] = useState<User | null>(null);

  const openAuth = (t: LandingTarget) => {
    setAuthView(t);
    setScreen("auth");
  };
  const signOut = () => {
    setUser(null);
    setScreen("landing");
  };

  return (
    <ThemeProvider>
      <NavProvider>
        {screen === "landing" && (
          <Landing
            onAuth={openAuth}
            onOpenConsole={() => setScreen("app")}
          />
        )}

        {screen === "auth" && (
          <AuthFlow
            view={authView}
            onView={setAuthView}
            onHome={() => setScreen("landing")}
            onSignedIn={(u) => {
              setUser(u);
              if (u.role === "Admin") {
                setScreen("admin");
              } else {
                setScreen("app");
              }
            }}
            onAdminIn={(u) => {
              setUser(u);
              setScreen("admin");
            }}
          />
        )}

        {screen === "admin" && (
          <AdminDashboard
            user={user || {
              id: "adm-001",
              name: "Commander Rajesh Sharma",
              email: "admin@ncpor.res.in",
              organization: "NCPOR Mission Control",
              role: "Admin",
            }}
            onSignOut={signOut}
            onOpenConsole={() => setScreen("app")}
          />
        )}


        {screen === "app" && (
          <OperationalApp
            user={user}
            onSignOut={signOut}
            onOpenAdmin={() => setScreen("admin")}
          />
        )}
      </NavProvider>
    </ThemeProvider>
  );
}

