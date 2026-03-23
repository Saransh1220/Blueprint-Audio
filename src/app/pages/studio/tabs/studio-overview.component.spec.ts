import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AnalyticsService } from '../../../services/analytics.service';
import { PaymentService } from '../../../services/payment.service';
import { AuthService } from '../../../services';
import { StudioOverviewComponent } from './studio-overview.component';

describe('StudioOverviewComponent', () => {
  const getOverview = vi.fn();
  const getProducerOrders = vi.fn();
  const currentUser = signal<any>({ id: 'u1', display_name: 'Blaze' });

  const overview = {
    total_plays: 1234,
    total_revenue: 5678,
    total_downloads: 90,
    total_favorites: 12,
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
      ],
    });

    return TestBed.runInInjectionContext(() => new StudioOverviewComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getOverview.mockReturnValue(of(overview));
    getProducerOrders.mockReturnValue(of(ordersResponse));
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
});
