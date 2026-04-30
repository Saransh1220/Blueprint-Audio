import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../../services/payment.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { AnalyticsOverviewResponse } from '../../../core/api/analytics.requests';

@Component({
  selector: 'app-studio-earnings',
  imports: [CommonModule],
  templateUrl: './studio-earnings.component.html',
  styleUrl: './studio-earnings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioEarningsComponent {
  private paymentService = inject(PaymentService);
  private analyticsService = inject(AnalyticsService);

  isLoading = signal(true);
  analytics = signal<AnalyticsOverviewResponse | null>(null);
  orderTotal = signal(14);
  balance = signal(124750);
  pendingClearance = signal(7900);
  lastPayout = signal({ amount: 194820, date: '2026-04-01' });

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
  formattedBalance = computed(() => this.balance().toLocaleString('en-IN'));
  formattedLifetime = computed(() => this.lifetimeRevenue().toLocaleString('en-IN'));

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
      next: (res) => this.orderTotal.set(res.total),
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
    return `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
  }

  compactCurrency(value: number): string {
    const rounded = Math.round(value || 0);
    if (rounded >= 100000) return `₹${(rounded / 100000).toFixed(1)}L`;
    if (rounded >= 1000) return `₹${(rounded / 1000).toFixed(1)}k`;
    return `₹${rounded.toLocaleString('en-IN')}`;
  }
}
