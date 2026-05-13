import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AnalyticsService } from '../../../services/analytics.service';
import { PaymentService } from '../../../services/payment.service';
import { AuthService, LabService } from '../../../services';
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
    expect(component.kpiCards().map((card) => card.value)).toEqual(['1,234', '$5,678', '90', '12']);
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
    expect(component.revenueTotalLabel()).toBe('$5,678');
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
    expect(component.currency(0)).toBe('$0');
  });
});
