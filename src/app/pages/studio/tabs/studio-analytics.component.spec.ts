import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { LabService } from '../../../services';
import { AnalyticsService } from '../../../services/analytics.service';
import { PaymentService } from '../../../services/payment.service';
import { StudioAnalyticsComponent } from './studio-analytics.component';

describe('StudioAnalyticsComponent', () => {
  const getOverview = vi.fn();
  const getTopSpecs = vi.fn();
  const downloadAnalyticsCsv = vi.fn();
  const getSpecs = vi.fn();
  const getProducerOrders = vi.fn();

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
        { provide: PaymentService, useValue: { getProducerOrders } },
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
    getProducerOrders.mockReturnValue(of({ orders: [{ currency: 'USD' }] }));
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
    expect(component.currency(1234.4)).toBe('$1,234.40');
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

describe('StudioAnalyticsComponent (refreshed analytics)', () => {
  const getOverview = vi.fn();
  const getTopSpecs = vi.fn();
  const downloadAnalyticsCsv = vi.fn();
  const getSpecs = vi.fn();
  const getProducerOrders = vi.fn();

  const days = (n: number, valueOf: (i: number) => number, key = 'count') =>
    Array.from({ length: n }, (_, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, '0')}`,
      [key]: valueOf(i),
    }));
  const halves = (n: number, prev: number, cur: number) => (i: number) => (i < n / 2 ? prev : cur);

  const dataOverview = (prev = 10, cur = 20, n = 14) =>
    ({
      total_plays: 1234,
      total_revenue: 5000,
      total_downloads: 90,
      total_favorites: 12,
      plays_by_day: days(n, halves(n, prev, cur)),
      downloads_by_day: days(n, halves(n, prev, cur)),
      revenue_by_day: days(n, halves(n, prev, cur), 'revenue'),
      revenue_by_license: { Basic: 100, Premium: 300 },
    }) as any;

  const specs = [
    { spec_id: 's1', title: 'Alpha', plays: 1500, revenue: 200, downloads: 3 },
    { spec_id: 's2', title: 'Beta', plays: 4, revenue: 7, downloads: 1 },
  ];

  function setup(withLab = true) {
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: { getOverview, getTopSpecs } },
        { provide: CsvExportService, useValue: { downloadAnalyticsCsv } },
        ...(withLab ? [{ provide: LabService, useValue: { getSpecs } }] : []),
        { provide: PaymentService, useValue: { getProducerOrders } },
      ],
    });
    const fixture = TestBed.createComponent(StudioAnalyticsComponent);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    getOverview.mockReturnValue(of(dataOverview()));
    getTopSpecs.mockReturnValue(of(specs));
    getSpecs.mockReturnValue(of([{ id: 's1', title: 'Alpha', imageUrl: 'a.png' }, { id: 'x' }]));
    getProducerOrders.mockReturnValue(of({ orders: [{ currency: 'USD' }] }));
  });

  it('builds metric tiles with half-over-half changes and sparklines', () => {
    const { c } = setup();
    const tiles = c.metricTiles();
    expect(tiles.map((t) => t.label)).toEqual(['Plays', 'Revenue', 'Downloads', 'Favorites']);
    expect(tiles[0]).toEqual(
      expect.objectContaining({ value: '210', delta: '+100.0%', up: true, hint: 'vs earlier half' }),
    );
    expect(tiles[0].spark.split(' ').length).toBe(14);
    expect(tiles[1].value).toBe('$210');
    expect(tiles[2].value).toBe('210');
    expect(tiles[3]).toEqual(
      expect.objectContaining({ value: '12', delta: '', up: null, hint: 'All time', spark: '' }),
    );
  });

  it('reports decreases and skips changes without a baseline or enough points', () => {
    getOverview.mockReturnValue(of(dataOverview(20, 10)));
    expect(setup().c.metricTiles()[0]).toEqual(
      expect.objectContaining({ delta: '−50.0%', up: false }),
    );

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(of(dataOverview(0, 10)));
    expect(setup().c.metricTiles()[0]).toEqual(expect.objectContaining({ delta: '', up: null }));

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(of(dataOverview(10, 20, 3)));
    const tile = setup().c.metricTiles()[0];
    expect(tile.delta).toBe('');
    expect(tile.hint).toBe('last 30 days');
  });

  it('uses totals when there are no daily rows', () => {
    getOverview.mockReturnValue(
      of({
        total_plays: 1234,
        total_revenue: 5000,
        total_downloads: 90,
        total_favorites: 12,
        revenue_by_license: {},
      }),
    );
    const { c } = setup();
    const tiles = c.metricTiles();
    expect(tiles[0].value).toBe('1,234');
    expect(tiles[0].spark).toBe('');
    expect(tiles[1].value).toBe('$5,000');
    expect(tiles[2].value).toBe('90');
    expect(c.hasTrend()).toBe(false);
    expect(c.chartAxis()).toEqual([]);
  });

  it('handles a missing overview', () => {
    getOverview.mockReturnValue(throwError(() => new Error('x')));
    const { c } = setup();
    expect(c.hasTrend()).toBe(false);
    expect(c.metricTiles()[0].value).toBe('0');
    expect(c.metricTiles()[3].value).toBe('0');
  });

  it('exposes the axis labels when there is a trend', () => {
    const { c } = setup();
    expect(c.hasTrend()).toBe(true);
    const axis = c.chartAxis();
    expect(axis.length).toBe(3);
    expect(axis[0]).toBe(c.shortDate('2026-02-01'));
    expect(axis[2]).toBe('Today');
  });

  it('treats plays-only data as a trend and labels from plays', () => {
    getOverview.mockReturnValue(of({ ...dataOverview(), revenue_by_day: [] }));
    const { c } = setup();
    expect(c.hasTrend()).toBe(true);
    const s = c.bigSeries();
    expect(s.revenue.length).toBe(14);
    expect(s.revenue[0].label).toBe(c.shortDate('2026-02-01'));
  });

  it('treats revenue-only data as a trend and falls back for plays', () => {
    getOverview.mockReturnValue(of({ ...dataOverview(), plays_by_day: [] }));
    const { c } = setup();
    expect(c.hasTrend()).toBe(true);
    expect(c.bigSeries().plays.length).toBe(14);
    expect(c.bigSeries().revenue[0].label).toBe(c.shortDate('2026-02-01'));
  });

  it('uses day labels for placeholder series when no rows exist', () => {
    getOverview.mockReturnValue(of({ ...dataOverview(), plays_by_day: [], revenue_by_day: [] }));
    const { c } = setup();
    expect(c.bigSeries().revenue[0].label).toBe('Day 1');
  });

  it('clamps the hovered plays point when plays are shorter than revenue', () => {
    getOverview.mockReturnValue(of({ ...dataOverview(), plays_by_day: days(3, () => 5) }));
    const { c } = setup();
    const target = { getBoundingClientRect: () => ({ left: 0, width: 800 }) } as HTMLElement;
    c.onBigChartMove({ currentTarget: target, clientX: 800 } as MouseEvent);
    expect(c.hoveredBigPoint()?.plays).toBeGreaterThan(0);
    c.onBigChartMove({ currentTarget: target, clientX: 0 } as MouseEvent);
    expect(c.hoveredBigPoint()?.x).toBeLessThan(100);
  });

  it('reports every range label and filter change', () => {
    const { c } = setup();
    for (const [d, label] of [
      [7, 'last 7 days'],
      [30, 'last 30 days'],
      [90, 'last 90 days'],
      [365, 'last year'],
      [3650, 'all time'],
    ] as const) {
      c.currentDays.set(d);
      expect(c.rangeLabel()).toBe(label);
    }
    c.setFilter(90);
    expect(getOverview).toHaveBeenLastCalledWith(90, 'plays');
  });

  it('sorts asc/desc and toggles direction on repeated clicks', () => {
    const { c } = setup();
    c.onSort('revenue');
    expect(c.sortBy()).toBe('revenue');
    expect(c.sortDirection()).toBe('desc');
    expect(c.topSpecs().map((s) => s.spec_id)).toEqual(['s1', 's2']);
    c.onSort('revenue');
    expect(c.sortDirection()).toBe('asc');
    expect(c.topSpecs().map((s) => s.spec_id)).toEqual(['s2', 's1']);
    c.onSort('revenue');
    expect(c.sortDirection()).toBe('desc');
  });

  it('falls back to INR when orders have no currency, and survives order errors', () => {
    getProducerOrders.mockReturnValue(of({ orders: [{}] }));
    expect(setup().c.producerCurrency()).toBe('INR');
    TestBed.resetTestingModule();
    getProducerOrders.mockReturnValue(of({ orders: [] }));
    expect(setup().c.producerCurrency()).toBe('INR');
    TestBed.resetTestingModule();
    getProducerOrders.mockReturnValue(of({}));
    expect(setup().c.producerCurrency()).toBe('INR');
    TestBed.resetTestingModule();
    getProducerOrders.mockReturnValue(throwError(() => new Error('x')));
    expect(setup().c.producerCurrency()).toBe('INR');
  });

  it('works without a LabService and with a string legend color', () => {
    const { c } = setup(false);
    expect(c.trackArtwork()).toEqual({});
    c.doughnutChartData.set({ datasets: [{ backgroundColor: '#fff' }] });
    expect(c.getLegendColor(0)).toBe('#fff');
    expect(c.getLegendColor(2)).toBe('#ccc');
  });

  it('counts license types from values, falling back to the number of types', () => {
    const { c } = setup();
    expect(c.totalLicenseCount()).toBe(2);
    getOverview.mockReturnValue(
      of({ ...dataOverview(), revenue_by_license: { A: 5000, B: 3000 } }),
    );
    c.loadData();
    expect(c.totalLicenseCount()).toBe(8);
  });

  it('falls back on date formatting errors and gradients without a canvas', () => {
    const { c } = setup();
    const bg = c.lineChartData().datasets[0].backgroundColor as any;
    expect(bg({ chart: {} })).toBe('rgba(239,68,68,0.25)');
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new Error('bad');
    });
    expect(c.shortDate('2026-02-21')).toBe('02-21');
    vi.restoreAllMocks();
  });

  it('renders the loading state', () => {
    getOverview.mockReturnValue(NEVER);
    const { el } = setup();
    expect(el.textContent).toContain('Calculating trends…');
  });

  it('renders the error notice and the no-trend state', () => {
    getOverview.mockReturnValue(throwError(() => new Error('x')));
    getTopSpecs.mockReturnValue(of([]));
    const { el } = setup();
    expect(el.querySelector('.notice')?.textContent).toContain('Failed to load analytics data');
    expect(el.textContent).toContain('No plays or sales in this range yet.');
    expect(el.textContent).toContain('Your top-performing beats will appear here.');
    expect(el.textContent).toContain('No license revenue in this range yet.');
    expect((el.querySelector('.su-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the loaded dashboard and wires up the controls', () => {
    const { c, el, fixture } = setup();
    expect(el.textContent).toContain('Performance for the last 30 days.');
    expect(el.querySelectorAll('su-stat').length).toBe(4);
    expect(el.querySelectorAll('.axis span').length).toBe(3);
    expect(el.textContent).toContain('Alpha');
    expect(el.querySelector('.row-beats img')?.getAttribute('src')).toBe('a.png');
    expect(el.querySelector('.cover-fallback')?.textContent?.trim()).toBe('B');
    expect(el.querySelectorAll('.donut-seg').length).toBe(2);
    expect(el.textContent).toContain('Premium');
    expect(el.textContent).toContain('Top countries');

    const chart = el.querySelector('.chart') as HTMLElement;
    chart.getBoundingClientRect = () => ({ left: 0, width: 800 }) as DOMRect;
    chart.dispatchEvent(new MouseEvent('mousemove', { clientX: 400 }));
    fixture.detectChanges();
    expect(el.querySelector('.tooltip')).not.toBeNull();
    chart.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(el.querySelector('.tooltip')).toBeNull();

    const sortBtns = el.querySelectorAll('.seg-sm button');
    (sortBtns[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(c.sortDirection()).toBe('asc');
    expect(sortBtns[0].textContent).toContain('↑');
    (sortBtns[1] as HTMLElement).click();
    fixture.detectChanges();
    expect(c.sortBy()).toBe('revenue');
    expect(sortBtns[1].textContent).toContain('↓');
    (sortBtns[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(c.sortBy()).toBe('downloads');

    (el.querySelector('.su-btn') as HTMLElement).click();
    expect(downloadAnalyticsCsv).toHaveBeenCalled();

    const tabs = el.querySelectorAll('.seg[role=tablist] button');
    (tabs[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(c.currentDays()).toBe(7);
    expect(el.textContent).toContain('last 7 days');
    (tabs[4] as HTMLElement).click();
    fixture.detectChanges();
    expect(c.currentDays()).toBe(3650);
  });
});
