import { Compass, Map as MapIcon } from "lucide-react";
import { AntarcticMap } from "../components/map/AntarcticMap";
import type { PageId } from "../components/Sidebar";

export function MapPage({ onNavigate }: { onNavigate?: (p: PageId) => void }) {
  return (
    <div className="flex h-full flex-col gap-2.5 p-3">
      {/* Main Map View Area */}
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors border border-[#1d445c]/60 light:border-[#e2d8c7]">
        <AntarcticMap
          onNavigate={(t) => {
            if (t === "iceberg") onNavigate?.("iceberg");
            if (t === "routes") onNavigate?.("routes");
          }}
        />
      </div>
    </div>
  );
}

export default MapPage;
