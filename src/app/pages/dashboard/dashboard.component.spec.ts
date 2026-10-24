import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

function overviewOf(days: number): AnalyticsOverviewResponse {
  // first half = previous period (10/day), second half = current period (20/day)
  const half = days / 2;
  const value = (i: number) => (i < half ? 10 : 20);
  return {
    total_plays: 999,
    total_favorites: 42,
    total_revenue: 5000,
    total_downloads: 77,
    plays_by_day: dayRows(days, value),
    downloads_by_day: dayRows(days, value),
    revenue_by_day: dayRows(days, value).map((r) => ({ date: r.date, revenue: r.count })),
    top_specs: [
      { spec_id: 's1', title: 'Ghostwire', plays: 1200, downloads: 40, revenue: 800 },
    ],
    revenue_by_license: { Basic: 100, Premium: 300 },
  };
}

describe('DashboardComponent', () => {
  const markAsRead = vi.fn();
  const notes = signal<Notification[]>([]);
  const getOverview = vi.fn((days: number, _sortBy?: string) => of(overviewOf(days)));
  const getProducerOrders = vi.fn(() =>
    of({
      orders: [
        {
          id: 'o1',
          amount: 50,
          currency: 'INR',
          status: 'paid',
          created_at: '2026-01-01T00:00:00Z',
          license_type: 'Basic',
          buyer_name: 'Marcus T.',
          buyer_email: 'm@example.com',
          spec_title: 'Ghostwire',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    }),
  );

  function create(userRole = Role.PRODUCER, name = 'Ada Lovelace') {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal({ role: userRole, name }) } },
        { provide: AnalyticsService, useValue: { getOverview } },
        {
          provide: PaymentService,
          useValue: {
            getProducerOrders,
            fetchUserLicenses: vi.fn(() => of([])),
            licensePagination: signal(null),
          },
        },
        { provide: NotificationService, useValue: { notifications: notes, markAsRead } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new DashboardComponent());
    TestBed.tick();
    return component;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    notes.set([]);
    markAsRead.mockClear();
    getOverview.mockClear();
  });

  it('opens the producer view for producers and the listener view otherwise', () => {
    expect(create(Role.PRODUCER).role()).toBe('producer');
    TestBed.resetTestingModule();
    expect(create(Role.ARTIST).role()).toBe('listener');
  });

  it('greets the user by first name', () => {
    expect(create().displayName()).toBe('Ada');
  });

  it('requests two windows of analytics so it can compare periods', () => {
    create();
    expect(getOverview).toHaveBeenCalledWith(60, 'revenue');
  });

  it('sums the current window and compares it with the previous one', () => {
    const component = create();
    const series = component.series();
    expect(series.values.length).toBe(30);
    expect(series.delta).toBe('+100.0%');
    expect(series.up).toBe(true);
  });

  it('reads KPI figures and top beats from the analytics overview', () => {
    const component = create();
    const favorites = component.kpis().find((k) => k.label === 'Favorites');
    expect(favorites?.value).toBe('42');
    expect(component.beats()[0].title).toBe('Ghostwire');
    expect(component.split()[0].label).toBe('Premium');
    expect(component.split()[0].pct).toBe(75);
  });

  it('lists recent orders with buyer and license', () => {
    const rows = create().peopleRows();
    expect(rows[0].name).toBe('Marcus T.');
    expect(rows[0].note).toBe('Ghostwire · Basic');
  });

  it('shows only unread notifications as needing attention and marks them read', () => {
    notes.set([
      {
        id: 'n1',
        user_id: 'u',
        title: 'Upload failed',
        message: 'Midnight Run',
        type: 'processing_failed',
        is_read: false,
        created_at: new Date(),
      },
      {
        id: 'n2',
        user_id: 'u',
        title: 'Old news',
        message: 'Already seen',
        type: 'info',
        is_read: true,
        created_at: new Date(),
      },
    ]);
    const component = create();
    expect(component.attention().map((a) => a.id)).toEqual(['n1']);
    expect(component.attention()[0].tone).toBe('bad');
    component.markRead('n1');
    expect(markAsRead).toHaveBeenCalledWith('n1');
  });

  it('keeps the bar chart readable by capping the number of bars', () => {
    const component = create();
    component.setRange('90D');
    TestBed.tick();
    expect(component.bars().length).toBeLessThanOrEqual(45);
    expect(component.bars().filter((b) => b.latest).length).toBe(1);
  });

  it('switches role view', () => {
    const component = create();
    component.setRole('listener');
    expect(component.chartTitle()).toBe('Spending');
  });
});
