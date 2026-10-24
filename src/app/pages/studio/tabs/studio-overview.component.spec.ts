import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { AuthService, LabService } from '../../../services';
import { AnalyticsService } from '../../../services/analytics.service';
import { PaymentService } from '../../../services/payment.service';
import { StudioOverviewComponent } from './studio-overview.component';

describe('StudioOverviewComponent', () => {
  const getOverview = vi.fn();
  const getProducerOrders = vi.fn();
  const getSpecs = vi.fn();
  const currentUser = signal<any>({ id: 'u1', display_name: 'Blaze' });

  const overview = {
    total_plays: 1234,
    total_revenue: 5678,
    total_downloads: 90,
    total_favorites: 12,
    plays_by_day: [
      { date: '2026-02-20', count: 5 },
      { date: '2026-02-21', count: 10 },
    ],
    downloads_by_day: [{ date: '2026-02-21', count: 3 }],
    revenue_by_day: [{ date: '2026-02-21', revenue: 200 }],
    revenue_by_license: { Basic: 100, Premium: 300 },
    top_specs: [
      { spec_id: 's1', title: 'First', plays: 50, downloads: 4, revenue: 200 },
      { spec_id: 's2', title: 'Second', plays: 25, downloads: 2, revenue: 120 },
    ],
  } as any;

  const ordersResponse = {
    orders: [
      {
        id: 'o1',
        amount: 1999,
        currency: 'INR',
        status: 'PAID',
        created_at: '2026-03-01T00:00:00.000Z',
        license_type: 'Basic',
        buyer_name: 'Sam',
        buyer_email: 'sam@example.com',
        spec_title: 'First',
      },
    ],
    total: 1,
    limit: 5,
    offset: 0,
  };

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: { getOverview } },
        { provide: PaymentService, useValue: { getProducerOrders } },
        { provide: AuthService, useValue: { currentUser } },
        { provide: LabService, useValue: { getSpecs } },
      ],
    });

    return TestBed.runInInjectionContext(() => new StudioOverviewComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.set({ id: 'u1', display_name: 'Blaze' });
    getOverview.mockReturnValue(of(overview));
    getProducerOrders.mockReturnValue(of(ordersResponse));
    getSpecs.mockReturnValue(of([{ id: 's1', title: 'First', imageUrl: 'cover.png' }]));
  });

  it('loads analytics and recent orders on construction', () => {
    const component = create();

    expect(getOverview).toHaveBeenCalledWith(30, 'plays');
    expect(getProducerOrders).toHaveBeenCalledWith(1, 5);
    expect(component.analyticsData()).toEqual(overview);
    expect(component.topSpecs()).toEqual(overview.top_specs);
    expect(component.recentOrders()).toEqual(ordersResponse.orders);
    expect(component.isLoadingAnalytics()).toBe(false);
    expect(component.isLoadingOrders()).toBe(false);
    expect(component.kpiCards().map((card) => card.value)).toEqual(['1,234', '₹5,678', '90', '12']);
  });

  it('keeps loading flags and fallback KPI values consistent on service errors', () => {
    getOverview.mockReturnValueOnce(throwError(() => new Error('analytics failed')));
    getProducerOrders.mockReturnValueOnce(throwError(() => new Error('orders failed')));

    const component = create();

    expect(component.analyticsData()).toBeNull();
    expect(component.topSpecs()).toEqual([]);
    expect(component.recentOrders()).toEqual([]);
    expect(component.isLoadingAnalytics()).toBe(false);
    expect(component.isLoadingOrders()).toBe(false);
    expect(component.kpiCards().every((card) => card.value === '—')).toBe(true);
  });
  it('computes dashboard summaries, charts, and activity from loaded data', () => {
    const component = create();

    expect(getSpecs).toHaveBeenCalledWith({ category: 'beat', per_page: 12, sort: 'plays' });
    expect(component.displayName()).toBe('Blaze');
    expect(component.firstName()).toBe('Blaze');
    expect(component.formattedPlays()).toBe('1.2k');
    expect(component.formattedRevenue()).toBe('5.7k');
    expect(component.formattedDownloads()).toBe('90');
    expect(component.formattedFavorites()).toBe('12');
    expect(component.liveBeatCount()).toBe(2);
    expect(component.readyToWithdraw()).toBe(1022);
    expect(component.recentOrderCount()).toBe(3);
    expect(component.revenueTotalLabel()).toBe('₹5,678');
    expect(component.recentSales()[0]).toEqual(
      expect.objectContaining({ id: 'o1', title: 'First', buyer: 'Sam', license: 'Basic' }),
    );
    expect(component.activityItems()[0].text).toContain('Sam bought Basic');
    expect(component.topBeatRows()[0]).toEqual(
      expect.objectContaining({ rank: '01', share: 100, letter: 'f', imageUrl: 'cover.png' }),
    );
    expect(component.revenuePoints().length).toBeGreaterThan(0);
    expect(component.revenueLinePath()).toContain('M ');
    expect(component.revenueAreaPath()).toContain('220 Z');

    const target = {
      getBoundingClientRect: () => ({ left: 0, width: 600 }),
    } as HTMLElement;
    component.onRevenueChartMove({ currentTarget: target, clientX: 590 } as MouseEvent);
    expect(component.hoveredRevenuePoint()).toEqual(expect.objectContaining({ value: 200 }));
    component.clearRevenueHover();
    expect(component.hoveredRevenuePoint()).toBeNull();
  });

  it('uses fallback values and helper formatters when data is sparse', () => {
    currentUser.set({ id: 'u1', name: 'Producer Name' });
    getOverview.mockReturnValueOnce(
      of({
        total_plays: 999,
        total_revenue: 123456,
        total_downloads: 0,
        total_favorites: 0,
        plays_by_day: [],
        downloads_by_day: [],
        revenue_by_day: [],
        revenue_by_license: { Basic: 100, Premium: 300 },
        top_specs: [],
      } as any),
    );
    getProducerOrders.mockReturnValueOnce(of({ orders: [], total: 0, limit: 5, offset: 0 }));
    getSpecs.mockReturnValueOnce(throwError(() => new Error('art fail')));

    const component = create();

    expect(component.displayName()).toBe('Producer Name');
    expect(component.firstName()).toBe('Producer');
    expect(component.formattedPlays()).toBe('999');
    expect(component.formattedRevenue()).toBe('1.2L');
    expect(component.liveBeatCount()).toBe(24);
    expect(component.recentOrderCount()).toBe(3);
    expect(component.activityItems()[0].text).toContain('5-star review');
    expect(component.licenseRows()).toEqual([
      { label: 'Premium', value: 300, share: 75 },
      { label: 'Basic', value: 100, share: 25 },
    ]);
    expect(component.revenuePoints().length).toBe(30);
    expect(component.trendPoints()).toEqual([]);
    expect(component.playsLinePoints()).toBe('');
    expect(component.playsAreaPoints()).toBe('');
    expect(component.downloadsLinePoints()).toBe('');
    expect(component.shortDate('not-a-date')).toBe('Invalid Date');
    expect(component.formatDate('not-a-date')).toBe('Invalid Date');
    expect(component.buyerColor('')).toBe('var(--hot)');
    expect(component.buyerColor('A')).toBe('var(--tangerine)');
    expect(component.currency(0)).toBe('₹0');
  });
});

describe('StudioOverviewComponent (refreshed overview)', () => {
  const getOverview = vi.fn();
  const getProducerOrders = vi.fn();
  const getSpecs = vi.fn();
  const currentUser = signal<any>({ id: 'u1', display_name: 'Blaze Runner' });

  const days = (n: number, valueOf: (i: number) => number, key = 'count') =>
    Array.from({ length: n }, (_, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, '0')}`,
      [key]: valueOf(i),
    }));

  const twoWeeks = (prev: number, cur: number) => (i: number) => (i < 7 ? prev : cur);

  const dataOverview = (prev = 10, cur = 20) =>
    ({
      total_plays: 1234,
      total_revenue: 250000,
      total_downloads: 90,
      total_favorites: 12,
      plays_by_day: days(14, twoWeeks(prev, cur)),
      downloads_by_day: days(14, twoWeeks(prev, cur)),
      revenue_by_day: days(14, twoWeeks(prev, cur), 'revenue'),
      revenue_by_license: { Basic: 100, Premium: 300 },
      top_specs: [
        { spec_id: 's1', title: 'First', plays: 50, downloads: 4, revenue: 200 },
        { spec_id: 's2', title: 'Second', plays: 25, downloads: 2, revenue: 120 },
      ],
    }) as any;

  const order = (over: Record<string, unknown> = {}) => ({
    id: 'o1',
    amount: 1999,
    currency: 'INR',
    status: 'PAID',
    created_at: new Date().toISOString(),
    license_type: 'Basic',
    buyer_name: 'Sam',
    buyer_email: 'sam@example.com',
    spec_title: 'First',
    ...over,
  });

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: AnalyticsService, useValue: { getOverview } },
        { provide: PaymentService, useValue: { getProducerOrders } },
        { provide: AuthService, useValue: { currentUser } },
        { provide: LabService, useValue: { getSpecs } },
      ],
    });
    const fixture = TestBed.createComponent(StudioOverviewComponent);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    getOverview.mockReturnValue(of(dataOverview()));
    getProducerOrders.mockReturnValue(of({ orders: [order()], total: 1, limit: 5, offset: 0 }));
    getSpecs.mockReturnValue(of([{ id: 's1', title: 'First', imageUrl: 'cover.png' }]));
  });

  it('computes the weekly revenue delta (up, down, and not enough data)', () => {
    expect(setup().c.revenueDelta()).toEqual({ text: '+100.0%', up: true });

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(of(dataOverview(20, 10)));
    expect(setup().c.revenueDelta()).toEqual({ text: '−50.0%', up: false });

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(of(dataOverview(0, 10)));
    expect(setup().c.revenueDelta()).toBeNull();

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(
      of({ ...dataOverview(), revenue_by_day: days(5, () => 1, 'revenue') }),
    );
    expect(setup().c.revenueDelta()).toBeNull();
  });

  it('builds stat tiles with deltas and sparklines when there is data', () => {
    const { c } = setup();
    const tiles = c.statTiles();
    expect(tiles.map((t) => t.label)).toEqual(['Plays', 'Revenue', 'Downloads', 'Favorites']);
    expect(tiles[0]).toEqual(
      expect.objectContaining({ delta: '+100.0%', up: true, hint: '7d vs prior 7d', accent: 'hot' }),
    );
    expect(tiles[0].spark.split(' ').length).toBe(14);
    expect(tiles[3]).toEqual(
      expect.objectContaining({ delta: '', up: null, hint: 'All time', spark: '' }),
    );
  });

  it('falls back to hints and placeholders when there is no analytics data', () => {
    getOverview.mockReturnValue(throwError(() => new Error('x')));
    const { c } = setup();
    const tiles = c.statTiles();
    expect(tiles[0]).toEqual(
      expect.objectContaining({ value: '—', delta: '', up: null, hint: 'Total plays', spark: '' }),
    );
    expect(tiles[1].hint).toBe('Total revenue');
    expect(tiles[2].hint).toBe('Total downloads');
  });

  it('describes the studio status for every state', () => {
    getOverview.mockReturnValue(NEVER);
    getProducerOrders.mockReturnValue(NEVER);
    expect(setup().c.statusLine()).toBe('Loading your studio…');

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(of(dataOverview()));
    getProducerOrders.mockReturnValue(of({ orders: [order(), order({ id: 'o2' })] }));
    expect(setup().c.statusLine()).toBe('2 top beats tracked · 2 recent orders.');

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(
      of({ ...dataOverview(), top_specs: [{ spec_id: 's1', title: 'One', plays: 1 }] }),
    );
    getProducerOrders.mockReturnValue(of({ orders: [order()] }));
    expect(setup().c.statusLine()).toBe('1 top beat tracked · 1 recent order.');

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(of({ ...dataOverview(), top_specs: [] }));
    getProducerOrders.mockReturnValue(of({ orders: [] }));
    expect(setup().c.statusLine()).toBe('Here’s how your catalog is doing.');
  });

  it('labels the chart axis with first, middle and Today', () => {
    const { c } = setup();
    const axis = c.chartAxis();
    expect(axis.length).toBe(3);
    expect(axis[2]).toBe('Today');
    expect(axis[0]).toBe(c.shortDate('2026-02-01'));
  });

  it('formats relative times', () => {
    const { c } = setup();
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
    expect(c.timeAgo(undefined)).toBe('');
    expect(c.timeAgo(ago(0))).toBe('1m ago');
    expect(c.timeAgo(ago(15 * 60000))).toBe('15m ago');
    expect(c.timeAgo(ago(3 * 3600000))).toBe('3h ago');
    expect(c.timeAgo(ago(4 * 86400000))).toBe('4d ago');
    const old = ago(60 * 86400000);
    expect(c.timeAgo(old)).toBe(c.formatDate(old));
  });

  it('renders the loaded overview', () => {
    const { c, el, fixture } = setup();
    expect(el.textContent).toContain('Blaze.');
    expect(el.textContent).toContain('2 top beats tracked · 1 recent order.');
    expect(el.querySelectorAll('su-stat').length).toBe(4);
    expect(el.textContent).toContain('vs prior week');
    expect(el.textContent).toContain('First');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('cover.png');
    expect(el.querySelector('.cover-fallback')?.textContent?.trim()).toBe('s');
    expect(el.textContent).toContain('Sam');
    expect(el.textContent).toContain('Premium');
    expect(el.querySelectorAll('.axis span').length).toBe(3);

    const chart = el.querySelector('.chart') as HTMLElement;
    chart.getBoundingClientRect = () => ({ left: 0, width: 600 }) as DOMRect;
    chart.dispatchEvent(new MouseEvent('mousemove', { clientX: 300 }));
    fixture.detectChanges();
    expect(el.querySelector('.tooltip')).not.toBeNull();
    expect(c.hoveredRevenuePoint()).not.toBeNull();
    chart.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(el.querySelector('.tooltip')).toBeNull();
  });

  it('renders a down delta and empty states', () => {
    getOverview.mockReturnValue(of(dataOverview(20, 10)));
    getProducerOrders.mockReturnValue(of({ orders: [] }));
    const { el } = setup();
    expect(el.querySelector('.delta.down')?.textContent).toContain('▼');
    expect(el.textContent).toContain('No sales yet');

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(of({ ...dataOverview(), top_specs: [], revenue_by_license: {} }));
    getProducerOrders.mockReturnValue(NEVER);
    const second = setup();
    expect(second.el.textContent).toContain('Upload beats to see your top performers');
    expect(second.el.textContent).toContain('No license revenue yet.');
    expect(second.el.textContent).toContain('Loading sales…');
  });

  it('builds trend lines from daily data', () => {
    const { c } = setup();
    const pts = c.trendPoints();
    expect(pts.length).toBe(7);
    expect(pts[6]).toEqual(expect.objectContaining({ plays: 20, downloads: 20, playsH: 100 }));
    expect(c.playsLinePoints().split(' ').length).toBe(7);
    expect(c.playsAreaPoints().startsWith('0,120 ')).toBe(true);
    expect(c.playsAreaPoints().endsWith('400,120')).toBe(true);
    expect(c.downloadsLinePoints().split(' ').length).toBe(7);
  });

  it('formats KPI values across magnitudes', () => {
    const base = dataOverview();
    const cases: [number, number, string, string][] = [
      [5, 500, '5', '500'],
      [2500, 2500, '2.5k', '2.5k'],
      [5, 250000, '5', '2.5L'],
    ];
    for (const [plays, revenue, p, r] of cases) {
      TestBed.resetTestingModule();
      getOverview.mockReturnValue(of({ ...base, total_plays: plays, total_revenue: revenue }));
      const { c } = setup();
      expect(c.formattedPlays()).toBe(p);
      expect(c.formattedRevenue()).toBe(r);
    }
  });

  it('uses safe fallbacks for anonymous users, sparse orders and artwork', () => {
    currentUser.set(null);
    getProducerOrders.mockReturnValue(
      of({
        orders: [
          order({
            currency: undefined,
            buyer_name: undefined,
            buyer_email: undefined,
            spec_title: undefined,
            license_type: undefined,
            amount: undefined,
          }),
        ],
      }),
    );
    getOverview.mockReturnValue(
      of({
        ...dataOverview(),
        top_specs: [
          { spec_id: 'x', title: 'Second', plays: 1 },
          { spec_id: 'y', title: '', plays: 100 },
        ],
      }),
    );
    getSpecs.mockReturnValue(
      of([
        { id: 'a', title: 'Second', imageUrl: 'second.png' },
        { id: 'b', title: 'NoImage' },
        { id: 'c', imageUrl: 'c.png' },
      ]),
    );
    const { c } = setup();
    expect(c.displayName()).toBe('Producer');
    expect(c.firstName()).toBe('Producer');
    expect(c.producerCurrency()).toBe('INR');
    expect(c.recentSales()[0]).toEqual(
      expect.objectContaining({ title: 'Untitled beat', buyer: 'Customer', license: 'License' }),
    );
    expect(c.activityItems()[1].text).toContain('added to pending revenue');
    const rows = c.topBeatRows();
    expect(rows[0].imageUrl).toBe('second.png');
    expect(rows[0].share).toBe(12);
    expect(rows[1].imageUrl).toBeNull();
    expect(rows[1].letter).toBe('b');
    expect(c.trackArtwork()).toEqual({ a: 'second.png', second: 'second.png', c: 'c.png' });
  });

  it('uses the order currency for USD producers', () => {
    getProducerOrders.mockReturnValue(of({ orders: [order({ currency: 'USD' })] }));
    const { c } = setup();
    expect(c.producerCurrency()).toBe('USD');
    expect(c.currency(10)).toBe('$10');
  });

  it('greets by time of day', () => {
    for (const [hour, text] of [
      [8, 'Morning'],
      [14, 'Afternoon'],
      [20, 'Evening'],
    ] as const) {
      TestBed.resetTestingModule();
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
      expect(setup().c.greeting()).toBe(text);
      vi.restoreAllMocks();
    }
  });

  it('picks the nearest revenue point when hovering', () => {
    const { c } = setup();
    const target = { getBoundingClientRect: () => ({ left: 0, width: 600 }) } as HTMLElement;
    c.onRevenueChartMove({ currentTarget: target, clientX: 0 } as MouseEvent);
    const first = c.hoveredRevenuePoint();
    c.onRevenueChartMove({ currentTarget: target, clientX: 600 } as MouseEvent);
    expect(first!.x).toBeLessThan(c.hoveredRevenuePoint()!.x);
  });

  it('falls back when date formatting throws', () => {
    const { c } = setup();
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new Error('bad');
    });
    expect(c.shortDate('2026-02-21')).toBe('02-21');
    expect(c.formatDate('2026-02-21')).toBe('');
    vi.restoreAllMocks();
  });

  it('works without a LabService', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: { getOverview } },
        { provide: PaymentService, useValue: { getProducerOrders } },
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
    const c = TestBed.runInInjectionContext(() => new StudioOverviewComponent());
    expect(c.trackArtwork()).toEqual({});
  });

  it('renders the loading state for revenue', () => {
    getOverview.mockReturnValue(NEVER);
    const { el } = setup();
    expect(el.textContent).toContain('Loading revenue…');
  });
});
