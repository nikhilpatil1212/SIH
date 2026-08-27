import { SlidersHorizontal } from "lucide-react";
import { AntarcticMap } from "../components/map/AntarcticMap";
import { RISK_COLORS, cx } from "../components/ui/primitives";
import { useNav } from "../state";
import type { PageId } from "../components/Sidebar";

export function MapPage({ onNavigate }: { onNavigate?: (p: PageId) => void }) {
  const nav = useNav();
  const selectedRoute = nav.routes.find((r) => r.id === nav.selectedRouteId) || nav.routes[0];

  return (
    <div className="flex h-full flex-col gap-2 p-3 overflow-hidden">
      {/* Active Route Telemetry & Corridor Selector HUD */}
      {selectedRoute && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#1d445c]/80 bg-[#071927]/95 light:border-[#e2d8c7] light:bg-[#f8f5ee] px-4 py-2 shadow-md backdrop-blur">
          {/* Selected Route Info */}
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: selectedRoute.color, color: selectedRoute.color }} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-bold text-[#eaf6f8] light:text-[#0d2433]">
                  {selectedRoute.name}
                </span>
                {selectedRoute.id === nav.recommendedRouteId && (
                  <span className="rounded bg-[#10b981]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#10b981]">
                    RECOMMENDED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10.5px] font-mono text-[#91aeb9] light:text-[#5a7686]">
                <span>Distance: <b className="text-[#eaf6f8] light:text-[#0d2433]">{selectedRoute.distanceNm.toLocaleString()} nm</b></span>
                <span>•</span>
                <span>Voyage ETA: <b className="text-[#55d6e8] light:text-[#0f768e]">{selectedRoute.eta}</b></span>
                <span>•</span>
                <span>Fuel: <b className="text-[#eaf6f8] light:text-[#0d2433]">{selectedRoute.fuelT} t</b></span>
                <span>•</span>
                <span>Risk: <b style={{ color: RISK_COLORS[selectedRoute.riskLevel] }}>{selectedRoute.riskScore}/100 ({selectedRoute.riskLevel.toUpperCase()})</b></span>
              </div>
            </div>
          </div>

          {/* Quick Corridor Selection Buttons & Plan Passage Link */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#050e18] light:bg-[#eae2d4] p-1 rounded-lg border border-[#1d445c]/60 light:border-[#d8d0c2]">
              {nav.routes.map((r) => {
                const isSel = r.id === nav.selectedRouteId;
                return (
                  <button
                    key={r.id}
                    onClick={() => nav.setSelectedRoute(r.id)}
                    className={cx(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] font-bold transition-all cursor-pointer",
                      isSel
                        ? "bg-[#55d6e8] text-[#071521] shadow-sm"
                        : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]"
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                    <span>{r.name.replace(/Route\s+([A-Z]).*/i, "Route $1")}</span>
                  </button>
                );
              })}
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate("routes")}
                className="flex items-center gap-1.5 rounded-lg border border-[#55d6e8]/60 bg-[#55d6e8]/10 hover:bg-[#55d6e8]/20 px-3 py-1.5 font-mono text-[10.5px] font-bold text-[#55d6e8] transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={12} />
                <span>Passage Plan</span>
              </button>
            )}
          </div>
        </div>
      )}

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

