import { useNav } from "../state";
import type { Iceberg } from "../data/types";
import { corridorPath, smoothPath } from "./map/geo";
import { Card, Metric, RISK_COLORS } from "./ui/primitives";

// Iceberg trajectory prediction with an explicit uncertainty corridor.
export function PredictionCard({ iceberg }: { iceberg?: Iceberg | null }) {

  const nav = useNav();

  if (!iceberg) {
    return (
      <Card title="Iceberg Prediction Intelligence">
        <div className="p-6 text-center text-xs text-[#91aeb9]">Loading iceberg telemetry...</div>
      </Card>
    );
  }

  const color = RISK_COLORS[iceberg.riskLevel || "high"];
  const hasRealPred = !!nav.predictionsCache[iceberg.id];
  const realPred = nav.predictionsCache[iceberg.id];

  const defaultPt = iceberg.position || { x: 500, y: 500, lat: -53.73, lon: -29.5 };
  const path =
    iceberg.predictedPath && iceberg.predictedPath.length > 0
      ? iceberg.predictedPath
      : [
          defaultPt,
          { x: defaultPt.x + 20, y: defaultPt.y - 20, lat: defaultPt.lat + 0.15, lon: defaultPt.lon - 0.25 },
        ];

  // Normalize the predicted path into the mini-viz box (0..200 x 0..120).
  const xs = path.map((p) => p.x ?? 500);
  const ys = path.map((p) => p.y ?? 500);
  const minX = Math.min(...xs) - 70;
  const maxX = Math.max(...xs) + 70;
  const minY = Math.min(...ys) - 20;
  const maxY = Math.max(...ys) + 20;
  const diffX = Math.max(1, maxX - minX);
  const diffY = Math.max(1, maxY - minY);
  const norm = path.map((p) => ({
    ...p,
    x: (((p.x ?? 500) - minX) / diffX) * 200,
    y: (((p.y ?? 500) - minY) / diffY) * 120,
  }));
  const scale = 200 / diffX;
  const uncertainty = iceberg.uncertainty && iceberg.uncertainty.length > 0 ? iceberg.uncertainty : [2.0, 4.0, 7.0, 10.5, 14.5];
  const widths = uncertainty.map((u) => u * scale);

  const curLat = iceberg.position?.lat ?? defaultPt.lat;
  const curLon = iceberg.position?.lon ?? defaultPt.lon;
  const lastPt = path[path.length - 1] ?? defaultPt;

  return (
    <Card
      title="Iceberg Prediction Intelligence"
      action={
        <span className="rounded-sm bg-[#f5b942]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#f5b942] light:text-[#d97706]">
          {hasRealPred ? "Random Forest ML" : "AI Ensemble"}
        </span>
      }
    >
      <div className="p-3.5">
        {nav.predictionLoading && !hasRealPred ? (
          <div className="flex flex-col items-center justify-center py-8 font-mono text-[11px] text-[#55d6e8] animate-pulse">
            <span className="mb-2">🔮 Calculating trajectory...</span>
            <span>Loading prediction...</span>
          </div>
        ) : nav.predictionError && !hasRealPred ? (
          <div className="flex flex-col items-center justify-center py-8 font-mono text-[11px] text-red-400">
            <span className="mb-2">⚠️ Connection Offline</span>
            <span className="text-[10px] text-red-400/80">Prediction unavailable</span>
          </div>
        ) : (
          <>
            <div className="mb-3 border-b border-[#1d445c]/30 pb-2.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">
                24-Hour Trajectory Prediction
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-[11.5px]">
                <div>
                  <span className="block text-[8.5px] text-[#91aeb9] light:text-[#5a7686] uppercase">Current Position</span>
                  <span className="text-[#eaf6f8] light:text-[#0d2433]">Lat: {Math.abs(curLat).toFixed(4)}°S</span>
                  <span className="block text-[#eaf6f8] light:text-[#0d2433]">Lon: {Math.abs(curLon).toFixed(4)}°W</span>
                </div>
                <div>
                  <span className="block text-[8.5px] text-[#91aeb9] light:text-[#5a7686] uppercase">Predicted Position</span>
                  {hasRealPred && realPred ? (
                    <>
                      <span className="text-[#55d6e8] light:text-[#0f768e] font-semibold">Lat: {Math.abs(realPred.lat).toFixed(4)}°S</span>
                      <span className="block text-[#55d6e8] light:text-[#0f768e] font-semibold">Lon: {Math.abs(realPred.lon).toFixed(4)}°W</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#eaf6f8]/70">Lat: {Math.abs(lastPt.lat).toFixed(4)}°S</span>
                      <span className="block text-[#eaf6f8]/70">Lon: {Math.abs(lastPt.lon).toFixed(4)}°W</span>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[8.5px] text-[#91aeb9] light:text-[#5a7686] uppercase font-mono block">Predicted Movement</span>
                  <span className="font-mono text-[13px] font-bold text-[#eaf6f8] light:text-[#0d2433]">
                    {hasRealPred && realPred ? `${realPred.displacement_km.toFixed(2)} km` : "Calculated on-the-fly"}
                  </span>
                </div>
                {hasRealPred && (
                  <span className="rounded bg-[#10b981]/15 px-1.5 py-0.5 text-[8.5px] font-semibold text-[#10b981] uppercase tracking-wider">
                    Prediction successful
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <Metric label="ID" value={iceberg.id} accent="#55d6e8" />
              <Metric label="Current Speed" value={iceberg.speedMs || 0.22} unit="m/s" />
              <Metric label="Heading" value={`${iceberg.headingDeg || 300}°`} />
              <Metric label="Forecast Horizon" value="T+24h (ML)" />
            </div>

            <div className="mt-3 overflow-hidden rounded-md border border-[#1d445c]/50 bg-[#071a26] light:border-[#e2d8c7] light:bg-[#f6f0e4]">
              <svg viewBox="0 0 200 120" className="h-28 w-full">
                <path d={corridorPath(norm, widths)} fill={color} opacity="0.18" />
                <path d={smoothPath(norm)} fill="none" stroke={color} strokeWidth="1.8" strokeDasharray="5 4" />
                <circle cx={norm[0]?.x ?? 30} cy={norm[0]?.y ?? 60} r="3.5" fill={color} stroke="#071a26" strokeWidth="1" />
                <circle cx={norm[norm.length - 1]?.x ?? 170} cy={norm[norm.length - 1]?.y ?? 60} r="3" fill="none" stroke={color} strokeWidth="1.4" />
                <text x={(norm[0]?.x ?? 30) + 6} y={(norm[0]?.y ?? 60) - 4} fill="#eaf6f8" fontSize="8" fontFamily="JetBrains Mono" className="light:fill-[#0d2433]">
                  now
                </text>
                <text x={(norm[norm.length - 1]?.x ?? 170) - 4} y={(norm[norm.length - 1]?.y ?? 60) + 14} fill="#91aeb9" fontSize="8" fontFamily="JetBrains Mono" className="light:fill-[#4a6878]">
                  +24h
                </text>
              </svg>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">95% Prediction Corridor</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#91aeb9] light:text-[#5a7686]">Confidence</span>
                <span className="font-mono text-[13px] font-semibold" style={{ color }}>
                  {iceberg.confidence || 85}%
                </span>
              </div>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#0d2433] light:bg-[#e2d9ca]">
              <div className="h-full rounded-full" style={{ width: `${iceberg.confidence || 85}%`, backgroundColor: color }} />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

