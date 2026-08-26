import { useState } from "react";
import { AntarcticPolarMap } from "./AntarcticPolarMap";
import { useNav } from "../../state";
import { vessel } from "../../data/mock";
import { HORIZON_FRACTION, type Horizon } from "./mapData";
import { cx } from "../ui/primitives";

const HORIZONS: Horizon[] = ["0h", "6h", "12h", "24h", "48h", "72h"];

export function AntarcticMap({ onNavigate }: { onNavigate?: (target: "iceberg" | "routes") => void }) {
  const nav = useNav();
  const [horizon, setHorizon] = useState<Horizon>("0h");

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Top operational controls */}
      <div className="absolute right-40 top-2.5 z-20 hidden xl:flex items-center gap-2 rounded-md border border-[#1d445c]/80 bg-[#071521]/90 light:border-[#d8d0c2] light:bg-[#ffffff]/90 px-2 py-0.5 backdrop-blur shadow-md">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">
          Horizon:
        </span>
        <div className="flex items-center gap-0.5">
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={cx(
                "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase transition-colors",
                horizon === h
                  ? "bg-[#55d6e8] text-[#071521] light:bg-[#0f768e] light:text-white shadow-sm"
                  : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]",
              )}
            >
              {h === "0h" ? "NOW" : `+${h}`}
            </button>
          ))}
        </div>
      </div>

      <AntarcticPolarMap
        routes={nav.routes}
        selectedRouteId={nav.selectedRouteId}
        onSelectRoute={(id) => {
          nav.setSelectedRoute(id);
          onNavigate?.("routes");
        }}
        icebergs={nav.icebergs}
        selectedIcebergId={nav.selectedIcebergId}
        onSelectIceberg={(id) => {
          nav.setSelectedIceberg(id);
          onNavigate?.("iceberg");
        }}
        horizonFraction={HORIZON_FRACTION[horizon]}
        vessel={{
          name: vessel.name,
          position: { lat: vessel.position.lat, lon: vessel.position.lon },
          headingDeg: vessel.headingDeg,
          speedKn: vessel.speedKn,
          status: vessel.status,
        }}
        showMaximize={true}
        className="h-full w-full"
      />
    </div>
  );
}

export default AntarcticMap;
