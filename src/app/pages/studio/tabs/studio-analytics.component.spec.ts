import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AnalyticsService } from '../../../services/analytics.service';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { LabService } from '../../../services';
import { StudioAnalyticsComponent } from './studio-analytics.component';

describe('StudioAnalyticsComponent', () => {
  const getOverview = vi.fn();
  const getTopSpecs = vi.fn();
  const downloadAnalyticsCsv = vi.fn();
  const getSpecs = vi.fn();

  const overview = {
    total_plays: 10,
    total_revenue: 20,
    total_downloads: 5,
    total_favorites: 3,
    plays_by_day: [
      { date: '2026-02-20', count: 5 },
      { date: '2026-02-21', count: 7 },
    ],
    downloads_by_day: [{ date: '2026-02-21', count: 2 }],
    revenue_by_day: [{ date: '2026-02-21', revenue: 200 }],
    revenue_by_license: { Basic: 100, Premium: 100 },
  } as any;

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: { getOverview, getTopSpecs } },
        { provide: CsvExportService, useValue: { downloadAnalyticsCsv } },
        { provide: LabService, useValue: { getSpecs } },
      ],
    });

    return TestBed.runInInjectionContext(() => new StudioAnalyticsComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getOverview.mockReturnValue(of(overview));
    getTopSpecs.mockReturnValue(
      of([
        { spec_id: 's1', title: 'A', plays: 10, revenue: 20, downloads: 3 },
        { spec_id: 's2', title: 'B', plays: 4, revenue: 7, downloads: 1 },
      ]),
    );
    getSpecs.mockReturnValue(of([{ id: 's1', title: 'A', imageUrl: 'a.png' }]));
  });

  it('loads analytics and chart data on construction', () => {
    const component = create();

    expect(getOverview).toHaveBeenCalledWith(30, 'plays');
    expect(getTopSpecs).toHaveBeenCalledWith(5, 'plays');
    expect(component.isLoading()).toBe(false);
    expect(component.data()).toEqual(overview);
    expect(component.topSpecs().length).toBe(2);
    expect(component.lineChartData().labels).toEqual(['2026-02-20', '2026-02-21']);
    expect(component.revenueChartData().datasets[0].data).toEqual([200]);
    expect(component.doughnutChartData().labels).toEqual(['Basic', 'Premium']);
  });

  it('handles load errors, filter changes, and top-spec sorting', () => {
    getOverview.mockReturnValueOnce(throwError(() => new Error('boom')));
    const component = create();

    expect(component.error()).toBe('Failed to load analytics data');
    expect(component.isLoading()).toBe(false);

    component.onSort('plays');
    expect(component.sortDirection()).toBe('asc');
    expect(component.topSpecs().map((spec) => spec.spec_id)).toEqual(['s2', 's1']);

    component.onSort('downloads');
    expect(component.sortBy()).toBe('downloads');
    expect(component.sortDirection()).toBe('desc');
    expect(getTopSpecs).toHaveBeenLastCalledWith(5, 'downloads');

    getOverview.mockClear();
    component.setFilter(30);
    expect(getOverview).not.toHaveBeenCalled();
    component.setFilter(7);
    expect(component.currentDays()).toBe(7);
    expect(getOverview).toHaveBeenCalledWith(7, 'downloads');
  });

  it('exports csv, resolves legend colors, and executes gradient callbacks', () => {
    const component = create();

    component.exportCSV();
    expect(downloadAnalyticsCsv).toHaveBeenCalledWith(overview, 30);

    expect(component.getLegendColor(0)).toBe('#ef4444');
    expect(component.getLegendColor(99)).toBe('#ccc');

    component.doughnutChartData.set({ labels: [], datasets: [] } as any);
    expect(component.getLegendColor(0)).toBe('#ccc');
    component.doughnutChartData.set({
      labels: ['Only'],
      datasets: [{ data: [1], backgroundColor: '#123456' } as any],
    });
    expect(component.getLegendColor(0)).toBe('#123456');

    const fakeCanvasCtx = {
      createLinearGradient: () => ({
        addColorStop: vi.fn(),
      }),
    } as any;

    const lineBgFn = component.lineChartData().datasets[0].backgroundColor as any;
    const revenueBgFn = component.revenueChartData().datasets[0].backgroundColor as any;

    expect(lineBgFn({ chart: { ctx: fakeCanvasCtx } })).toBeTruthy();
    expect(revenueBgFn({ chart: { ctx: fakeCanvasCtx } })).toBeTruthy();
  });

  it('computes charts, hover state, labels, and breakdown helpers', () => {
    const component = create();

    expect(getSpecs).toHaveBeenCalledWith({ category: 'beat', per_page: 12, sort: 'plays' });
    expect(component.trendPoints()).toEqual([
      { date: '2026-02-20', plays: 5, downloads: 0, playsH: 71, dlH: 0 },
      { date: '2026-02-21', plays: 7, downloads: 2, playsH: 100, dlH: 29 },
    ]);
    expect(component.playsLinePoints()).toContain('0,72.2');
    expect(component.playsAreaPoints()).toContain('800,200');
    expect(component.downloadsLinePoints()).toContain('800,147.8');
    expect(component.revenueBars()).toEqual([{ date: '2026-02-21', val: 200, h: 100 }]);
    expect(component.licenseBreakdown()).toEqual([
      expect.objectContaining({ label: 'Basic', value: 100, share: 50 }),
      expect.objectContaining({ label: 'Premium', value: 100, share: 50 }),
    ]);
    expect(component.donutSegments()[0]).toEqual(
      expect.objectContaining({ dash: '151 151', offset: -0 }),
    );
    expect(component.totalLicenseCount()).toBe(2);
    expect(component.currency(1234.4)).toBe('$1,234');
    expect(component.rangeLabel()).toBe('last 30 days');
    component.currentDays.set(365);
    expect(component.rangeLabel()).toBe('last year');
    component.currentDays.set(999);
    expect(component.rangeLabel()).toBe('all time');

    const target = {
      getBoundingClientRect: () => ({ left: 0, width: 800 }),
    } as HTMLElement;
    component.onBigChartMove({ currentTarget: target, clientX: 800 } as MouseEvent);
    expect(component.hoveredBigPoint()).toEqual(
      expect.objectContaining({ revenue: 200, plays: 5, label: 'Feb 21' }),
    );
    component.clearBigChartHover();
    expect(component.hoveredBigPoint()).toBeNull();

    expect(component.shortDate('not-a-date')).toBe('Invalid Date');
    expect(component.buyerColor('')).toBe('var(--hot)');
    expect(component.buyerColor('A')).toBe('var(--tangerine)');
    expect(component.topSpecRows()[0].imageUrl).toBe('a.png');
    expect(component.bigRevenueLinePath()).toContain('M ');
    expect(component.bigRevenueAreaPath()).toContain('Z');
    expect(component.bigPlaysLinePath()).toContain('M ');
    expect(component.bigPlaysAreaPath()).toContain('Z');
  });

  it('falls back cleanly when analytics data and artwork are missing', () => {
    getOverview.mockReturnValueOnce(
      of({
        total_plays: 0,
        total_revenue: 0,
        total_downloads: 0,
        total_favorites: 0,
        revenue_by_license: {},
      } as any),
    );
    getTopSpecs.mockReturnValueOnce(of([]));
    getSpecs.mockReturnValueOnce(throwError(() => new Error('art fail')));

    const component = create();

    expect(component.trendPoints()).toEqual([]);
    expect(component.playsLinePoints()).toBe('');
    expect(component.playsAreaPoints()).toBe('');
    expect(component.downloadsLinePoints()).toBe('');
    expect(component.revenueBars()).toEqual([]);
    expect(component.licenseBreakdown()).toEqual([]);
    expect(component.donutSegments()).toEqual([]);
    expect(component.totalLicenseCount()).toBe(0);
    expect(component.topSpecRows()).toEqual([]);
    expect(component.bigSeries().revenue.length).toBe(1);
    expect(component.analyticsCards()[0].value).toBe('0');
    component.data.set(null);
    expect(component.bigSeries().revenue.length).toBe(1);
    component.exportCSV();
    expect(downloadAnalyticsCsv).not.toHaveBeenCalled();
  });
});
