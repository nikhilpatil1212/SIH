import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Compass,
  Droplets,
  Eye,
  Gauge,
  RotateCcw,
  Snowflake,
  Thermometer,
  Waves,
  Wind,
  Search,
  Activity,
  Droplet,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { Card } from "../components/ui/primitives";
import { DemoTag } from "../components/ui/phase2";
import apiClient from "../api/client";
import { useTheme } from "../theme";
import { useRealtime } from "../hooks/useRealtime";

// Exact 15 Antarctic Sectors matching Sea-Ice Prediction and backend spatial grid loader
export const ANTARCTIC_SECTORS_LIST = [
  "Weddell Sea",
  "Ross Sea",
  "Amundsen Sea",
  "Bellingshausen Sea",
  "Scotia Sea",
  "Prydz Bay",
  "Davis Sea",
  "Cooperation Sea",
  "Mawson Sea",
  "Cosmonaut Sea",
  "Somov Sea",
  "Riiser-Larsen Sea",
  "Lazarev Sea",
  "King Haakon VII Sea",
  "Antarctic Peninsula",
];

interface SectorEnvVariable {
  value: number | string | null;
  unit?: string;
  source_dataset?: string;
  timestamp?: string | null;
  quality_flag?: string;
}

interface SectorEnvData {
  region: string;
  centroid?: { lat: number; lon: number };
  status?: string;
  last_updated?: string;
  variables: {
    sea_ice_concentration?: SectorEnvVariable;
    air_temperature?: SectorEnvVariable;
    surface_pressure?: SectorEnvVariable;
    sea_surface_temperature?: SectorEnvVariable;
    wind_speed?: SectorEnvVariable;
    wind_direction?: SectorEnvVariable;
    ocean_current_speed?: SectorEnvVariable;
    ocean_current_direction?: SectorEnvVariable;
    salinity?: SectorEnvVariable;
    wave_height?: SectorEnvVariable;
    visibility?: SectorEnvVariable;
    relative_humidity?: SectorEnvVariable;
  };
}

interface SeaIceRegionItem {
  region: string;
  current_sic: number;
  sic_min: number;
  sic_max: number;
  spatial_coverage?: number;
  valid_grid_cells?: number;
  forecast?: Record<string, number>;
  change_7d?: number;
  confidence?: number;
  risk?: string;
  data_source?: string;
  last_updated?: string;
}

function formatUtcTimestamp(isoStr?: string | null): string {
  if (!isoStr) return "Data unavailable";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = d.getUTCDate();
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const mins = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${mins} UTC`;
  } catch {
    return isoStr;
  }
}

function degreesToCompass(deg: number | null | undefined): string {
  if (deg == null || isNaN(deg)) return "";
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WSW", "NW", "NNW"];
  const val = Math.floor((deg / 22.5) + 0.5) % 16;
  return directions[val] || "";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  provenance,
  isAvailable,
  highlightColor,
}: {
  icon: any;
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  sub?: string | null;
  provenance?: string | null;
  isAvailable: boolean;
  highlightColor?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`relative flex flex-col justify-between rounded-lg border p-3.5 transition-colors shadow-sm ${
        isDark
          ? "border-[#1d445c]/70 bg-[#102838]/80 text-[#eaf6f8]"
          : "border-[#dfd8cc] bg-white text-[#0d2433]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-md ${
              isDark ? "bg-[#071521] text-[#55d6e8]" : "bg-[#f2ece0] text-[#0f768e]"
            }`}
          >
            <Icon size={15} />
          </div>
          <span
            className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${
              isDark ? "text-[#91aeb9]" : "text-[#5a7686]"
            }`}
          >
            {label}
          </span>
        </div>
        {isAvailable ? (
          <span className="inline-flex items-center gap-1 rounded bg-[#10b981]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#10b981]">
            LIVE
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${
              isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-100 text-amber-700"
            }`}
          >
            UNAVAILABLE
          </span>
        )}
      </div>

      <div className="my-2.5">
        {isAvailable && value != null ? (
          <div className="flex items-baseline gap-1.5">
            <span
              className="font-mono text-[20px] font-bold tracking-tight"
              style={{ color: highlightColor || (isDark ? "#eaf6f8" : "#0d2433") }}
            >
              {value}
            </span>
            {unit && (
              <span
                className={`font-mono text-[12px] font-semibold ${
                  isDark ? "text-[#8ccfe0]" : "text-[#4a6878]"
                }`}
              >
                {unit}
              </span>
            )}
          </div>
        ) : (
          <div className="font-mono text-[13px] font-semibold italic text-amber-500/90 light:text-amber-700">
            Data unavailable
          </div>
        )}

        {sub && isAvailable && (
          <div className={`mt-0.5 font-mono text-[11px] ${isDark ? "text-[#91aeb9]" : "text-[#5a7686]"}`}>
            {sub}
          </div>
        )}
      </div>

      <div
        className={`border-t pt-2 text-[9.5px] truncate font-mono ${
          isDark ? "border-[#1d445c]/40 text-[#608292]" : "border-[#e8e0d2] text-[#7a93a1]"
        }`}
        title={provenance || "Standard Environmental Observation Feed"}
      >
        {provenance ? `Src: ${provenance}` : "Standard Scientific Feed"}
      </div>
    </div>
  );
}

export function Environmental() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [selectedSector, setSelectedSector] = useState<string>("Weddell Sea");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [envRegions, setEnvRegions] = useState<SectorEnvData[]>([]);
  const [seaIceRegions, setSeaIceRegions] = useState<SeaIceRegionItem[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchEnvironmentalData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [envData, siTable] = await Promise.all([
        apiClient.getRegionalEnvironment(),
        apiClient.seaIce.getTable().catch(() => null),
      ]);

      if (Array.isArray(envData)) {
        setEnvRegions(envData);
      }
      if (siTable && Array.isArray(siTable.regions)) {
        setSeaIceRegions(siTable.regions);
      }
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load regional environmental data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvironmentalData();
    // Auto-refresh environmental telemetry every 60s
    const interval = setInterval(() => {
      fetchEnvironmentalData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchEnvironmentalData]);

  // Listen to WebSocket events for real-time updates
  useRealtime((event) => {
    if (event.type === "SEA_ICE_UPDATED" && event.data?.regions) {
      setSeaIceRegions(event.data.regions);
      setLastRefreshedAt(new Date());
    }
  });

  const filteredSectors = useMemo(() => {
    return ANTARCTIC_SECTORS_LIST.filter((sec) =>
      sec.toLowerCase().includes(searchTerm.toLowerCase().trim()),
    );
  }, [searchTerm]);

  const activeEnvRecord = useMemo(() => {
    return envRegions.find((e) => e.region.toLowerCase() === selectedSector.toLowerCase());
  }, [envRegions, selectedSector]);

  const activeSeaIceRecord = useMemo(() => {
    return seaIceRegions.find((r) => r.region.toLowerCase() === selectedSector.toLowerCase());
  }, [seaIceRegions, selectedSector]);

  // Extract genuine environmental variables
  const sicVar = activeEnvRecord?.variables?.sea_ice_concentration;
  const sicVal = sicVar?.value != null ? Number(sicVar.value) : (activeSeaIceRecord?.current_sic != null ? activeSeaIceRecord.current_sic : null);
  const sicSource = sicVar?.source_dataset || activeSeaIceRecord?.data_source || "University of Bremen / JAXA AMSR2 ASI 6.25km";

  const airTempVar = activeEnvRecord?.variables?.air_temperature;
  const airTempVal = airTempVar?.value != null ? Number(airTempVar.value) : null;

  const pressVar = activeEnvRecord?.variables?.surface_pressure;
  const pressVal = pressVar?.value != null ? Number(pressVar.value) : null;

  const sstVar = activeEnvRecord?.variables?.sea_surface_temperature;
  const sstVal = sstVar?.value != null ? Number(sstVar.value) : null;
  const sstSource = sstVar?.source_dataset || "NOAA OISST v2.1 High-Resolution Dataset";

  const windSpdVar = activeEnvRecord?.variables?.wind_speed;
  const windDirVar = activeEnvRecord?.variables?.wind_direction;
  const windSpdVal = windSpdVar?.value != null ? Number(windSpdVar.value) : null;
  const windDirVal = windDirVar?.value != null ? Number(windDirVar.value) : null;
  const windDirCompass = windDirVal != null ? degreesToCompass(windDirVal) : null;
  const windSource = windSpdVar?.source_dataset || "ECMWF ERA5 / 10m Vector Field";

  const curSpdVar = activeEnvRecord?.variables?.ocean_current_speed;
  const curDirVar = activeEnvRecord?.variables?.ocean_current_direction;
  const curSpdVal = curSpdVar?.value != null ? Number(curSpdVar.value) : null;
  const curDirVal = curDirVar?.value != null ? Number(curDirVar.value) : null;
  const curDirCompass = curDirVal != null ? degreesToCompass(curDirVal) : null;
  const currentSource = curSpdVar?.source_dataset || "Copernicus GLORYS12V1 Ocean Reanalysis";

  const waveVar = activeEnvRecord?.variables?.wave_height;
  const waveVal = waveVar?.value != null ? Number(waveVar.value) : null;

  const visVar = activeEnvRecord?.variables?.visibility;
  const visVal = visVar?.value != null ? Number(visVar.value) : null;

  const humVar = activeEnvRecord?.variables?.relative_humidity;
  const humVal = humVar?.value != null ? Number(humVar.value) : null;

  const salVar = activeEnvRecord?.variables?.salinity;
  const salVal = salVar?.value != null ? Number(salVar.value) : null;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1d445c]/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-bold tracking-tight text-[#eaf6f8] light:text-[#0d2433]">
              Antarctic Sea-Wise Environmental Intelligence
            </h1>
            <DemoTag label="15 REGIONAL SECTORS" />
          </div>
          <p className="text-[12px] text-[#91aeb9] light:text-[#5a7686]">
            Real-time metocean, atmospheric & satellite sea-ice conditions with full scientific provenance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#91aeb9] light:text-[#5a7686]">
            <Clock size={13} />
            <span>Synced: {lastRefreshedAt.toLocaleTimeString()}</span>
          </div>
          <button
            onClick={() => fetchEnvironmentalData(true)}
            disabled={refreshing}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
              isDark
                ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8] hover:bg-[#132f40]"
                : "border-[#dfd8cc] bg-white text-[#0d2433] hover:bg-[#f2ebe0]"
            }`}
          >
            <RotateCcw size={13} className={refreshing ? "animate-spin text-[#55d6e8]" : ""} />
            <span>{refreshing ? "Syncing..." : "Sync Telemetry"}</span>
          </button>
        </div>
      </div>

      {/* 15 Antarctic Sector Quick-Selection Bar */}
      <div
        className={`rounded-lg border p-3 ${
          isDark ? "border-[#1d445c]/70 bg-[#0d2433]/70" : "border-[#e2d8c7] bg-[#fbf9f4]"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass size={14} className={isDark ? "text-[#55d6e8]" : "text-[#0f768e]"} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#91aeb9] light:text-[#4a6878]">
              Select Antarctic Marine Sector (15 Canonical Seas)
            </span>
          </div>

          <div className="relative w-48 sm:w-64">
            <Search size={13} className="absolute left-2.5 top-2 text-[#91aeb9]" />
            <input
              type="text"
              placeholder="Search sector..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className={`w-full rounded-md border py-1 pl-8 pr-2.5 text-[12px] outline-none transition-colors ${
                isDark
                  ? "border-[#1d445c] bg-[#071521] text-[#eaf6f8] placeholder-[#5f7d89] focus:border-[#55d6e8]"
                  : "border-[#d8d0c2] bg-white text-[#0d2433] placeholder-[#8a9fa8] focus:border-[#0f768e]"
              }`}
            />
          </div>
        </div>

        {/* Sector Chips */}
        <div className="flex flex-wrap gap-1.5">
          {filteredSectors.map((sectorName) => {
            const isSelected = selectedSector.toLowerCase() === sectorName.toLowerCase();
            const sectorSI = seaIceRegions.find((r) => r.region.toLowerCase() === sectorName.toLowerCase());
            const sic = sectorSI?.current_sic;

            return (
              <button
                key={sectorName}
                onClick={() => setSelectedSector(sectorName)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#55d6e8] text-[#071521] shadow-md font-bold scale-[1.02]"
                    : isDark
                    ? "bg-[#102838] text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8] border border-[#1d445c]/50"
                    : "bg-white text-[#4a6878] hover:bg-[#f2ede2] hover:text-[#0d2433] border border-[#dfd8cc]"
                }`}
              >
                <span>{sectorName}</span>
                {sic != null && (
                  <span
                    className={`rounded px-1 py-0.2 text-[9px] font-mono ${
                      isSelected
                        ? "bg-[#071521]/20 text-[#071521] font-bold"
                        : "bg-[#071521]/40 text-[#55d6e8] light:bg-[#e2d8c7] light:text-[#0f768e]"
                    }`}
                  >
                    {sic}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Sector Primary Real-Time Weather & Environmental Dashboard */}
      <div
        className={`rounded-xl border p-4 shadow-sm transition-colors ${
          isDark ? "border-[#1d445c] bg-[#071521]" : "border-[#e2d8c7] bg-white"
        }`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1d445c]/40 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#55d6e8] light:text-[#0f768e]">
                Active Sector Focus
              </span>
              {activeSeaIceRecord?.risk && (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    activeSeaIceRecord.risk === "HIGH"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : activeSeaIceRecord.risk === "MODERATE"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {activeSeaIceRecord.risk} ICE RISK
                </span>
              )}
            </div>
            <h2 className="text-[22px] font-bold tracking-tight text-[#eaf6f8] light:text-[#0d2433]">
              {selectedSector}
            </h2>
            {activeEnvRecord?.centroid && (
              <span className="font-mono text-[11px] text-[#91aeb9] light:text-[#5a7686]">
                Centroid: {activeEnvRecord.centroid.lat.toFixed(2)}°S, {activeEnvRecord.centroid.lon.toFixed(2)}°
                {activeEnvRecord.centroid.lon >= 0 ? "E" : "W"}
              </span>
            )}
          </div>

          <div className="text-right font-mono text-[11px]">
            <div className="text-[#91aeb9] light:text-[#5a7686]">Observation Timestamp</div>
            <div className="font-bold text-[#eaf6f8] light:text-[#0d2433]">
              {formatUtcTimestamp(activeEnvRecord?.last_updated || activeSeaIceRecord?.last_updated)}
            </div>
          </div>
        </div>

        {/* Real-Time Parameter Metric Cards Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          <MetricCard
            icon={Snowflake}
            label="Sea-Ice Concentration"
            value={sicVal != null ? `${sicVal}%` : null}
            isAvailable={sicVal != null}
            sub={
              activeSeaIceRecord
                ? `Observed Range: ${activeSeaIceRecord.sic_min}% – ${activeSeaIceRecord.sic_max}%`
                : null
            }
            provenance={sicSource}
            highlightColor="#55d6e8"
          />

          <MetricCard
            icon={Thermometer}
            label="Air Temperature"
            value={airTempVal != null ? airTempVal : null}
            unit="°C"
            isAvailable={airTempVal != null}
            sub={airTempVal != null ? (airTempVal < -15 ? "Severe Polar Freezing" : "Sub-Zero Ambient") : null}
            provenance={airTempVar?.source_dataset || "ECMWF Open Data / Synoptic Antarctic Network"}
            highlightColor="#8ccfe0"
          />

          <MetricCard
            icon={Gauge}
            label="Surface Pressure"
            value={pressVal != null ? pressVal : null}
            unit="hPa"
            isAvailable={pressVal != null}
            sub={pressVal != null ? (pressVal < 980 ? "Polar Low / Cyclone Depression" : "Standard Polar Barometric") : null}
            provenance={pressVar?.source_dataset || "ECMWF Surface Pressure Analysis"}
            highlightColor="#a78bfa"
          />

          <MetricCard
            icon={Droplets}
            label="Sea Surface Temp (SST)"
            value={sstVal != null ? sstVal : null}
            unit="°C"
            isAvailable={sstVal != null}
            sub={sstVal != null ? (sstVal < 0 ? "Sub-zero polar sea water" : "Open ocean temperature") : null}
            provenance={sstSource}
            highlightColor="#38bdf8"
          />

          <MetricCard
            icon={Wind}
            label="Wind Speed & Vector"
            value={windSpdVal != null ? windSpdVal : null}
            unit="m/s"
            isAvailable={windSpdVal != null}
            sub={
              windDirVal != null
                ? `${windDirVal}° (${windDirCompass}) · ${((windSpdVal || 0) * 1.94384).toFixed(1)} kn`
                : null
            }
            provenance={windSource}
            highlightColor="#10b981"
          />

          <MetricCard
            icon={Activity}
            label="Ocean Current Velocity"
            value={curSpdVal != null ? curSpdVal : null}
            unit="m/s"
            isAvailable={curSpdVal != null}
            sub={
              curDirVal != null
                ? `${curDirVal}° (${curDirCompass}) · ${((curSpdVal || 0) * 1.94384).toFixed(2)} kn drift`
                : null
            }
            provenance={currentSource}
            highlightColor="#f59e0b"
          />

          <MetricCard
            icon={Waves}
            label="Significant Wave Height"
            value={waveVal != null ? waveVal : null}
            unit="m"
            isAvailable={waveVal != null}
            sub={waveVal != null ? (waveVal > 3.0 ? "Heavy Southern Ocean Swell" : "Moderate Swell") : "Pack-Ice Dampened"}
            provenance={waveVar?.source_dataset || "Copernicus Marine / ECMWF Wave Model"}
          />

          <MetricCard
            icon={Eye}
            label="Visibility"
            value={visVal != null ? visVal : null}
            unit="km"
            isAvailable={visVal != null}
            sub={visVal != null ? (visVal < 2.0 ? "Severe Polar Fog / Whiteout" : "Clear Polar Horizon") : null}
            provenance={visVar?.source_dataset || "Antarctic Synoptic Weather Stations (AWS)"}
          />

          <MetricCard
            icon={Droplet}
            label="Relative Humidity"
            value={humVal != null ? humVal : null}
            unit="%"
            isAvailable={humVal != null}
            provenance={humVar?.source_dataset || "ECMWF 2m Relative Humidity Analysis"}
          />

          <MetricCard
            icon={Compass}
            label="Salinity"
            value={salVal != null ? salVal : null}
            unit="PSU"
            isAvailable={salVal != null}
            provenance={salVar?.source_dataset || "Copernicus GLORYS12V1 Ocean Reanalysis"}
          />
        </div>

        {/* Multi-Horizon Sea-Ice Forecast for Selected Sector */}
        {activeSeaIceRecord?.forecast && (
          <div
            className={`mt-4 rounded-lg border p-3.5 ${
              isDark ? "border-[#1d445c]/60 bg-[#0d2433]" : "border-[#dfd8cc] bg-[#f8f5ee]"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#91aeb9] light:text-[#4a6878]">
                {selectedSector} · Multi-Horizon Sea-Ice ML Forecast (AMSR2 + Historical)
              </span>
              {activeSeaIceRecord.change_7d != null && (
                <span
                  className={`font-mono text-[11px] font-bold ${
                    activeSeaIceRecord.change_7d > 0
                      ? "text-red-400"
                      : activeSeaIceRecord.change_7d < 0
                      ? "text-emerald-400"
                      : "text-[#91aeb9]"
                  }`}
                >
                  7-Day Trend: {activeSeaIceRecord.change_7d > 0 ? "+" : ""}
                  {activeSeaIceRecord.change_7d}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 font-mono text-center">
              {Object.entries(activeSeaIceRecord.forecast).map(([horizonKey, horizonVal]) => (
                <div
                  key={horizonKey}
                  className={`rounded border p-2 ${
                    isDark ? "border-[#1d445c]/50 bg-[#132f40]/80" : "border-[#e2d8c7] bg-white"
                  }`}
                >
                  <div className="text-[10px] uppercase text-[#91aeb9] light:text-[#5a7686]">
                    +{horizonKey.replace("f", "")}
                  </div>
                  <div className="text-[16px] font-bold text-[#55d6e8] light:text-[#0f768e]">
                    {horizonVal != null ? `${horizonVal}%` : "Data unavailable"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 15 Antarctic Seas Complete Comparative Real-Time Register */}
      <Card title="All 15 Antarctic Marine Sectors · Complete Real-Time Environmental Register">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead
              className={`border-b font-mono text-[10px] uppercase tracking-wider ${
                isDark
                  ? "border-[#1d445c]/60 bg-[#071521] text-[#91aeb9]"
                  : "border-[#e2d8c7] bg-[#f2ece0] text-[#5a7686]"
              }`}
            >
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">Antarctic Sector</th>
                <th className="px-3 py-2.5 font-semibold text-right">Sea-Ice (AMSR2)</th>
                <th className="px-3 py-2.5 font-semibold text-right">Air Temp (°C)</th>
                <th className="px-3 py-2.5 font-semibold text-right">Pressure (hPa)</th>
                <th className="px-3 py-2.5 font-semibold text-right">SST (°C)</th>
                <th className="px-3 py-2.5 font-semibold text-right">Wind (m/s)</th>
                <th className="px-3 py-2.5 font-semibold text-right">Current (m/s)</th>
                <th className="px-3 py-2.5 font-semibold text-right">Waves (m)</th>
                <th className="px-3 py-2.5 font-semibold text-right">Visibility (km)</th>
                <th className="px-3 py-2.5 font-semibold text-center">Risk</th>
                <th className="px-3.5 py-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d445c]/30 light:divide-[#e8e0d2] font-mono">
              {ANTARCTIC_SECTORS_LIST.map((secName) => {
                const envRec = envRegions.find((e) => e.region.toLowerCase() === secName.toLowerCase());
                const siRec = seaIceRegions.find((r) => r.region.toLowerCase() === secName.toLowerCase());

                const sic = envRec?.variables?.sea_ice_concentration?.value != null
                  ? Number(envRec.variables.sea_ice_concentration.value)
                  : siRec?.current_sic;

                const airT = envRec?.variables?.air_temperature?.value != null
                  ? Number(envRec.variables.air_temperature.value)
                  : null;

                const press = envRec?.variables?.surface_pressure?.value != null
                  ? Number(envRec.variables.surface_pressure.value)
                  : null;

                const sst = envRec?.variables?.sea_surface_temperature?.value != null
                  ? Number(envRec.variables.sea_surface_temperature.value)
                  : null;

                const wSpeed = envRec?.variables?.wind_speed?.value != null
                  ? Number(envRec.variables.wind_speed.value)
                  : null;

                const cSpeed = envRec?.variables?.ocean_current_speed?.value != null
                  ? Number(envRec.variables.ocean_current_speed.value)
                  : null;

                const waveH = envRec?.variables?.wave_height?.value != null
                  ? Number(envRec.variables.wave_height.value)
                  : null;

                const visK = envRec?.variables?.visibility?.value != null
                  ? Number(envRec.variables.visibility.value)
                  : null;

                const risk = siRec?.risk || "LOW";
                const isSelected = selectedSector.toLowerCase() === secName.toLowerCase();

                return (
                  <tr
                    key={secName}
                    className={`transition-colors ${
                      isSelected
                        ? isDark
                          ? "bg-[#55d6e8]/10 font-semibold"
                          : "bg-[#0f768e]/10 font-semibold"
                        : isDark
                        ? "hover:bg-[#0d2433]"
                        : "hover:bg-[#faf6ee]"
                    }`}
                  >
                    <td className="px-3.5 py-2.5 font-sans font-medium text-[#eaf6f8] light:text-[#0d2433]">
                      {secName}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-[#55d6e8] light:text-[#0f768e]">
                      {sic != null ? `${sic}%` : <span className="text-amber-500/80 font-normal italic text-[11px]">Data unavailable</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {airT != null ? `${airT}°C` : <span className="text-amber-500/80 font-normal italic text-[11px]">Data unavailable</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#91aeb9] light:text-[#5a7686]">
                      {press != null ? `${press}` : <span className="text-amber-500/80 font-normal italic text-[11px]">Data unavailable</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {sst != null ? `${sst}°C` : <span className="text-amber-500/80 font-normal italic text-[11px]">Data unavailable</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {wSpeed != null ? `${wSpeed} m/s` : <span className="text-amber-500/80 font-normal italic text-[11px]">Data unavailable</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {cSpeed != null ? `${cSpeed} m/s` : <span className="text-amber-500/80 font-normal italic text-[11px]">Data unavailable</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {waveH != null ? `${waveH} m` : <span className="text-amber-500/80 font-normal italic text-[11px]">Data unavailable</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {visK != null ? `${visK} km` : <span className="text-amber-500/80 font-normal italic text-[11px]">Data unavailable</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          risk === "HIGH"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : risk === "MODERATE"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        }`}
                      >
                        {risk}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        onClick={() => setSelectedSector(secName)}
                        className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#55d6e8] text-[#071521]"
                            : isDark
                            ? "bg-[#132f40] text-[#91aeb9] hover:text-[#eaf6f8]"
                            : "bg-[#e2d8c7] text-[#0d2433] hover:bg-[#d5caba]"
                        }`}
                      >
                        {isSelected ? "Active" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
