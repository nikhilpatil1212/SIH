import { Globe } from "../components/globe/Globe";
import type { PageId } from "../components/Sidebar";
import { vessel } from "../data/mock";
import { useNav } from "../state";

export function MapPage({ onNavigate }: { onNavigate?: (p: PageId) => void }) {
  void onNavigate;
  const nav = useNav();
  return (
    <div className="h-full p-3">
      <div className="h-full overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors">
        <Globe
          routes={nav.routes}
          selectedRouteId={nav.selectedRouteId}
          showRoutes
          vessel={vessel}
          icebergs={nav.icebergs}
          showTrajectories
          selectedIcebergId={nav.selectedIcebergId}
          onSelectIceberg={nav.setSelectedIceberg}
        />
      </div>
    </div>
  );
}
