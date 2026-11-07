import type { AnalyticsOverviewResponse } from '../core/api/analytics.requests';
import { percentChange } from './bento-chart';

export interface InsightSeries {
  dates: string[];
  plays: number[];
  downloads: number[];
  /** Major currency units (the backend already converted to the selected report currency). */
  revenue: number[];
  totals: { plays: number; downloads: number; revenue: number };
  /** Percent change per metric, or null when there is nothing to compare against. */
  change: { plays: number | null; downloads: number | null; revenue: number | null };
  /** What `change` compares: shown as the hint under each delta. */
  comparedWith: string;
}

const DAY = 86400000;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Daily plays, downloads and revenue for the bento charts.
 *
 * - With `windowDays` (dashboard): the last N calendar days ending `today`, gaps filled with 0,
 *   compared with the N days before. The response must cover 2N days.
 * - Without it (studio): the rows exactly as the API returned them, later half vs earlier half.
 */
export function buildInsightSeries(
  data: AnalyticsOverviewResponse | null | undefined,
  options: { windowDays?: number; today?: Date } = {},
): InsightSeries {
  const plays = new Map((data?.plays_by_day ?? []).map((r) => [r.date.slice(0, 10), r.count]));
  const downloads = new Map(
    (data?.downloads_by_day ?? []).map((r) => [r.date.slice(0, 10), r.count]),
  );
  const revenue = new Map(
    (data?.revenue_by_day ?? []).map((r) => [r.date.slice(0, 10), r.revenue]),
  );

  const { windowDays } = options;
  if (windowDays) {
    const end = new Date(options.today ?? new Date());
    const day = (offset: number) => isoDay(end.getTime() - offset * DAY);
    const span = (from: number) => Array.from({ length: windowDays }, (_, i) => day(from - i));
    const cur = span(windowDays - 1);
    const prev = span(windowDays * 2 - 1);
    const pick = (map: Map<string, number>, dates: string[]) => dates.map((d) => map.get(d) ?? 0);
    const curValues = {
      plays: pick(plays, cur),
      downloads: pick(downloads, cur),
      revenue: pick(revenue, cur),
    };
    const hasAny = data !== null && data !== undefined;
    const totals = {
      plays: sum(curValues.plays),
      downloads: sum(curValues.downloads),
      revenue: sum(curValues.revenue),
    };
    return {
      dates: hasAny ? cur : [],
      plays: hasAny ? curValues.plays : [],
      downloads: hasAny ? curValues.downloads : [],
      revenue: hasAny ? curValues.revenue : [],
      totals,
      change: {
        plays: percentChange(totals.plays, sum(pick(plays, prev))),
        downloads: percentChange(totals.downloads, sum(pick(downloads, prev))),
        revenue: percentChange(totals.revenue, sum(pick(revenue, prev))),
      },
      comparedWith: `vs previous ${windowDays} days`,
    };
  }

  const dates = [...new Set([...plays.keys(), ...downloads.keys(), ...revenue.keys()])].sort();
  const series = {
    plays: dates.map((d) => plays.get(d) ?? 0),
    downloads: dates.map((d) => downloads.get(d) ?? 0),
    revenue: dates.map((d) => revenue.get(d) ?? 0),
  };
  const half = (values: number[]) => {
    const n = Math.floor(values.length / 2);
    if (n < 2) return null;
    return percentChange(sum(values.slice(-n)), sum(values.slice(-2 * n, -n)));
  };
  return {
    dates,
    ...series,
    totals: {
      plays: dates.length ? sum(series.plays) : (data?.total_plays ?? 0),
      downloads: dates.length ? sum(series.downloads) : (data?.total_downloads ?? 0),
      revenue: dates.length ? sum(series.revenue) : (data?.total_revenue ?? 0),
    },
    change: {
      plays: half(series.plays),
      downloads: half(series.downloads),
      revenue: half(series.revenue),
    },
    comparedWith: 'vs earlier half',
  };
}

/** Short axis label for a `YYYY-MM-DD` date, e.g. "Nov 7". */
export function shortDateLabel(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
