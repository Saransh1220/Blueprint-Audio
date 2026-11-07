import type { AnalyticsOverviewResponse } from '../core/api/analytics.requests';
import { buildInsightSeries, shortDateLabel } from './bento-insights';

const TODAY = new Date('2026-11-10T12:00:00Z');
const iso = (offset: number) =>
  new Date(TODAY.getTime() - offset * 86400000).toISOString().slice(0, 10);

function data(overrides: Partial<AnalyticsOverviewResponse> = {}): AnalyticsOverviewResponse {
  return {
    total_plays: 77,
    total_favorites: 0,
    total_revenue: 33,
    total_downloads: 11,
    plays_by_day: [],
    downloads_by_day: [],
    revenue_by_day: [],
    top_specs: [],
    revenue_by_license: {},
    ...overrides,
  };
}

describe('buildInsightSeries', () => {
  it('fills a calendar window with zeros and compares it with the previous window', () => {
    const series = buildInsightSeries(
      data({
        plays_by_day: [
          { date: iso(0), count: 6 },
          { date: iso(2), count: 4 },
          { date: iso(4), count: 5 },
        ],
        revenue_by_day: [{ date: iso(1), revenue: 9 }],
      }),
      { windowDays: 3, today: TODAY },
    );
    expect(series.dates).toEqual([iso(2), iso(1), iso(0)]);
    expect(series.plays).toEqual([4, 0, 6]);
    expect(series.revenue).toEqual([0, 9, 0]);
    expect(series.totals).toEqual({ plays: 10, downloads: 0, revenue: 9 });
    expect(series.change.plays).toBeCloseTo(100 * (10 / 5 - 1));
    expect(series.change.revenue).toBeNull();
    expect(series.comparedWith).toBe('vs previous 3 days');
  });

  it('returns empty series in window mode when there is no response yet', () => {
    const series = buildInsightSeries(null, { windowDays: 3, today: TODAY });
    expect(series.dates).toEqual([]);
    expect(series.plays).toEqual([]);
    expect(series.totals.plays).toBe(0);
  });

  it('keeps rows as returned and compares halves outside window mode', () => {
    const rows = [10, 10, 10, 10, 20, 20, 20, 20].map((count, i) => ({ date: iso(7 - i), count }));
    const series = buildInsightSeries(
      data({ plays_by_day: rows, revenue_by_day: [{ date: iso(0), revenue: 4 }] }),
    );
    expect(series.dates).toHaveLength(8);
    expect(series.totals.plays).toBe(120);
    expect(series.change.plays).toBe(100);
    expect(series.change.revenue).toBeNull();
    expect(series.comparedWith).toBe('vs earlier half');
  });

  it('falls back to response totals when there are no daily rows', () => {
    const series = buildInsightSeries(data());
    expect(series.totals).toEqual({ plays: 77, downloads: 11, revenue: 33 });
    expect(series.change.plays).toBeNull();
    expect(buildInsightSeries(undefined).totals).toEqual({ plays: 0, downloads: 0, revenue: 0 });
  });
});

describe('shortDateLabel', () => {
  it('formats ISO dates and returns bad input unchanged', () => {
    expect(shortDateLabel('2026-11-07')).toBe('Nov 7');
    expect(shortDateLabel('nope')).toBe('nope');
  });
});
