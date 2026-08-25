import type { Iceberg } from "../data/types";
import { corridorPath, smoothPath } from "./map/geo";
import { Card, Metric, RISK_COLORS } from "./ui/primitives";

// Iceberg trajectory prediction with an explicit uncertainty corridor.
export function PredictionCard({ iceberg }: { iceberg: Iceberg }) {
  const color = RISK_COLORS[iceberg.riskLevel];
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
          AI Ensemble
        </span>
      }
    >
      <div className="p-3.5">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Metric label="ID" value={iceberg.id} accent="#55d6e8" />
          <Metric label="Current Speed" value={iceberg.speedMs} unit="m/s" />
          <Metric label="Heading" value={`${iceberg.headingDeg}°`} />
          <Metric label="Forecast Horizon" value="Next 72h" />
        </div>
        <div className="mt-2 text-[10px] text-[#91aeb9] light:text-[#5a7686]">
          Observed <span className="font-mono text-[#c8dde3] light:text-[#0d2433]">{iceberg.observedAt}</span>
        </div>

        <div className="mt-3 overflow-hidden rounded-md border border-[#1d445c]/50 bg-[#071a26] light:border-[#e2d8c7] light:bg-[#f6f0e4]">
          <svg viewBox="0 0 200 120" className="h-28 w-full">
            <path d={corridorPath(norm, widths)} fill={color} opacity="0.18" />
            <path d={smoothPath(norm)} fill="none" stroke={color} strokeWidth="1.8" strokeDasharray="5 4" />
            <circle cx={norm[0].x} cy={norm[0].y} r="3.5" fill={color} stroke="#071a26" strokeWidth="1" />
            <circle cx={norm.at(-1)!.x} cy={norm.at(-1)!.y} r="3" fill="none" stroke={color} strokeWidth="1.4" />
            <text x={norm[0].x + 6} y={norm[0].y - 4} fill="#eaf6f8" fontSize="8" fontFamily="JetBrains Mono" className="light:fill-[#0d2433]">
              now
            </text>
            <text x={norm.at(-1)!.x - 4} y={norm.at(-1)!.y + 14} fill="#91aeb9" fontSize="8" fontFamily="JetBrains Mono" className="light:fill-[#4a6878]">
              +72h
            </text>
          </svg>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#91aeb9] light:text-[#5a7686]">95% Prediction Corridor</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#91aeb9] light:text-[#5a7686]">Confidence</span>
            <span className="font-mono text-[13px] font-semibold" style={{ color }}>
              {iceberg.confidence}%
            </span>
          </div>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#0d2433] light:bg-[#e2d9ca]">
          <div className="h-full rounded-full" style={{ width: `${iceberg.confidence}%`, backgroundColor: color }} />
        </div>
      </div>
    </Card>
  );
}
