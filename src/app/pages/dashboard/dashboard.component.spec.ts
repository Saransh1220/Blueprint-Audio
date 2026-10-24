import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { AnalyticsOverviewResponse } from '../../core/api/analytics.requests';
import { Role } from '../../models';
import type { Notification } from '../../models/notification.model';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { PaymentService } from '../../services/payment.service';
import { DashboardComponent } from './dashboard.component';

function dayRows(count: number, valueOf: (index: number) => number) {
  return Array.from({ length: count }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    count: valueOf(i),
  }));
}

function overviewOf(days: number, cur = 20, prev = 10): AnalyticsOverviewResponse {
  const half = days / 2;
  const value = (i: number) => (i < half ? prev : cur);
  return {
    total_plays: 999,
    total_favorites: 42,
    total_revenue: 5000,
    total_downloads: 77,
    plays_by_day: dayRows(days, value),
    downloads_by_day: dayRows(days, value),
    revenue_by_day: dayRows(days, value).map((r) => ({ date: r.date, revenue: r.count })),
    top_specs: [{ spec_id: 's1', title: 'Ghostwire', plays: 1200, downloads: 40, revenue: 800 }],
    revenue_by_license: { Basic: 100, Premium: 300 },
  };
}

const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

function order(over: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    amount: 50,
    currency: 'INR',
    status: 'paid',
    created_at: '2026-01-01T00:00:00Z',
    license_type: 'Basic',
    buyer_name: 'Marcus T.',
    buyer_email: 'm@example.com',
    spec_title: 'Ghostwire',
    ...over,
  };
}

function license(over: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    license_type: 'Basic',
    purchase_price: 49900,
    currency: 'INR',
    downloads_count: 2,
    issued_at: isoDaysAgo(1),
    created_at: isoDaysAgo(1),
    spec_title: 'Violet Hour',
    ...over,
  };
}

function note(over: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    user_id: 'u',
    title: 'Title',
    message: 'Message',
    type: 'info',
    is_read: false,
    created_at: new Date(),
    ...over,
  } as Notification;
}

describe('DashboardComponent', () => {
  const markAsRead = vi.fn();
  const notes = signal<Notification[]>([]);
  let getOverview: ReturnType<typeof vi.fn>;
  let getProducerOrders: ReturnType<typeof vi.fn>;
  let fetchUserLicenses: ReturnType<typeof vi.fn>;
  const pagination = signal<{ total: number } | null>(null);

  interface Opts {
    role?: Role;
    name?: string;
    user?: Record<string, unknown> | null;
    orders?: unknown[];
    licenses?: unknown[];
    overview?: (days: number) => AnalyticsOverviewResponse;
  }

  function setup(opts: Opts = {}) {
    getOverview = vi.fn((days: number, _s?: string) =>
      of((opts.overview ?? ((d: number) => overviewOf(d)))(days)),
    );
    getProducerOrders = vi.fn(() => of({ orders: opts.orders ?? [order()] }));
    fetchUserLicenses = vi.fn(() => of(opts.licenses ?? []));
    const user =
      opts.user !== undefined
        ? opts.user
        : { role: opts.role ?? Role.PRODUCER, name: opts.name ?? 'Ada Lovelace' };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { currentUser: signal(user) } },
        { provide: AnalyticsService, useValue: { getOverview } },
        {
          provide: PaymentService,
          useValue: { getProducerOrders, fetchUserLicenses, licensePagination: pagination },
        },
        { provide: NotificationService, useValue: { notifications: notes, markAsRead } },
      ],
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    notes.set([]);
    pagination.set(null);
    markAsRead.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the producer view for producers and the listener view otherwise', () => {
    expect(setup({ role: Role.PRODUCER }).c.role()).toBe('producer');
    TestBed.resetTestingModule();
    expect(setup({ role: Role.ARTIST }).c.role()).toBe('listener');
  });

  it('falls back to "there" with no user and uses display_name when present', () => {
    expect(setup({ user: null }).c.displayName()).toBe('there');
    TestBed.resetTestingModule();
    expect(setup({ user: { role: Role.PRODUCER, display_name: 'Kay Ro' } }).c.displayName()).toBe(
      'Kay',
    );
    TestBed.resetTestingModule();
    expect(setup().c.displayName()).toBe('Ada');
  });

  it('greets according to the time of day', () => {
    const cases: [number, string][] = [
      [2, 'Good night'],
      [9, 'Good morning'],
      [14, 'Good afternoon'],
      [20, 'Good evening'],
    ];
    for (const [hour, text] of cases) {
      TestBed.resetTestingModule();
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
      expect(setup().c.greeting()).toBe(text);
      vi.restoreAllMocks();
    }
  });

  it('requests two windows of analytics and caches per range', () => {
    const { c } = setup();
    expect(getOverview).toHaveBeenCalledWith(60, 'revenue');
    expect(getOverview).toHaveBeenCalledTimes(1);
    c.setRange('7D');
    TestBed.tick();
    expect(getOverview).toHaveBeenCalledWith(14, 'revenue');
    c.setRange('30D');
    TestBed.tick();
    expect(getOverview).toHaveBeenCalledTimes(2);
    expect(c.overview()?.total_favorites).toBe(42);
    expect(getProducerOrders).toHaveBeenCalledTimes(1);
  });

  it('handles an overview load error', () => {
    const { c } = setup();
    getOverview.mockReturnValue(throwError(() => new Error('x')));
    c.setRange('90D');
    TestBed.tick();
    expect(c.overview()).toBeNull();
    expect(c.loading()).toBe(false);
    expect(c.series().total).toBeTruthy();
  });

  it('ignores stale overview responses for a different range', () => {
    const { c } = setup();
    const stale = overviewOf(14);
    getOverview.mockImplementation(() => {
      c.setRange('30D');
      return of(stale);
    });
    c.setRange('7D');
    TestBed.tick();
    expect(c.overview()).not.toBe(stale);
  });

  it('handles an overview error for a stale range', () => {
    const { c } = setup();
    getOverview.mockImplementation(() => {
      c.setRange('30D');
      return throwError(() => new Error('x'));
    });
    c.setRange('7D');
    TestBed.tick();
    expect(c.overview()).not.toBeNull();
  });

  it('handles orders errors and null responses', () => {
    TestBed.resetTestingModule();
    getProducerOrders = vi.fn(() => throwError(() => new Error('x')));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { currentUser: signal({ role: Role.PRODUCER }) } },
        { provide: AnalyticsService, useValue: { getOverview: () => of(overviewOf(60)) } },
        {
          provide: PaymentService,
          useValue: { getProducerOrders, fetchUserLicenses: vi.fn(), licensePagination: pagination },
        },
        { provide: NotificationService, useValue: { notifications: notes, markAsRead } },
      ],
    });
    const f = TestBed.createComponent(DashboardComponent);
    f.detectChanges();
    expect(f.componentInstance.orders()).toEqual([]);
    expect(f.componentInstance.displayName()).toBe('there');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { currentUser: signal({ role: Role.PRODUCER }) } },
        { provide: AnalyticsService, useValue: { getOverview: () => of(overviewOf(60)) } },
        {
          provide: PaymentService,
          useValue: {
            getProducerOrders: () => of(null),
            fetchUserLicenses: vi.fn(),
            licensePagination: pagination,
          },
        },
        { provide: NotificationService, useValue: { notifications: notes, markAsRead } },
      ],
    });
    const f2 = TestBed.createComponent(DashboardComponent);
    f2.detectChanges();
    expect(f2.componentInstance.orders()).toEqual([]);
  });

  it('sums the current window and compares it with the previous one', () => {
    const { c } = setup();
    const series = c.series();
    expect(series.values.length).toBe(30);
    expect(series.delta).toBe('+100.0%');
    expect(series.up).toBe(true);
    expect(c.chartTitle()).toBe('Revenue');
    expect(c.splitTitle()).toBe('Revenue by license');
  });

  it('reports a decrease and a neutral delta', () => {
    const { c } = setup({ overview: (d) => overviewOf(d, 5, 10) });
    expect(c.series().delta).toBe('−50.0%');
    expect(c.series().up).toBe(false);
    expect(c.kpis()[0].up).toBe(false);
    TestBed.resetTestingModule();
    const n = setup({ overview: (d) => overviewOf(d, 5, 0) }).c;
    expect(n.series().delta).toBe('—');
    expect(n.series().up).toBeNull();
    expect(n.kpis()[0].delta).toBe('—');
  });

  it('builds producer KPIs from the overview', () => {
    const { c } = setup();
    const k = c.kpis();
    expect(k.map((x) => x.label)).toEqual(['Plays', 'Downloads', 'Followers', 'Favorites']);
    expect(k[0].value).toBe('600');
    expect(k[0].delta).toBe('+100.0%');
    expect(k[0].note).toBe('vs previous 30D');
    expect(k[3].value).toBe('42');
    expect(k[0].spark.length).toBeGreaterThan(1);
  });

  it('produces KPIs with no overview data', () => {
    const { c } = setup();
    c.overview.set(null);
    const k = c.kpis();
    expect(k[0].value).toBe('0');
    expect(k[3].value).toBe('0');
    expect(k[0].spark).toEqual([0, 0]);
    expect(c.series().values).toEqual([]);
    expect(c.series().dates).toEqual([]);
    expect(c.xTicks()).toEqual(['', '', 'Today']);
    expect(c.bars()).toEqual([]);
    expect(c.beats()).toEqual([]);
    expect(c.split()).toEqual([]);
    c.overview.set({ ...overviewOf(60), total_favorites: undefined } as never);
    expect(c.kpis()[3].value).toBe('0');
  });

  it('chart helpers: ticks, bars, niceMax for empty and non-empty data', () => {
    const { c } = setup();
    expect(c.yTicks().length).toBe(3);
    expect(c.yTicks()[2]).toContain('0');
    const bars = c.bars();
    expect(bars.length).toBe(30);
    expect(bars.filter((b) => b.latest).length).toBe(1);
    expect(bars[0].height).toBeGreaterThan(0);
    expect(c.xTicks()[2]).toBe('Today');
    expect(c.xTicks()[0]).not.toBe('');

    c.overview.set({
      ...overviewOf(60),
      revenue_by_day: dayRows(60, () => 0).map((r) => ({ date: r.date, revenue: 0 })),
    });
    expect(c.bars().every((b) => b.height === 0)).toBe(true);
    expect(c.yTicks()[0]).toContain('100');
  });

  it('uses USD formatting for USD orders', () => {
    const { c } = setup({ orders: [order({ currency: 'USD' })] });
    expect(c.currency()).toBe('USD');
    expect(c.yTicks()[0]).toContain('$');
  });

  it('downsamples when there are more than 45 values', () => {
    const { c } = setup({ overview: (d) => overviewOf(d) });
    c.setRange('90D');
    TestBed.tick();
    expect(c.series().values.length).toBe(90);
    expect(c.bars().length).toBeLessThanOrEqual(45);
    expect(c.bars().length).toBe(45);
  });

  it('today() for producers sums todays sales and plays', () => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const { c } = setup({
      orders: [
        order({ created_at: new Date().toISOString(), amount: 30 }),
        order({ id: 'o2', created_at: new Date().toISOString(), amount: 20 }),
        order({ id: 'o3', created_at: undefined }),
        order({ id: 'o4' }),
      ],
    });
    c.overview.set({
      ...overviewOf(60),
      plays_by_day: [{ date: todayKey, count: 1500 }],
    });
    const t = c.today();
    expect(t[1]).toEqual({ label: 'Sales', value: '2' });
    expect(t[0].value).toContain('50');
    expect(t[2].value).toBe('1.5K');
    c.overview.set(null);
    expect(c.today()[2].value).toBe('0');
  });

  it('today() for listeners returns the static listener metrics', () => {
    const { c } = setup({ role: Role.ARTIST });
    expect(c.today().map((m) => m.label)).toEqual(['Listened today', 'Downloads', 'Saved']);
  });

  it('listener: loads licenses once and computes kpis, series, split, purchases', () => {
    pagination.set({ total: 9 });
    const { c } = setup({
      role: Role.ARTIST,
      licenses: [
        license(),
        license({ id: 'l2', license_type: 'Premium', purchase_price: 99900, issued_at: undefined }),
        license({
          id: 'l3',
          spec_title: undefined,
          issued_at: isoDaysAgo(100),
          created_at: isoDaysAgo(100),
          downloads_count: undefined,
        }),
      ],
    });
    expect(fetchUserLicenses).toHaveBeenCalledTimes(1);
    c.setRole('producer');
    TestBed.tick();
    c.setRole('listener');
    TestBed.tick();
    expect(fetchUserLicenses).toHaveBeenCalledTimes(1);
    expect(c.licenseTotal()).toBe(9);
    expect(c.loading()).toBe(false);
    expect(c.chartTitle()).toBe('Spending');
    expect(c.splitTitle()).toBe('Spend by license');
    const k = c.kpis();
    expect(k.map((x) => x.label)).toEqual(['Library', 'Wishlist', 'Downloads', 'Following']);
    expect(k[0].value).toBe('9');
    expect(k[0].delta).toBe('+2');
    expect(k[0].up).toBe(true);
    expect(k[2].value).toBe('4');
    expect(k[2].delta).toBe('3 licenses');
    expect(c.series().values.length).toBe(30);
    expect(c.series().total).toContain('1,498');
    const split = c.split();
    expect(split[0].label).toBe('Premium');
    expect(split.reduce((s, x) => s + x.pct, 0)).toBeGreaterThanOrEqual(99);
    const p = c.purchases();
    expect(p.length).toBe(3);
    expect(p[0].title).toBe('Violet Hour');
    expect(p[2].title).toBe('Untitled beat');
    expect(p[0].meta).toContain('Basic');
    expect(c.peopleRows()[0].name).toBe('Kita Sol');
  });

  it('listener with no licenses: neutral kpis, falls back to length for total', () => {
    const { c } = setup({ role: Role.ARTIST });
    const k = c.kpis();
    expect(k[0].value).toBe('0');
    expect(k[0].up).toBeNull();
    expect(c.series().delta).toBe('—');
    expect(c.purchases()).toEqual([]);
  });

  it('listener: license total falls back to row count and errors are handled', () => {
    const { c } = setup({ role: Role.ARTIST, licenses: [license()] });
    expect(c.licenseTotal()).toBe(1);
    expect(c.currency()).toBe('INR');

    TestBed.resetTestingModule();
    fetchUserLicenses = vi.fn(() => throwError(() => new Error('x')));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { currentUser: signal({ role: Role.ARTIST }) } },
        { provide: AnalyticsService, useValue: { getOverview: vi.fn() } },
        {
          provide: PaymentService,
          useValue: {
            getProducerOrders: vi.fn(),
            fetchUserLicenses,
            licensePagination: pagination,
          },
        },
        { provide: NotificationService, useValue: { notifications: notes, markAsRead } },
      ],
    });
    const f = TestBed.createComponent(DashboardComponent);
    f.detectChanges();
    expect(f.componentInstance.licenses()).toEqual([]);
    expect(f.componentInstance.loading()).toBe(false);
  });

  it('listener currency uses USD licenses', () => {
    const { c } = setup({ role: Role.ARTIST, licenses: [license({ currency: 'USD' })] });
    expect(c.currency()).toBe('USD');
  });

  it('role switching triggers loads', () => {
    const { c } = setup({ role: Role.ARTIST, licenses: [license()] });
    expect(getOverview).not.toHaveBeenCalled();
    c.setRole('producer');
    TestBed.tick();
    expect(getOverview).toHaveBeenCalledTimes(1);
    expect(getProducerOrders).toHaveBeenCalledTimes(1);
  });

  it('reads KPI figures and top beats from the analytics overview', () => {
    const { c } = setup();
    expect(c.beats()[0].title).toBe('Ghostwire');
    expect(c.beats()[0].plays).toBe('1.2K');
    expect(c.split()[0].label).toBe('Premium');
    expect(c.split()[0].pct).toBe(75);
    c.overview.set({
      ...overviewOf(60),
      top_specs: [{ spec_id: 's2', title: 'Bare' } as never],
      revenue_by_license: undefined as never,
    });
    expect(c.beats()[0].plays).toBe('0');
    expect(c.split()).toEqual([]);
  });

  it('lists recent orders with buyer and license', () => {
    const { c } = setup({
      orders: [
        order(),
        order({ id: 'o2', buyer_name: undefined }),
        order({ id: 'o3', buyer_name: undefined, buyer_email: undefined, currency: 'USD' }),
      ],
    });
    const rows = c.peopleRows();
    expect(rows[0].name).toBe('Marcus T.');
    expect(rows[0].note).toBe('Ghostwire · Basic');
    expect(rows[1].name).toBe('m@example.com');
    expect(rows[2].name).toBe('Customer');
    expect(rows[2].badge).toContain('$');
  });

  it('timeAgo covers every unit', () => {
    const { c } = setup();
    expect(c.timeAgo(undefined)).toBe('');
    expect(c.timeAgo(new Date())).toBe('1m');
    expect(c.timeAgo(new Date(Date.now() + 100000))).toBe('1m');
    expect(c.timeAgo(isoDaysAgo(10 / 1440))).toBe('10m');
    expect(c.timeAgo(isoDaysAgo(3 / 24))).toBe('3h');
    expect(c.timeAgo(isoDaysAgo(5))).toBe('5d');
    expect(c.timeAgo(isoDaysAgo(65))).toBe('2mo');
  });

  it('maps every notification type to a tone and CTA', () => {
    notes.set([
      note({ id: 'a', type: 'processing_failed' }),
      note({ id: 'b', type: 'processing_complete' }),
      note({ id: 'c', type: 'error' }),
      note({ id: 'd', type: 'success' }),
      note({ id: 'e', type: 'whatever', is_read: true }),
      note({ id: 'f', type: 'whatever' }),
    ]);
    const { c } = setup();
    const att = c.attention();
    expect(att.length).toBe(3);
    expect(att.map((a) => a.tone)).toEqual(['bad', 'ok', 'bad']);
    expect(att[0].cta).toBe('View tracks');
    expect(att[0].link).toBe('/studio/tracks');
    const act = c.activity();
    expect(act.map((a) => a.tone)).toEqual(['bad', 'ok', 'bad', 'ok', 'info', 'info']);
    expect(act[0].time).toBe('1m');
    notes.set([note({ id: 'z', type: 'info' })]);
    expect(c.attention()[0]).toMatchObject({ cta: 'Dismiss', link: null, tone: 'info' });
    c.markRead('z');
    expect(markAsRead).toHaveBeenCalledWith('z');
  });

  it('keeps the bar chart readable by capping the number of bars', () => {
    const { c } = setup();
    c.setRange('90D');
    TestBed.tick();
    expect(c.bars().length).toBeLessThanOrEqual(45);
    expect(c.bars().filter((b) => b.latest).length).toBe(1);
  });

  it('persists the style variant and survives storage failures', () => {
    const { c } = setup();
    expect(c.variant()).toBe('pop');
    c.setVariant('ink');
    expect(c.variant()).toBe('ink');
    expect(localStorage.getItem('dashboard-variant')).toBe('ink');

    TestBed.resetTestingModule();
    expect(setup().c.variant()).toBe('ink');

    TestBed.resetTestingModule();
    localStorage.setItem('dashboard-variant', 'bogus');
    expect(setup().c.variant()).toBe('pop');

    TestBed.resetTestingModule();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { c: c2 } = setup();
    expect(c2.variant()).toBe('pop');
    c2.setVariant('soft');
    expect(c2.variant()).toBe('soft');
  });

  it('sparkPoints and initial helpers', () => {
    const { c } = setup();
    expect(c.sparkPoints([0, 10])).toBe('0.0,26.0 100.0,2.0');
    expect(c.sparkPoints([5, 5, 5]).split(' ').length).toBe(3);
    expect(c.initial('ghost')).toBe('G');
  });

  it('renders the producer view', () => {
    notes.set([
      note({ id: 'a', type: 'processing_failed', title: 'Upload failed' }),
      note({ id: 'b', type: 'info', title: 'Hello' }),
    ]);
    const { fixture } = setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Ada.');
    expect(el.textContent).toContain('Needs attention');
    expect(el.textContent).toContain('Top beats');
    expect(el.textContent).toContain('Ghostwire');
    expect(el.textContent).toContain('Upload beat');
    expect(el.textContent).toContain('Top countries');
    expect(el.querySelectorAll('.bar').length).toBe(30);
    expect(el.querySelectorAll('.t-kpi').length).toBe(4);
    expect(el.textContent).toContain('Upload failed');

    (el.querySelector('a.go') as HTMLElement).click();
    expect(markAsRead).toHaveBeenCalledWith('a');
    (el.querySelector('button.go') as HTMLElement).click();
    expect(markAsRead).toHaveBeenCalledWith('b');

    (el.querySelectorAll('.swatches button')[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.page')?.getAttribute('data-variant')).toBe('ink');

    (el.querySelectorAll('.tabs-sm button')[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.range()).toBe('7D');
  });

  it('renders producer empty states', () => {
    const { fixture, c } = setup({ orders: [] });
    c.overview.set(null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('nothing needs your attention');
    expect(el.textContent).toContain('No plays or sales yet');
    expect(el.textContent).toContain('No data yet.');
    expect(el.textContent).toContain('No orders yet.');
    expect(el.textContent).toContain('No recent activity.');
  });

  it('renders the listener view and switches via tabs', () => {
    const { fixture, c } = setup({ role: Role.ARTIST, licenses: [license()] });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Find beats');
    expect(el.textContent).toContain('For you');
    expect(el.textContent).toContain('Recent purchases');
    expect(el.textContent).toContain('Violet Hour');
    expect(el.textContent).toContain('Your top genres');
    expect(el.textContent).toContain('Following');

    (el.querySelectorAll('.head-actions .tabs button')[0] as HTMLElement).click();
    TestBed.tick();
    fixture.detectChanges();
    expect(c.role()).toBe('producer');
    expect(el.textContent).toContain('Upload beat');
  });

  it('renders listener empty and loading states', () => {
    const { fixture } = setup({ role: Role.ARTIST, licenses: [] });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No purchases yet');
  });
});
