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
  dashboard: { title: "Dhruv Sarthi · Mission Console", subtitle: "AI-powered iceberg trajectories, sea-ice dynamics & route risk support" },
  map: { title: "Whole-World Polar Navigation Map", subtitle: "Interactive global maritime visualization and corridor safety analysis" },
  routes: { title: "Passage Planning & Route Synthesis", subtitle: "AI-optimized Antarctic routes: fastest, safest & fuel-optimal" },
  iceberg: { title: "Iceberg Drift & Collision Prediction", subtitle: "Physics-informed AI trajectory models & distance monitoring" },
  seaice: { title: "Sea-Ice Concentration Dynamics", subtitle: "High-resolution satellite observation & compression risk estimation" },
  environmental: { title: "Environmental & Metocean Intelligence", subtitle: "ERA5 & ECMWF wind fields, waves, surface currents & SST" },
  hazards: { title: "Navigational Hazard Alert Register", subtitle: "Active & predicted ice threats, extreme weather & shallow bathymetry" },
  rerouting: { title: "Dynamic Tactical Re-Routing", subtitle: "Trigger automated corridor re-evaluation on severe ice anomalies" },
  whatif: { title: "What-If Scenario Simulator", subtitle: "Stress-test passage plans under simulated severe weather and speed changes" },
  reports: { title: "Mission Reports & Voyage Summary", subtitle: "Compliance, telemetry logs & operational debrief export" },
  help: { title: "Help & Operational Guide", subtitle: "Complete documentation for polar navigation and AI capabilities" },
  contact: { title: "Contact Dhruv Sarthi Operations", subtitle: "Reach the NCPOR and Ministry of Earth Sciences polar navigation team" },
  settings: { title: "Platform Settings & Theme", subtitle: "Telemetry refresh intervals, unit preferences & display customization" },
};

import { AlertAdminModal } from "./components/alerts/AlertAdminModal";

export function OperationalApp({
  user,
  onSignOut,
  onOpenAdmin,
}: {
  user: User | null;
  onSignOut: () => void;
  onOpenAdmin?: () => void;
}) {
  const [page, setPage] = useState<PageId>("dashboard");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const meta = META[page];

  return (
    <div className="flex h-full min-h-0 w-full bg-[#071521] light:bg-[#faf8f5] text-[#eaf6f8] light:text-[#0d2433] transition-colors duration-300">
      <Sidebar page={page} onNavigate={setPage} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          user={user}
          onSignOut={onSignOut}
          onAlertAdmin={() => setShowAlertModal(true)}
          onOpenAdmin={onOpenAdmin}
        />
        <main className="min-h-0 flex-1 overflow-hidden bg-[#071521] light:bg-[#faf8f5] transition-colors duration-300">
          {page === "dashboard" && <Dashboard onNavigate={setPage} />}
          {page === "map" && <MapPage onNavigate={setPage} />}
          {page === "routes" && <Routes onNavigate={setPage} />}
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

      {showAlertModal && (
        <AlertAdminModal
          user={user}
          onClose={() => setShowAlertModal(false)}
        />
      )}
    </div>
  );
}
