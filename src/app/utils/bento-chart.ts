/** Pure geometry and aggregation helpers for the bento dashboard charts. */

export interface Pt {
  x: number;
  y: number;
}

export interface StreamLayer {
  top: Pt[];
  bottom: Pt[];
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const fmt = (n: number) => Number(n.toFixed(2));

/** Smooth cubic path through the points (Catmull-Rom converted to Beziers). */
export function smoothPath(points: Pt[], moveTo = true): string {
  if (!points.length) return '';
  const start = `${moveTo ? 'M' : 'L'} ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  if (points.length === 1) return start;
  let d = start;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d;
}

/** Closed smooth band between a top edge and a bottom edge (both left to right). */
export function bandPath(top: Pt[], bottom: Pt[]): string {
  if (!top.length || top.length !== bottom.length) return '';
  const back = [...bottom].reverse();
  return `${smoothPath(top)} ${smoothPath(back, false)} Z`;
}

/** Smooth area under a line down to `baseline`. */
export function areaPath(points: Pt[], baseline: number): string {
  if (!points.length) return '';
  const last = points[points.length - 1];
  return `${smoothPath(points)} L ${fmt(last.x)} ${baseline} L ${fmt(points[0].x)} ${baseline} Z`;
}

/** Maps values to x/y inside a box; larger values are nearer the top. */
export function linePoints(
  values: number[],
  width: number,
  height: number,
  options: { pad?: number; max?: number } = {},
): Pt[] {
  const pad = options.pad ?? 0;
  const max = options.max ?? Math.max(...values, 0);
  const span = max > 0 ? max : 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: values.length > 1 ? pad + i * step : width / 2,
    y: height - (Math.max(v, 0) / span) * height,
  }));
}

/**
 * Stacks series symmetrically around the centre line (a stream graph).
 * Every layer keeps its true thickness: `thickness = value / max total * height`.
 */
export function streamLayers(
  series: number[][],
  width: number,
  height: number,
  pad = 0,
): StreamLayer[] {
  const n = Math.max(0, ...series.map((s) => s.length));
  if (!n || !series.length) return [];
  const totals = Array.from({ length: n }, (_, i) =>
    series.reduce((sum, s) => sum + Math.max(s[i] ?? 0, 0), 0),
  );
  const max = Math.max(...totals, 0) || 1;
  const step = n > 1 ? (width - pad * 2) / (n - 1) : 0;
  const x = (i: number) => (n > 1 ? pad + i * step : width / 2);
  const mid = height / 2;
  const running = totals.map((t) => (-t / 2 / max) * height);
  return series.map((s) => {
    const top: Pt[] = [];
    const bottom: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const h = (Math.max(s[i] ?? 0, 0) / max) * height;
      top.push({ x: x(i), y: mid + running[i] });
      bottom.push({ x: x(i), y: mid + running[i] + h });
      running[i] += h;
    }
    return { top, bottom };
  });
}

/** Total per weekday (Mon to Sun) for dated rows. Dates are `YYYY-MM-DD`. */
export function weekdayTotals(rows: { date: string; count: number }[] | undefined): number[] {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const row of rows ?? []) {
    const day = new Date(`${row.date.slice(0, 10)}T00:00:00Z`).getUTCDay();
    if (Number.isNaN(day)) continue;
    totals[(day + 6) % 7] += row.count;
  }
  return totals;
}

/** Index of the largest value, or -1 when everything is zero. */
export function peakIndex(values: number[]): number {
  const max = Math.max(...values, 0);
  return max > 0 ? values.indexOf(max) : -1;
}

/** Percent change or null when there is no previous value to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatPercent(value: number | null): string {
  if (value === null) return '';
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;
}

/** Splits `count` ticks between shares; returns the share index that owns each tick. */
export function tickOwners(shares: number[], count: number): number[] {
  const total = shares.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const owners: number[] = [];
  let acc = 0;
  shares.forEach((share, index) => {
    acc += share;
    const end = Math.round((acc / total) * count);
    while (owners.length < end) owners.push(index);
  });
  return owners;
}

/** Sums neighbouring values so a long series fits in at most `max` buckets. */
export function bucketSum(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const size = Math.ceil(values.length / max);
  const out: number[] = [];
  for (let i = 0; i < values.length; i += size) {
    out.push(values.slice(i, i + size).reduce((a, b) => a + b, 0));
  }
  return out;
}
