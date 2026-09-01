import { useState } from "react";
import { Download, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, Chip, Metric } from "../components/ui/primitives";
import { useNav } from "../state";
import apiClient from "../api/client";

export function Reports() {
  const nav = useNav();
  const route = nav.routes.find((r) => r.id === nav.selectedRouteId) ?? nav.routes[0];
  const majorHazards = nav.hazards.filter((h) => h.severity !== "low").slice(0, 4);

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleExportMissionAudit = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      setDownloadSuccess(false);

      const payload = {
        mission_name: "Indian Antarctic Expedition",
        vessel_name: "RV Polar Star (PC6)",
        vessel_speed_kn: 14.0,
        departure: "Cape Town (33.92°S, 18.42°E)",
        destination: "Maitri Station / Bharati Station (70.77°S, 11.73°E)",
        selected_route_name: route.name,
        selected_route_id: route.id,
        transit_distance_nm: route.distanceNm,
        transit_distance_km: route.distanceKm || Math.round(route.distanceNm * 1.852),
        projected_eta: route.eta,
        fuel_expenditure_t: route.fuelT,
        risk_score: route.riskScore,
        rerouted: nav.rerouted,
        routes: nav.routes.map((r) => ({
          name: r.name,
          distanceNm: r.distanceNm,
          eta: r.eta,
          fuelT: r.fuelT,
          riskScore: r.riskScore,
          nearestIceberg: r.nearestIceberg,
          minimumIcebergClearanceKm: r.minimumIcebergClearanceKm,
        })),
        hazards: nav.hazards.map((h) => ({
          id: h.id,
          type: h.type,
          location: h.location,
          severity: h.severity,
          affectedRoute: h.affectedRoute,
        })),
        icebergs_count: nav.icebergs.length,
        nearest_iceberg: route.nearestIceberg ? `${route.nearestIceberg} (Standoff: ${route.minimumIcebergClearanceKm || 64.2} km)` : "A76C (64.2 km)",
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
      };

      const pdfBlob = await apiClient.reports.exportMissionAudit(payload);

      // Create download link and trigger automatic browser save
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const dateTag = new Date().toISOString().slice(0, 10);
      link.download = `Dhruv_Sarthi_Mission_Audit_${dateTag}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error("Failed to export mission audit PDF:", err);
      setDownloadError(err.message || "Failed to generate report PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <Card
        title="Dhruv Sarthi · Voyage & Mission Summary"
        action={
          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-[#10b981]">
                <CheckCircle2 size={13} /> PDF Downloaded
              </span>
            )}
            {downloadError && (
              <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-red-400">
                <AlertCircle size={13} /> {downloadError}
              </span>
            )}
            <button
              onClick={handleExportMissionAudit}
              disabled={downloading}
              className="flex items-center gap-2 rounded-md border border-[#55d6e8]/50 bg-[#55d6e8]/10 light:border-[#0f768e]/40 light:bg-[#0f768e]/10 px-3 py-1.5 text-[11px] font-semibold text-[#55d6e8] light:text-[#0f768e] transition-colors hover:bg-[#55d6e8]/20 disabled:opacity-50 cursor-pointer"
            >
              {downloading ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Generating PDF...
                </>
              ) : (
                <>
                  <Download size={13} /> Export Mission Audit
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3 lg:grid-cols-5">
          <Metric label="Mission Name" value="Indian Antarctic Expedition" />
          <Metric label="Vessel" value="RV Polar Star (PC6)" />
          <Metric label="Active Corridor" value={route.name} accent="#55d6e8" />
          <Metric label="Transit Distance" value={route.distanceNm.toLocaleString()} unit="nm" />
          <Metric label="Projected ETA" value={route.eta} />
          <Metric label="Fuel Expenditure" value={route.fuelT} unit="t" />
          <Metric label="Composite Risk" value={`${route.riskScore}/100`} accent={route.riskScore >= 60 ? "#ef4444" : "#10b981"} />
          <Metric label="Dynamic Reroutes" value={nav.rerouted ? 1 : 0} />
          <Metric label="Neural Platform" value="Dhruv Sarthi v1.2" />
        </div>
      </Card>

      <Card title="Critical Hazards Intercept Log">
        <div className="flex flex-col divide-y divide-[#1d445c]/40 light:divide-[#e8e0d2]">
          {majorHazards.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText size={14} className="text-[#91aeb9] light:text-[#5a7686]" />
                <div>
                  <div className="font-mono text-[12px] font-semibold text-[#eaf6f8] light:text-[#0d2433]">{h.id} · {h.type}</div>
                  <div className="text-[11px] text-[#91aeb9] light:text-[#4a6878]">{h.location} · Intersects {h.affectedRoute}</div>
                </div>
              </div>
              <Chip level={h.severity}>{h.severity.toUpperCase()}</Chip>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Tactical Rerouting Log">
        <div className="p-4">
          {nav.rerouted ? (
            <div className="rounded-md border-l-2 border-[#f59e0b] bg-[#f59e0b]/10 light:bg-[#fef3c7] p-3.5 text-[12px]">
              <div className="font-mono text-[10px] text-[#91aeb9] light:text-[#78350f]">10:31 UTC · AUTONOMOUS DISPATCH</div>
              <div className="mt-0.5 text-[#eaf6f8] light:text-[#0d2433] font-medium">
                Automated reroute from Route B → Route C triggered following newly accelerated tabular iceberg A76C trajectory.
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-[12px] text-[#91aeb9] light:text-[#7a93a1]">
              No rerouting events recorded for current voyage leg.
            </div>
          )}
        </div>

      </Card>
    </div>
  );
}
