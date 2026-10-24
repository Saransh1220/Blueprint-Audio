import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AnalyticsOverviewResponse } from '../../../core/api/analytics.requests';
import { AppCurrency } from '../../../models';
import { AnalyticsService } from '../../../services/analytics.service';
import { CurrencyService } from '../../../services/currency.service';
import { PaymentService } from '../../../services/payment.service';
import { SuPageHeadComponent, SuPanelComponent } from '../ui';

@Component({
  selector: 'app-studio-earnings',
  imports: [SuPageHeadComponent, SuPanelComponent],
  templateUrl: './studio-earnings.component.html',
  styleUrl: './studio-earnings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioEarningsComponent {
  private paymentService = inject(PaymentService);
  private analyticsService = inject(AnalyticsService);
  private currencyService = inject(CurrencyService);

  isLoading = signal(true);
  analytics = signal<AnalyticsOverviewResponse | null>(null);
  orderTotal = signal(14);
  balance = signal(124750);
  pendingClearance = signal(7900);
  lastPayout = signal({ amount: 194820, date: '2026-04-01' });
  producerCurrency = signal<AppCurrency>('INR');

  payouts = signal([
    {
      id: 'PY-2026-04-01-R',
      date: '2026-04-01',
      amount: 194820,
      status: 'paid',
      method: 'UPI · HDFC •••4829',
    },
    {
      id: 'PY-2026-03-01-R',
      date: '2026-03-01',
      amount: 231200,
      status: 'paid',
      method: 'UPI · HDFC •••4829',
    },
    {
      id: 'PY-2026-02-01-R',
      date: '2026-02-01',
      amount: 168475,
      status: 'paid',
      method: 'UPI · HDFC •••4829',
    },
    {
      id: 'PY-2026-01-01-R',
      date: '2026-01-01',
      amount: 280250,
      status: 'paid',
      method: 'UPI · HDFC •••4829',
    },
  ]);

  lifetimeRevenue = computed(() => this.analytics()?.total_revenue ?? 2471800);
  thisMonthRevenue = computed(() => {
    const rows = this.analytics()?.revenue_by_day ?? [];
    return rows.reduce((sum, row) => sum + row.revenue, 0) || 218400;
  });
  formattedBalance = computed(() => this.currency(this.balance()));
  formattedLifetime = computed(() => this.currency(this.lifetimeRevenue()));

  licenseBreakdown = computed(() => {
    const entries = Object.entries(
      this.analytics()?.revenue_by_license ?? {
        Exclusive: 1186400,
        'Unlimited Pro': 692100,
        'Premium WAV': 444900,
        'Basic MP3': 148400,
      },
    );
    const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
    const colors = ['var(--lime)', 'var(--cobalt)', 'var(--sun)', 'var(--hot)'];
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        share: Math.round((value / total) * 100),
        color: colors[index % colors.length],
      }));
  });

  donutSegments = computed(() => {
    const circumference = 302;
    let offset = 0;
    return this.licenseBreakdown().map((item) => {
      const dash = Math.max(1, (item.share / 100) * circumference);
      const segment = { ...item, dash: `${dash} ${circumference - dash}`, offset: -offset };
      offset += dash;
      return segment;
    });
  });

  monthlyBars = computed(() => {
    const rows = this.analytics()?.revenue_by_day ?? [];
    const fallback = [
      82000, 115000, 94000, 138000, 162000, 142000, 175000, 189000, 158000, 218000, 194800, 218400,
    ];
    const values = rows.length ? rows.slice(-12).map((row) => row.revenue) : fallback;
    const max = Math.max(...values, 1);
    const labels = [
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
    ];
    return values.map((value, index) => ({
      value,
      label: labels[index] || '',
      height: Math.max(8, Math.round((value / max) * 100)),
      active: index === values.length - 1,
    }));
  });

  // ── Refreshed earnings helpers (real data only) ──────

  /** Revenue from the most recent 30 days of daily data. */
  last30Revenue = computed(() => {
    const rows = [...(this.analytics()?.revenue_by_day ?? [])].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    return rows.slice(-30).reduce((sum, row) => sum + row.revenue, 0);
  });

  /** Real per-month revenue for the last 12 calendar months (months without sales are zero). */
  monthlyReal = computed(() => {
    const rows = this.analytics()?.revenue_by_day ?? [];
    const totals = new Map<string, number>();
    for (const row of rows) {
      const key = row.date.slice(0, 7);
      totals.set(key, (totals.get(key) ?? 0) + row.revenue);
    }
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        value: totals.get(key) ?? 0,
      };
    });
    const max = Math.max(...months.map((m) => m.value), 1);
    return months.map((m, i) => ({
      ...m,
      height: m.value > 0 ? Math.max(6, Math.round((m.value / max) * 100)) : 0,
      active: i === months.length - 1,
    }));
  });

  hasMonthlyData = computed(() => this.monthlyReal().some((m) => m.value > 0));

  /** The donut only draws real license revenue (the sample fallback above stays for compatibility). */
  hasLicenseData = computed(
    () => Object.keys(this.analytics()?.revenue_by_license ?? {}).length > 0,
  );

  constructor() {
    this.analyticsService.getOverview(365, 'revenue').subscribe({
      next: (res) => {
        this.analytics.set(res);
        this.balance.set(Math.round((res.total_revenue || 0) * 0.18) || this.balance());
        this.pendingClearance.set(
          Math.round((res.total_revenue || 0) * 0.04) || this.pendingClearance(),
        );
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

    this.paymentService.getProducerOrders(1, 20).subscribe({
      next: (res) => {
        this.orderTotal.set(res.total);
        if (res.orders && res.orders.length > 0 && res.orders[0].currency) {
          this.producerCurrency.set(res.orders[0].currency as AppCurrency);
        }
      },
      error: () => this.orderTotal.set(14),
    });
  }

  requestPayout() {
    alert('Payout request received! Processing...');
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  currency(value: number): string {
    return this.currencyService.formatMoney(null, value, this.producerCurrency());
  }

  compactCurrency(value: number): string {
    const rounded = Math.round(value || 0);
    const curr = this.producerCurrency();
    if (curr === 'INR') {
      if (rounded >= 100000) return `₹${(rounded / 100000).toFixed(1)}L`;
      if (rounded >= 1000) return `₹${(rounded / 1000).toFixed(1)}k`;
      return `₹${rounded.toLocaleString('en-IN')}`;
    } else {
      if (rounded >= 1000000) return `$${(rounded / 1000000).toFixed(1)}M`;
      if (rounded >= 1000) return `$${(rounded / 1000).toFixed(1)}k`;
      return `$${rounded.toLocaleString('en-US')}`;
    }
  }
}
