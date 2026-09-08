export function distanceToSegment(
  point: [number, number],
  start: [number, number],
  end: [number, number],
): { dist: number; t: number } {
  const [px, py] = point;
  const [ax, ay] = start;
  const [bx, by] = end;
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  if (length2 === 0) return { dist: Math.hypot(px - ax, py - ay), t: 0 };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2));
  return { dist: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t };
}

/** Index, an dem ein Punkt auf einer Kante eingefügt werden soll. */
export function insertIndexOnEdge(
  points: [number, number][],
  point: [number, number],
  threshold: number,
): number | null {
  let best: { index: number; dist: number } | null = null;
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    const { dist, t } = distanceToSegment(point, start, end);
    if (t <= 0.04 || t >= 0.96) continue;
    if (dist <= threshold && (!best || dist < best.dist)) {
      best = { index: i + 1, dist };
    }
  }
  return best?.index ?? null;
}

export function parsePolygon(value: string | null): [number, number][] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length < 3) return null;
    const points: [number, number][] = [];
    for (const item of parsed) {
      if (!Array.isArray(item) || item.length < 2) return null;
      const x = Number(item[0]);
      const y = Number(item[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      points.push([x, y]);
    }
    return points;
  } catch {
    return null;
  }
}
