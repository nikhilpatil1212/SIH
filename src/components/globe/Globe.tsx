import { AntarcticPolarMap } from "../map/AntarcticPolarMap";
import type { Iceberg, Route, Vessel } from "../../data/types";

export interface SeaIceRegionShape {
  region: string;
  polygon: { lat: number; lon: number }[];
  concentration: number;
}

export interface GlobeProps {
  routes?: Route[];
  selectedRouteId?: string;
  showRoutes?: boolean;
  vessel?: Vessel;
  icebergs?: Iceberg[];
  showTrajectories?: boolean;
  selectedIcebergId?: string | null;
  onSelectIceberg?: (id: string) => void;
  horizonFraction?: number;
  seaIce?: SeaIceRegionShape[];
  autoRotate?: boolean;
  onSelectRegion?: (region: string) => void;
}

/**
 * 2D Antarctic Polar Map wrapper replacing legacy 3D Globe.
 */
export function Globe({
  routes,
  selectedRouteId,
  showRoutes = true,
  vessel,
  icebergs,
  selectedIcebergId,
  onSelectIceberg,
  horizonFraction,
  seaIce,
  onSelectRegion,
}: GlobeProps) {
  return (
    <AntarcticPolarMap
      routes={showRoutes ? routes : undefined}
      selectedRouteId={selectedRouteId}
      vessel={
        vessel
          ? {
              name: vessel.name,
              position: { lat: vessel.position.lat, lon: vessel.position.lon },
              headingDeg: vessel.headingDeg,
              speedKn: vessel.speedKn,
              status: vessel.status,
            }
          : undefined
      }
      icebergs={icebergs}
      selectedIcebergId={selectedIcebergId}
      onSelectIceberg={onSelectIceberg}
      horizonFraction={horizonFraction}
      seaIceHeat={seaIce}
      onSelectRegion={onSelectRegion}
      className="h-full w-full"
    />
  );
}

export default Globe;
