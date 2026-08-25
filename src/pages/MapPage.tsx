import { useState } from "react";
import { Globe2, Map as MapIcon, Compass } from "lucide-react";
import { AntarcticMap } from "../components/map/AntarcticMap";
import { Globe } from "../components/globe/Globe";
import type { PageId } from "../components/Sidebar";
import { Card, cx } from "../components/ui/primitives";
import { vessel } from "../data/mock";
import { useNav } from "../state";

export function MapPage({ onNavigate }: { onNavigate?: (p: PageId) => void }) {
  const nav = useNav();
  const [viewMode, setViewMode] = useState<"map" | "globe">("map");

  return (
    <div className="flex h-full flex-col gap-2.5 p-3">
      {/* Top Bar with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1d445c]/60 bg-[#0c2333]/90 light:border-[#e2d8c7] light:bg-[#f8f5ee] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#55d6e8]/15 text-[#55d6e8] light:bg-[#0f768e]/15 light:text-[#0f768e]">
            <Compass size={16} />
          </div>
          <div>
            <h1 className="text-[13px] font-bold text-[#eaf6f8] light:text-[#0d2433]">
              Operational Antarctic Polar Chart
            </h1>
            <p className="font-mono text-[10px] text-[#91aeb9] light:text-[#5a7686]">
              Real-time AIS, ice dynamics, Great-Circle corridors & multi-layer radar feeds
            </p>
          </div>
        </div>

        <div className="flex items-center rounded-md border border-[#1d445c]/60 bg-[#071521]/80 light:border-[#d8d0c2] light:bg-[#eee8dc] p-0.5">
          <button
            onClick={() => setViewMode("map")}
            className={cx(
              "flex items-center gap-1.5 rounded px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
              viewMode === "map"
                ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white shadow-sm"
                : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
            )}
          >
            <MapIcon size={13} />
            Polar Chart (2D)
          </button>
          <button
            onClick={() => setViewMode("globe")}
            className={cx(
              "flex items-center gap-1.5 rounded px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
              viewMode === "globe"
                ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white shadow-sm"
                : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
            )}
          >
            <Globe2 size={13} />
            3D Earth Globe
          </button>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-xl bg-[#050d17] light:bg-[#ede6da] shadow-lg transition-colors border border-[#1d445c]/60 light:border-[#e2d8c7]">
        {viewMode === "map" ? (
          <AntarcticMap
            onNavigate={(t) => {
              if (t === "iceberg") onNavigate?.("iceberg");
              if (t === "routes") onNavigate?.("routes");
            }}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
}
