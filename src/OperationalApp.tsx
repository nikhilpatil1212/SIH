import { useState } from "react";
import { Sidebar, type PageId } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./pages/Dashboard";
import { MapPage } from "./pages/MapPage";
import { Hazards } from "./pages/Hazards";
import { Routes } from "./pages/Routes";
import { Rerouting } from "./pages/Rerouting";
import { WhatIf } from "./pages/WhatIf";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { IcebergPrediction } from "./pages/IcebergPrediction";
import { SeaIcePrediction } from "./pages/SeaIcePrediction";
import { Environmental } from "./pages/Environmental";
import { Help } from "./pages/Help";
import { Contact } from "./pages/Contact";
import { NavProvider } from "./state";
import type { User } from "./data/auth";

const META: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: "ध्रुव सारथी · Mission Console", subtitle: "AI-powered iceberg trajectories, sea-ice dynamics & route risk support" },
  map: { title: "Operational Polar Chart", subtitle: "Interactive Antarctic navigational chart — Weddell & Southern Ocean sectors" },
  routes: { title: "Passage & Route Planning", subtitle: "Multi-corridor comparative intelligence and structural risk scoring" },
  iceberg: { title: "Iceberg Prediction Intelligence", subtitle: "2D Antarctic polar trajectory forecasting, 72h horizon & uncertainty corridors" },
  seaice: { title: "Sea-Ice Concentration Dynamics", subtitle: "Basin-scale concentration forecasting, pack-ice pressure & route impact" },
  environmental: { title: "Metocean Intelligence", subtitle: "Atmospheric and oceanic telemetry timelines across forecast windows" },
  hazards: { title: "Active & Predicted Hazards", subtitle: "Collision hazard matrix, severe weather fronts & drift intersections" },
  rerouting: { title: "Dynamic Tactical Re-Routing", subtitle: "Autonomous observation-driven corridor synthesis and bridge dispatch" },
  whatif: { title: "What-If Scenario Simulation", subtitle: "Sensitivity modeling for vessel velocity, ice class limits & weather shifts" },
  reports: { title: "Voyage & Mission Reports", subtitle: "Historical mission logs, collision risk analysis & reroute audits" },
  help: { title: "Help & Operational Documentation", subtitle: "Platform guidance, telemetry specifications & support triage" },
  contact: { title: "Contact ध्रुव सारथी Operations", subtitle: "Reach the NCPOR and Ministry of Earth Sciences polar navigation team" },
  settings: { title: "Platform Settings & Theme", subtitle: "Telemetry refresh intervals, unit preferences & display customization" },
};

export function OperationalApp({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  const [page, setPage] = useState<PageId>("dashboard");
  const meta = META[page];

  return (
    <NavProvider>
      <div className="flex h-full min-h-0 w-full bg-[#071521] light:bg-[#faf8f5] text-[#eaf6f8] light:text-[#0d2433] transition-colors duration-300">
        <Sidebar page={page} onNavigate={setPage} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar title={meta.title} subtitle={meta.subtitle} user={user} onSignOut={onSignOut} />
          <main className="min-h-0 flex-1 overflow-hidden bg-[#071521] light:bg-[#faf8f5] transition-colors duration-300">
            {page === "dashboard" && <Dashboard />}
            {page === "map" && <MapPage onNavigate={setPage} />}
            {page === "routes" && <Routes />}
            {page === "iceberg" && <IcebergPrediction />}
            {page === "seaice" && <SeaIcePrediction />}
            {page === "environmental" && <Environmental />}
            {page === "hazards" && <Hazards />}
            {page === "rerouting" && <Rerouting />}
            {page === "whatif" && <WhatIf />}
            {page === "reports" && <Reports />}
            {page === "help" && <Help onNavigate={setPage} />}
            {page === "contact" && <Contact />}
            {page === "settings" && <Settings />}
          </main>
        </div>
      </div>
    </NavProvider>
  );
}
