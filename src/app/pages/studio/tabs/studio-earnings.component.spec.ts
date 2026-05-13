import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
    expect(component.currency(1234)).toBe('$1,234');
    expect(component.compactCurrency(123456)).toBe('$1.2L');
    expect(component.compactCurrency(2500)).toBe('$2.5k');
    expect(component.formatDate('2026-04-01')).toContain('2026');

    component.requestPayout();
    expect(window.alert).toHaveBeenCalled();
  });
});
