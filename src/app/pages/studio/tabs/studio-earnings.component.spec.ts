import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { AnalyticsService } from '../../../services/analytics.service';
import { PaymentService } from '../../../services/payment.service';
import { StudioEarningsComponent } from './studio-earnings.component';

describe('StudioEarningsComponent', () => {
  const getOverview = vi.fn();
  const getProducerOrders = vi.fn();

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: { getOverview } },
        { provide: PaymentService, useValue: { getProducerOrders } },
      ],
    });
    return TestBed.runInInjectionContext(() => new StudioEarningsComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getOverview.mockReturnValue(
      of({
        total_revenue: 100000,
        total_plays: 0,
        total_downloads: 0,
        total_favorites: 0,
        revenue_by_day: [{ date: '2026-04-01', revenue: 1000 }],
        revenue_by_license: { Exclusive: 70000, Basic: 30000 },
      }),
    );
    getProducerOrders.mockReturnValue(of({ total: 9 }));
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('loads analytics and order totals', () => {
    const component = create();

    expect(getOverview).toHaveBeenCalledWith(365, 'revenue');
    expect(getProducerOrders).toHaveBeenCalledWith(1, 20);
    expect(component.isLoading()).toBe(false);
    expect(component.orderTotal()).toBe(9);
    expect(component.lifetimeRevenue()).toBe(100000);
    expect(component.thisMonthRevenue()).toBe(1000);
    expect(component.licenseBreakdown()[0].label).toBe('Exclusive');
    expect(component.donutSegments()[0].dash).toContain('211');
    expect(component.donutSegments()[0].offset).toBe(-0);
    expect(component.monthlyBars()[0].height).toBe(100);
  });

  it('uses fallback values on errors and formats money', () => {
    getOverview.mockReturnValueOnce(throwError(() => new Error('fail')));
    getProducerOrders.mockReturnValueOnce(throwError(() => new Error('orders')));
    const component = create();

    expect(component.isLoading()).toBe(false);
    expect(component.orderTotal()).toBe(14);
    expect(component.currency(1234)).toBe('₹1,234');
    expect(component.compactCurrency(123456)).toBe('₹1.2L');
    expect(component.compactCurrency(2500)).toBe('₹2.5k');
    expect(component.formatDate('2026-04-01')).toContain('2026');

    component.requestPayout();
    expect(window.alert).toHaveBeenCalled();
  });
});

describe('StudioEarningsComponent (refreshed earnings)', () => {
  const getOverview = vi.fn();
  const getProducerOrders = vi.fn();

  const isoMonth = (offset: number, day = 10) => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - offset, day, 12).toISOString().slice(0, 10);
  };

  const overviewOf = (over: Record<string, unknown> = {}) => ({
    total_revenue: 100000,
    total_plays: 0,
    total_downloads: 0,
    total_favorites: 0,
    revenue_by_day: [
      { date: isoMonth(2), revenue: 500 },
      { date: isoMonth(0, 2), revenue: 1000 },
      { date: isoMonth(0, 3), revenue: 2000 },
    ],
    revenue_by_license: { Exclusive: 70000, Basic: 30000 },
    ...over,
  });

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: { getOverview } },
        { provide: PaymentService, useValue: { getProducerOrders } },
      ],
    });
    const fixture = TestBed.createComponent(StudioEarningsComponent);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    getOverview.mockReturnValue(of(overviewOf()));
    getProducerOrders.mockReturnValue(of({ total: 9, orders: [] }));
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sums the most recent 30 days of revenue', () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      revenue: i < 10 ? 1000 : 1,
    })).reverse();
    getOverview.mockReturnValue(of(overviewOf({ revenue_by_day: rows })));
    const { c } = setup();
    expect(c.last30Revenue()).toBe(30);
  });

  it('is zero without data', () => {
    getOverview.mockReturnValue(throwError(() => new Error('x')));
    const { c } = setup();
    expect(c.last30Revenue()).toBe(0);
    expect(c.hasMonthlyData()).toBe(false);
    expect(c.hasLicenseData()).toBe(false);
  });

  it('builds a 12 month series with real totals and an active last month', () => {
    const { c } = setup();
    const months = c.monthlyReal();
    expect(months.length).toBe(12);
    expect(months[11]).toEqual(expect.objectContaining({ value: 3000, height: 100, active: true }));
    expect(months[9]).toEqual(expect.objectContaining({ value: 500, height: 17, active: false }));
    expect(months[0]).toEqual(expect.objectContaining({ value: 0, height: 0 }));
    expect(months[11].label).toBe(
      new Date().toLocaleDateString('en-US', { month: 'short' }),
    );
    expect(c.hasMonthlyData()).toBe(true);
    expect(c.hasLicenseData()).toBe(true);
  });

  it('applies the balance fallbacks when revenue is zero', () => {
    getOverview.mockReturnValue(of(overviewOf({ total_revenue: 0 })));
    const { c } = setup();
    expect(c.balance()).toBe(124750);
    expect(c.pendingClearance()).toBe(7900);
    getOverview.mockReturnValue(of(overviewOf({ total_revenue: undefined })));
    TestBed.resetTestingModule();
    expect(setup().c.balance()).toBe(124750);
  });

  it('derives balance from revenue', () => {
    const { c } = setup();
    expect(c.balance()).toBe(18000);
    expect(c.pendingClearance()).toBe(4000);
    expect(c.formattedBalance()).toBe('₹18,000');
    expect(c.formattedLifetime()).toBe('₹1,00,000');
  });

  it('falls back to sample license data and sample monthly bars without analytics', () => {
    getOverview.mockReturnValue(throwError(() => new Error('x')));
    const { c } = setup();
    expect(c.lifetimeRevenue()).toBe(2471800);
    expect(c.thisMonthRevenue()).toBe(218400);
    expect(c.licenseBreakdown().length).toBe(4);
    expect(c.licenseBreakdown()[0].label).toBe('Exclusive');
    expect(c.monthlyBars().length).toBe(12);
    expect(c.monthlyBars()[11].active).toBe(true);
  });

  it('labels monthly bars from real rows, even beyond 12 entries', () => {
    getOverview.mockReturnValue(
      of(
        overviewOf({
          revenue_by_day: Array.from({ length: 14 }, (_, i) => ({
            date: `2026-01-${String(i + 1).padStart(2, '0')}`,
            revenue: i + 1,
          })),
        }),
      ),
    );
    const { c } = setup();
    const bars = c.monthlyBars();
    expect(bars.length).toBe(12);
    expect(bars[0].value).toBe(3);
    expect(bars[11].height).toBe(100);
  });

  it('keeps 12 bars when analytics rows are cleared', () => {
    const { c } = setup();
    c.analytics.set({ ...(c.analytics() as any), revenue_by_day: [] });
    expect(c.monthlyBars().length).toBe(12);
  });

  it('formats compact currency at every magnitude for INR and USD', () => {
    getProducerOrders.mockReturnValue(of({ total: 1, orders: [{ currency: 'USD' }] }));
    const { c } = setup();
    expect(c.producerCurrency()).toBe('USD');
    expect(c.compactCurrency(999)).toBe('$999');
    expect(c.compactCurrency(2500)).toBe('$2.5k');
    expect(c.compactCurrency(2500000)).toBe('$2.5M');
    expect(c.compactCurrency(Number.NaN)).toBe('$0');
    expect(c.currency(1234.4)).toBe('$1,234.40');

    c.producerCurrency.set('INR');
    expect(c.compactCurrency(999)).toBe('₹999');
    expect(c.compactCurrency(2500)).toBe('₹2.5k');
    expect(c.compactCurrency(250000)).toBe('₹2.5L');
  });

  it('ignores orders without a currency and handles order errors', () => {
    getProducerOrders.mockReturnValue(of({ total: 2, orders: [{}] }));
    expect(setup().c.producerCurrency()).toBe('INR');
    TestBed.resetTestingModule();
    getProducerOrders.mockReturnValue(of({ total: 2 }));
    const { c } = setup();
    expect(c.orderTotal()).toBe(2);
    TestBed.resetTestingModule();
    getProducerOrders.mockReturnValue(throwError(() => new Error('x')));
    expect(setup().c.orderTotal()).toBe(14);
  });

  it('lays out donut segments cumulatively', () => {
    const { c } = setup();
    const segs = c.donutSegments();
    expect(segs.length).toBe(2);
    expect(segs[0].offset).toBe(-0);
    expect(segs[1].offset).toBeLessThan(0);
    expect(c.licenseBreakdown()[1].color).toBe('var(--cobalt)');
  });

  it('alerts on payout request and formats dates', () => {
    const { c, el } = setup();
    (el.querySelector('.su-btn-primary') as HTMLElement).click();
    expect(window.alert).toHaveBeenCalledWith('Payout request received! Processing...');
    expect(c.formatDate('2026-04-01')).toContain('Apr');
  });

  it('renders balance, metrics, monthly chart, licenses and payouts', () => {
    const { el } = setup();
    expect(el.querySelector('.amount')?.textContent).toContain('₹18,000');
    expect(el.textContent).toContain('From 9 license sales');
    expect(el.querySelectorAll('.metrics dd').length).toBe(4);
    expect(el.querySelectorAll('.months .col').length).toBe(12);
    expect(el.querySelectorAll('.months-axis span').length).toBe(12);
    expect(el.querySelectorAll('.split i').length).toBe(2);
    expect(el.textContent).toContain('Exclusive');
    expect(el.textContent).toContain('PY-2026-04-01-R');
  });

  it('renders loading and empty states', () => {
    getOverview.mockReturnValue(NEVER);
    const loading = setup();
    expect(loading.el.textContent).toContain('Loading earnings…');
    expect(loading.el.textContent).toContain('Loading…');

    TestBed.resetTestingModule();
    getOverview.mockReturnValue(of(overviewOf({ revenue_by_day: [], revenue_by_license: {} })));
    const empty = setup();
    expect(empty.el.textContent).toContain('No earnings in the last 12 months yet.');
    expect(empty.el.textContent).toContain('No license earnings yet.');
  });
});
