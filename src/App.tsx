import { useState } from "react";
import { Landing, type LandingTarget } from "./landing/Landing";
import { AuthFlow, AdminDashboard, type AuthView } from "./auth/Auth";
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
        {screen === "landing" && <Landing onAuth={openAuth} />}

        {screen === "auth" && (
          <AuthFlow
            view={authView}
            onView={setAuthView}
            onHome={() => setScreen("landing")}
            onSignedIn={(u) => {
              setUser(u);
              setScreen("app");
            }}
            onAdminIn={(u) => {
              setUser(u);
              setScreen("admin");
            }}
          />
        )}

        {screen === "admin" && user && <AdminDashboard user={user} onSignOut={signOut} />}

        {screen === "app" && <OperationalApp user={user} onSignOut={signOut} />}
      </NavProvider>
    </ThemeProvider>
  );
}
