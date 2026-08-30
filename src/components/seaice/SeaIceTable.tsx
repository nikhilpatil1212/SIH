import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  ShieldAlert,
  Snowflake,
  Layers,
  Clock,
} from "lucide-react";
import apiClient from "../../api/client";
import type { SeaIceRegionItem, SeaIceTableResponse } from "../../data/types";
import { useTheme } from "../../theme";
import { useRealtime } from "../../hooks/useRealtime";

type SortKey =
  | "region"
  | "current_sic"
  | "f1d"
  | "f3d"
  | "f7d"
  | "f14d"
  | "f30d"
  | "change_7d"
  | "confidence"
  | "risk"
  | "last_updated";

function formatTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
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

export function SeaIceTable({ className = "" }: { className?: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [data, setData] = useState<SeaIceTableResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("current_sic");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [timeAgoStr, setTimeAgoStr] = useState<string>("just now");

  const fetchData = useCallback(async (showRefreshingSpinner = false) => {
    try {
      if (showRefreshingSpinner) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await apiClient.seaIce.getTable();
      setData(res);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      setError(err.message || "Unable to retrieve sea-ice data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Hook into real-time WebSocket events
  useRealtime((event) => {
    if (event.type === "SEA_ICE_UPDATED" && event.data) {
      setData(event.data);
      setLastRefreshedAt(new Date());
    }
  });

  // Periodically update the "X min ago" ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastRefreshedAt.getTime()) / 1000);
      if (diffSec < 10) setTimeAgoStr("just now");
      else if (diffSec < 60) setTimeAgoStr(`${diffSec}s ago`);
      else if (diffSec < 3600) setTimeAgoStr(`${Math.floor(diffSec / 60)}m ago`);
      else setTimeAgoStr(`${Math.floor(diffSec / 3600)}h ago`);
    }, 10000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    if (!data || !data.regions) return [];
    
    let list = [...data.regions];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((r) => r.region.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortKey) {
        case "region":
          valA = a.region;
          valB = b.region;
          break;
        case "current_sic":
          valA = a.current_sic;
          valB = b.current_sic;
          break;
        case "f1d":
          valA = a.forecast["1d"] ?? a.current_sic;
          valB = b.forecast["1d"] ?? b.current_sic;
          break;
        case "f3d":
          valA = a.forecast["3d"] ?? a.current_sic;
          valB = b.forecast["3d"] ?? b.current_sic;
          break;
        case "f7d":
          valA = a.forecast["7d"] ?? a.current_sic;
          valB = b.forecast["7d"] ?? b.current_sic;
          break;
        case "f14d":
          valA = a.forecast["14d"] ?? a.current_sic;
          valB = b.forecast["14d"] ?? b.current_sic;
          break;
        case "f30d":
          valA = a.forecast["30d"] ?? a.current_sic;
          valB = b.forecast["30d"] ?? b.current_sic;
          break;
        case "change_7d":
          valA = a.change_7d;
          valB = b.change_7d;
          break;
        case "confidence":
          valA = a.confidence;
          valB = b.confidence;
          break;
        case "risk": {
          const rank: Record<string, number> = { "VERY HIGH": 4, "HIGH": 3, "MODERATE": 2, "LOW": 1 };
          valA = rank[a.risk] || 0;
          valB = rank[b.risk] || 0;
          break;
        }
        case "last_updated":
          valA = new Date(a.last_updated).getTime();
          valB = new Date(b.last_updated).getTime();
          break;
        default:
          valA = a.current_sic;
          valB = b.current_sic;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [data, searchTerm, sortKey, sortAsc]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ChevronDown size={12} className="opacity-30" />;
    return sortAsc ? <ChevronUp size={13} className="text-[#55d6e8]" /> : <ChevronDown size={13} className="text-[#55d6e8]" />;
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "VERY HIGH":
        return <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30">VERY HIGH</span>;
      case "HIGH":
        return <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">HIGH</span>;
      case "MODERATE":
        return <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">MODERATE</span>;
      default:
        return <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">LOW</span>;
    }
  };

  return (
    <div className={`flex flex-col rounded-xl border p-5 shadow-lg transition-colors ${
      isDark ? "border-[#1d445c] bg-[#071521]/90 text-[#eaf6f8]" : "border-[#dfd8cc] bg-white text-[#0d2433]"
    } ${className}`}>
      
      {/* Top Header Information */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 mb-4 border-[#1d445c]/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Snowflake className="text-[#55d6e8]" size={20} />
            <h2 className="text-[19px] font-bold tracking-tight">ANTARCTIC SEA-ICE CONCENTRATION</h2>
            <span className="rounded-full bg-[#55d6e8]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#55d6e8]">
              Scientific Monitor
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] font-medium text-[#91aeb9] light:text-[#4a6878]">
            <div>
              Latest Observation: <span className="font-mono font-semibold text-[#eaf6f8] light:text-[#0d2433]">{data ? formatTimestamp(data.observation_timestamp) : "Loading..."}</span>
            </div>
            <div>
              Data Source: <span className="font-semibold text-[#55d6e8]">{data?.data_source || "NOAA/NSIDC"}</span>
            </div>
            <div>
              Regions Monitored: <span className="font-mono font-semibold text-[#eaf6f8] light:text-[#0d2433]">{data?.regions_monitored ?? 15}</span>
            </div>
          </div>
        </div>

        {/* Live Refresh Ticker & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono border-[#1d445c] bg-[#050d17]/50 light:bg-[#f2ece0]">
            <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-[#10b981] font-semibold">Live Data</span>
            <span className="text-[#5f7d89]">·</span>
            <span className="text-[#91aeb9] light:text-[#4a6878]">Last refreshed: {timeAgoStr}</span>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all hover:bg-[#55d6e8]/10 border-[#1d445c] text-[#55d6e8] disabled:opacity-50"
            title="Trigger pipeline ingestion check"
          >
            <RotateCcw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Updating..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-[#5f7d89]" />
          <input
            type="text"
            placeholder="Search Antarctic region..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className={`w-full rounded-lg border pl-9 pr-3 py-1.5 text-[13px] outline-none transition-colors ${
              isDark
                ? "border-[#1d445c] bg-[#0d2433] text-[#eaf6f8] placeholder:text-[#5f7d89] focus:border-[#55d6e8]"
                : "border-[#dfd8cc] bg-white text-[#0d2433] placeholder:text-[#9db6c1] focus:border-[#0f768e]"
            }`}
          />
        </div>
        <div className="text-[11px] text-[#91aeb9] font-mono">
          Showing <span className="font-bold text-[#eaf6f8] light:text-[#0d2433]">{filteredAndSortedRows.length}</span> of 15 major sectors
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RotateCcw className="animate-spin text-[#55d6e8] mb-3" size={28} />
          <p className="text-[14px] font-semibold text-[#91aeb9]">Loading Antarctic sea-ice data...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-6">
          <ShieldAlert className="text-[#ef4444] mb-2" size={32} />
          <p className="text-[14px] font-bold text-[#ef4444]">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-3 rounded-lg bg-[#ef4444] px-4 py-1.5 text-[12px] font-bold text-white shadow hover:bg-[#dc2626]"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && filteredAndSortedRows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Snowflake className="text-[#5f7d89] mb-2" size={28} />
          <p className="text-[14px] font-semibold text-[#91aeb9]">Sea-ice data unavailable for this search query.</p>
        </div>
      )}

      {/* Tabular Data View with Sticky Header */}
      {!loading && !error && filteredAndSortedRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[#1d445c]/50">
          <table className="w-full text-left text-[12.5px] border-collapse">
            {/* Sticky Table Header */}
            <thead className={`sticky top-0 z-10 border-b font-semibold text-[11.5px] uppercase tracking-wider ${
              isDark ? "bg-[#0c1f2e] text-[#91aeb9] border-[#1d445c]" : "bg-[#f2ede4] text-[#4a6878] border-[#dfd8cc]"
            }`}>
              <tr>
                <th onClick={() => handleSort("region")} className="py-3 px-3 cursor-pointer select-none hover:text-[#55d6e8]">
                  <div className="flex items-center gap-1.5">Region {renderSortIcon("region")}</div>
                </th>
                <th onClick={() => handleSort("current_sic")} className="py-3 px-3 cursor-pointer select-none text-right hover:text-[#55d6e8] bg-[#55d6e8]/10">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="rounded px-1.5 py-0.5 bg-[#55d6e8] text-[#071521] font-bold text-[9.5px]">OBSERVED</span>
                    <span>Current SIC</span>
                    {renderSortIcon("current_sic")}
                  </div>
                </th>
                <th onClick={() => handleSort("f1d")} className="py-3 px-3 cursor-pointer select-none text-right hover:text-[#55d6e8]">
                  <div className="flex items-center justify-end gap-1">+1 Day {renderSortIcon("f1d")}</div>
                </th>
                <th onClick={() => handleSort("f3d")} className="py-3 px-3 cursor-pointer select-none text-right hover:text-[#55d6e8]">
                  <div className="flex items-center justify-end gap-1">+3 Days {renderSortIcon("f3d")}</div>
                </th>
                <th onClick={() => handleSort("f7d")} className="py-3 px-3 cursor-pointer select-none text-right hover:text-[#55d6e8]">
                  <div className="flex items-center justify-end gap-1">+7 Days {renderSortIcon("f7d")}</div>
                </th>
                <th onClick={() => handleSort("f14d")} className="py-3 px-3 cursor-pointer select-none text-right hover:text-[#55d6e8]">
                  <div className="flex items-center justify-end gap-1">+14 Days {renderSortIcon("f14d")}</div>
                </th>
                <th onClick={() => handleSort("f30d")} className="py-3 px-3 cursor-pointer select-none text-right hover:text-[#55d6e8]">
                  <div className="flex items-center justify-end gap-1">+30 Days {renderSortIcon("f30d")}</div>
                </th>
                <th onClick={() => handleSort("change_7d")} className="py-3 px-3 cursor-pointer select-none text-right hover:text-[#55d6e8]">
                  <div className="flex items-center justify-end gap-1">Change (7d) {renderSortIcon("change_7d")}</div>
                </th>
                <th onClick={() => handleSort("confidence")} className="py-3 px-3 cursor-pointer select-none text-center hover:text-[#55d6e8]">
                  <div className="flex items-center justify-center gap-1">Confidence {renderSortIcon("confidence")}</div>
                </th>
                <th onClick={() => handleSort("risk")} className="py-3 px-3 cursor-pointer select-none text-center hover:text-[#55d6e8]">
                  <div className="flex items-center justify-center gap-1">Risk {renderSortIcon("risk")}</div>
                </th>
                <th onClick={() => handleSort("last_updated")} className="py-3 px-3 cursor-pointer select-none text-right hover:text-[#55d6e8]">
                  <div className="flex items-center justify-end gap-1">Last Updated {renderSortIcon("last_updated")}</div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#1d445c]/30">
              {filteredAndSortedRows.map((row, idx) => {
                const isExpansion = row.change_7d > 0;
                return (
                  <tr
                    key={row.region}
                    className={`transition-colors font-mono ${
                      idx % 2 === 0
                        ? isDark ? "bg-[#071521]/60 hover:bg-[#0f2a3d]" : "bg-white hover:bg-[#f6f2ea]"
                        : isDark ? "bg-[#091b29]/60 hover:bg-[#0f2a3d]" : "bg-[#faf7f0] hover:bg-[#f6f2ea]"
                    }`}
                  >
                    {/* Region */}
                    <td className="py-2.5 px-3 font-sans font-bold text-[#eaf6f8] light:text-[#0d2433] flex items-center gap-2">
                      <span className="text-[11px] text-[#55d6e8]">{idx + 1}.</span>
                      <span>{row.region}</span>
                    </td>

                    {/* Current SIC (Observed) */}
                    <td className="py-2.5 px-3 text-right font-bold text-[#55d6e8] bg-[#55d6e8]/5">
                      {row.current_sic.toFixed(1)}%
                    </td>

                    {/* Forecasts */}
                    <td className="py-2.5 px-3 text-right text-[#cbe5ee] light:text-[#2d4a58]">
                      {(row.forecast["1d"] ?? row.current_sic).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#cbe5ee] light:text-[#2d4a58]">
                      {(row.forecast["3d"] ?? row.current_sic).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#eaf6f8] light:text-[#0d2433]">
                      {(row.forecast["7d"] ?? row.current_sic).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#91aeb9] light:text-[#5a7686]">
                      {(row.forecast["14d"] ?? row.current_sic).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#91aeb9] light:text-[#5a7686]">
                      {(row.forecast["30d"] ?? row.current_sic).toFixed(1)}%
                    </td>

                    {/* 7-Day Change */}
                    <td className={`py-2.5 px-3 text-right font-bold ${
                      isExpansion ? "text-[#ef4444]" : "text-[#10b981]"
                    }`}>
                      {row.change_7d > 0 ? `+${row.change_7d.toFixed(1)}%` : `${row.change_7d.toFixed(1)}%`}
                    </td>

                    {/* Confidence */}
                    <td className="py-2.5 px-3 text-center text-[12px] text-[#91aeb9]">
                      {row.confidence.toFixed(1)}%
                    </td>

                    {/* Risk Badge */}
                    <td className="py-2.5 px-3 text-center">
                      {getRiskBadge(row.risk)}
                    </td>

                    {/* Last Updated Timestamp */}
                    <td className="py-2.5 px-3 text-right text-[11px] text-[#5f7d89]">
                      {formatTimestamp(row.last_updated)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Notes */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5f7d89] font-mono">
        <div>
          * Observed SIC aggregated from 2D spatial satellite grid cells. Multi-horizon forecasts generated via trained ML models calibrated on 48-year Antarctic NSIDC records.
        </div>
        <div>
          Navigation Risk Thresholds: 0–20% Low, 20–50% Moderate, 50–80% High, 80–100% Very High.
        </div>
      </div>
    </div>
  );
}
