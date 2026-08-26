// 2D Geographic / Canvas Point definition supporting both raw canvas coordinates and lat/lon
export interface Point2D {
  x: number;
  y: number;
  lat?: number;
  lon?: number;
}

// Build a smooth path (Catmull-Rom -> cubic Bezier) through the given points so
// routes and trajectories curve naturally instead of drawing as straight lines.
export function smoothPath(pts: Point2D[]): string {
  if (pts.length < 2) return "";
  const d: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

export function polygonPath(pts: Point2D[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
}

// Return the sub-polyline of `pts` covering fraction f (0..1) of its total
// length, interpolating the final point. Used to grow an iceberg trajectory as
// the prediction horizon is extended.
export function slicePath(pts: Point2D[], f: number): Point2D[] {
  if (pts.length < 2 || f >= 1) return pts;
  if (f <= 0) return [pts[0]];
  const segLens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const total = segLens.reduce((a, b) => a + b, 0);
  let target = total * f;
  const out: Point2D[] = [pts[0]];
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i]) {
      const t = segLens[i] === 0 ? 0 : target / segLens[i];
      out.push({
        ...pts[i + 1],
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
      });
      break;
    }
    target -= segLens[i];
    out.push(pts[i + 1]);
  }
  return out;
}

// Cold scientific concentration scale for sea-ice (glacier -> cyan -> electric).
export function seaIceColor(concentration: number): string {
  if (concentration < 10) return "#a9dfe9";
  if (concentration < 30) return "#8ccfe0";
  if (concentration < 50) return "#55d6e8";
  if (concentration < 70) return "#3b82f6";
  return "#2563eb";
}

// Uncertainty corridor: offset the predicted path on both sides by the per-point
// half-widths, then close the shape into a widening ribbon.
export function corridorPath(pts: Point2D[], widths: number[]): string {
  if (pts.length < 2) return "";
  const left: Point2D[] = [];
  const right: Point2D[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = widths[i] ?? 0;
    left.push({ ...pts[i], x: pts[i].x + nx * w, y: pts[i].y + ny * w });
    right.push({ ...pts[i], x: pts[i].x - nx * w, y: pts[i].y - ny * w });
  }
  const forward = smoothPath(left);
  const backward = smoothPath([...right].reverse()).replace("M", "L");
  return `${forward} ${backward} Z`;
}
