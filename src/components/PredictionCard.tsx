import { useNav } from "../state";
import type { Iceberg } from "../data/types";
import { corridorPath, smoothPath } from "./map/geo";
import { Card, Metric, RISK_COLORS } from "./ui/primitives";

// Iceberg trajectory prediction with an explicit uncertainty corridor.
export function PredictionCard({ iceberg }: { iceberg: Iceberg }) {
  const nav = useNav();
  const color = RISK_COLORS[iceberg.riskLevel];
  
  const hasRealPred = !!nav.predictionsCache[iceberg.id];
  const realPred = nav.predictionsCache[iceberg.id];

  // Normalize the predicted path into the mini-viz box (0..200 x 0..120).
  const xs = iceberg.predictedPath.map((p) => p.x);
  const ys = iceberg.predictedPath.map((p) => p.y);
  const minX = Math.min(...xs) - 70;
  const maxX = Math.max(...xs) + 70;
  const minY = Math.min(...ys) - 20;
  const maxY = Math.max(...ys) + 20;
  const norm = iceberg.predictedPath.map((p) => ({
    ...p,
    x: ((p.x - minX) / (maxX - minX)) * 200,
    y: ((p.y - minY) / (maxY - minY)) * 120,
  }));
  const scale = 200 / (maxX - minX);
  const widths = iceberg.uncertainty.map((u) => u * scale);

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
                  <span className="text-[#eaf6f8] light:text-[#0d2433]">Lat: {Math.abs(iceberg.position.lat).toFixed(4)}°S</span>
                  <span className="block text-[#eaf6f8] light:text-[#0d2433]">Lon: {Math.abs(iceberg.position.lon).toFixed(4)}°W</span>
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
                      <span className="text-[#eaf6f8]/70">Lat: {Math.abs(iceberg.predictedPath[iceberg.predictedPath.length - 1].lat).toFixed(4)}°S</span>
                      <span className="block text-[#eaf6f8]/70">Lon: {Math.abs(iceberg.predictedPath[iceberg.predictedPath.length - 1].lon).toFixed(4)}°W</span>
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
              <Metric label="Current Speed" value={iceberg.speedMs} unit="m/s" />
              <Metric label="Heading" value={`${iceberg.headingDeg}°`} />
              <Metric label="Forecast Horizon" value="T+24h (ML)" />
            </div>

            <div className="mt-3 overflow-hidden rounded-md border border-[#1d445c]/50 bg-[#071a26] light:border-[#e2d8c7] light:bg-[#f6f0e4]">
              <svg viewBox="0 0 200 120" className="h-28 w-full">
                <path d={corridorPath(norm, widths)} fill={color} opacity="0.18" />
                <path d={smoothPath(norm)} fill="none" stroke={color} strokeWidth="1.8" strokeDasharray="5 4" />
                <circle cx={norm[0].x} cy={norm[0].y} r="3.5" fill={color} stroke="#071a26" strokeWidth="1" />
                <circle cx={norm[norm.length - 1]!.x} cy={norm[norm.length - 1]!.y} r="3" fill="none" stroke={color} strokeWidth="1.4" />
                <text x={norm[0].x + 6} y={norm[0].y - 4} fill="#eaf6f8" fontSize="8" fontFamily="JetBrains Mono" className="light:fill-[#0d2433]">
                  now
                </text>
                <text x={norm[norm.length - 1]!.x - 4} y={norm[norm.length - 1]!.y + 14} fill="#91aeb9" fontSize="8" fontFamily="JetBrains Mono" className="light:fill-[#4a6878]">
                  +24h
                </text>
              </svg>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">95% Prediction Corridor</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#91aeb9] light:text-[#5a7686]">Confidence</span>
                <span className="font-mono text-[13px] font-semibold" style={{ color }}>
                  {iceberg.confidence}%
                </span>
              </div>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#0d2433] light:bg-[#e2d9ca]">
              <div className="h-full rounded-full" style={{ width: `${iceberg.confidence}%`, backgroundColor: color }} />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
