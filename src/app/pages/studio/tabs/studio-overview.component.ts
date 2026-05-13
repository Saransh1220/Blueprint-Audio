import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../services/analytics.service';
import { PaymentService } from '../../../services/payment.service';
import { AuthService, LabService } from '../../../services';
import { AnalyticsOverviewResponse, TopSpecStat } from '../../../core/api/analytics.requests';
import { ProducerOrderDto } from '../../../core/api/payment.requests';

@Component({
  selector: 'app-studio-overview',
  imports: [CommonModule, RouterLink],
  templateUrl: './studio-overview.component.html',
  styleUrl: './studio-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioOverviewComponent {
  private analyticsService = inject(AnalyticsService);
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private labService = inject(LabService, { optional: true });

  currentUser = this.authService.currentUser;
  isLoadingAnalytics = signal(true);
  isLoadingOrders = signal(true);

  analyticsData = signal<AnalyticsOverviewResponse | null>(null);
  topSpecs = signal<TopSpecStat[]>([]);
  recentOrders = signal<ProducerOrderDto[]>([]);
  trackArtwork = signal<Record<string, string>>({});
  hoveredRevenuePoint = signal<{ x: number; y: number; value: number; label: string } | null>(null);

  // User computed helpers
  displayName = computed(() => {
    const user = this.currentUser();
    return user?.display_name || user?.name || 'Producer';
  });

  firstName = computed(() => this.displayName().split(' ')[0] || 'Producer');

  greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  });

  todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // KPI formatters
  formattedPlays = computed(() => {
    const n = this.analyticsData()?.total_plays ?? 0;
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString();
  });

  formattedRevenue = computed(() => {
    const n = this.analyticsData()?.total_revenue ?? 0;
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString();
  });

  formattedDownloads = computed(() => {
    const n = this.analyticsData()?.total_downloads ?? 0;
    return n.toLocaleString();
  });

  formattedFavorites = computed(() => {
    const n = this.analyticsData()?.total_favorites ?? 0;
    return n.toLocaleString();
  });

  kpiCards = computed(() => {
    const data = this.analyticsData();
    if (!data) {
      return [
        { label: 'Plays', value: '—' },
        { label: 'Revenue', value: '—' },
        { label: 'Downloads', value: '—' },
        { label: 'Favorites', value: '—' },
      ];
    }
    return [
      { label: 'Plays', value: data.total_plays.toLocaleString('en-IN') },
      { label: 'Revenue', value: `$${data.total_revenue.toLocaleString('en-IN')}` },
      { label: 'Downloads', value: data.total_downloads.toLocaleString('en-IN') },
      { label: 'Favorites', value: data.total_favorites.toLocaleString('en-IN') },
    ];
  });

  liveBeatCount = computed(() => this.topSpecs().length || 24);
  readyToWithdraw = computed(() =>
    Math.round((this.analyticsData()?.total_revenue ?? 124700) * 0.18),
  );
  recentOrderCount = computed(() => Math.max(this.recentOrders().length, 3));

  revenuePoints = computed(() => {
    const rows = this.analyticsData()?.revenue_by_day ?? [];
    const source = rows.length
      ? rows.slice(-30).map((row) => row.revenue)
      : Array.from({ length: 30 }, (_, i) =>
          Math.round(900 + i * 45 + Math.sin(i * 0.7) * 260 + Math.sin(i * 0.23) * 140),
        );
    const labels = rows.length
      ? rows.slice(-30).map((row) => this.shortDate(row.date))
      : source.map((_, i) => `Day ${i + 1}`);
    const max = Math.max(...source, 1);
    const width = 600;
    const pad = 10;
    return source.map((value, i) => {
      const x = pad + (i / Math.max(source.length - 1, 1)) * (width - pad * 2);
      const y = 220 - (value / max) * 170;
      return { x, y, value, label: labels[i] ?? `Day ${i + 1}` };
    });
  });

  revenueLinePath = computed(() => this.linePath(this.revenuePoints()));
  revenueAreaPath = computed(() => {
    const points = this.revenuePoints();
    if (!points.length) return '';
    return `M ${points[0].x} 220 L ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${
      points[points.length - 1].x
    } 220 Z`;
  });

  revenueTotalLabel = computed(() => this.currency(this.analyticsData()?.total_revenue ?? 0));

  topBeatRows = computed(() => {
    const max = Math.max(...this.topSpecs().map((spec) => spec.plays), 1);
    return this.topSpecs()
      .slice(0, 5)
      .map((spec, index) => ({
        ...spec,
        rank: String(index + 1).padStart(2, '0'),
        share: Math.max(12, Math.round((spec.plays / max) * 100)),
        letter: (spec.title || 'b').slice(0, 1).toLowerCase(),
        imageUrl: this.trackImageFor(spec),
      }));
  });

  activityItems = computed(() => {
    const sale = this.recentSales()[0];
    return [
      {
        avatar: 'j',
        colorClass: 'c1',
        text: sale
          ? `${sale.buyer} bought ${sale.license} for ${sale.title}.`
          : 'Jamie O. left a 5-star review on your latest beat.',
        time: '2m',
      },
      {
        avatar: 'Rs',
        colorClass: 'c4',
        text: sale
          ? `License sold. ${this.currency(sale.amount || 0)} added to pending revenue.`
          : 'License sold. Premium WAV added to pending revenue.',
        time: '18m',
      },
      {
        avatar: '*',
        colorClass: 'c3',
        text: 'Ghostwire was added to 3 carts in the last hour.',
        time: '1h',
      },
      { avatar: 'm', colorClass: 'c2', text: 'Meridian started following you.', time: '3h' },
      {
        avatar: 'v',
        colorClass: 'icon',
        text: 'Your top beat was wishlisted 9 times today.',
        time: '6h',
      },
    ];
  });

  // Sparkline
  trendPoints = computed(() => {
    const d = this.analyticsData();
    const plays = d?.plays_by_day ?? [];
    const downloads = d?.downloads_by_day ?? [];
    const maxPlays = Math.max(...plays.map((item) => item.count), 1);
    const maxDl = Math.max(...downloads.map((item) => item.count), 1);
    const downloadsMap = new Map(downloads.map((item) => [item.date, item.count]));

    return plays.slice(-7).map((item) => ({
      date: item.date,
      plays: item.count,
      downloads: downloadsMap.get(item.date) ?? 0,
      playsH: Math.max(5, Math.round((item.count / maxPlays) * 100)),
      dlH: Math.max(5, Math.round(((downloadsMap.get(item.date) ?? 0) / maxDl) * 100)),
    }));
  });

  playsLinePoints = computed(() => {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const step = 400 / Math.max(pts.length - 1, 1);
    return pts.map((p, i) => `${i * step},${120 - p.playsH}`).join(' ');
  });

  playsAreaPoints = computed(() => {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const step = 400 / Math.max(pts.length - 1, 1);
    const top = pts.map((p, i) => `${i * step},${120 - p.playsH}`).join(' ');
    const last = pts.length - 1;
    return `0,120 ${top} ${last * step},120`;
  });

  downloadsLinePoints = computed(() => {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const step = 400 / Math.max(pts.length - 1, 1);
    return pts.map((p, i) => `${i * step},${120 - p.dlH}`).join(' ');
  });

  // License rows
  licenseRows = computed(() => {
    const entries = Object.entries(this.analyticsData()?.revenue_by_license ?? {});
    const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value,
        share: Math.round((value / total) * 100),
      }));
  });

  // Recent sales
  recentSales = computed(() =>
    this.recentOrders()
      .slice(0, 4)
      .map((order) => ({
        id: order.id,
        title: order.spec_title || 'Untitled beat',
        buyer: order.buyer_name || order.buyer_email || 'Customer',
        license: order.license_type || 'License',
        amount: order.amount,
        createdAt: order.created_at,
      })),
  );

  constructor() {
    this.loadAnalytics();
    this.loadRecentOrders();
    this.loadTrackArtwork();
  }

  private loadAnalytics() {
    this.isLoadingAnalytics.set(true);
    this.analyticsService.getOverview(30, 'plays').subscribe({
      next: (res) => {
        this.analyticsData.set(res);
        this.topSpecs.set(res.top_specs?.slice(0, 5) || []);
        this.isLoadingAnalytics.set(false);
      },
      error: () => {
        this.isLoadingAnalytics.set(false);
      },
    });
  }

  private loadRecentOrders() {
    this.isLoadingOrders.set(true);
    this.paymentService.getProducerOrders(1, 5).subscribe({
      next: (res) => {
        this.recentOrders.set(res.orders);
        this.isLoadingOrders.set(false);
      },
      error: () => {
        this.isLoadingOrders.set(false);
      },
    });
  }

  onRevenueChartMove(event: MouseEvent) {
    const points = this.revenuePoints();
    if (!points.length) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 600;
    const nearest = points.reduce((best, point) =>
      Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best,
    );
    this.hoveredRevenuePoint.set(nearest);
  }

  clearRevenueHover() {
    this.hoveredRevenuePoint.set(null);
  }

  shortDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr.slice(5, 10);
    }
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  buyerColor(name: string): string {
    const colors = [
      'var(--hot)',
      'var(--cobalt)',
      'var(--lime)',
      'var(--sun)',
      'var(--lavender)',
      'var(--tangerine)',
    ];
    const idx = (name.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  }

  currency(value: number): string {
    return `$${Math.round(value || 0).toLocaleString('en-IN')}`;
  }

  private linePath(points: { x: number; y: number }[]): string {
    if (!points.length) return '';
    return `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
  }

  private loadTrackArtwork() {
    this.labService?.getSpecs({ category: 'beat', per_page: 12, sort: 'plays' }).subscribe({
      next: (tracks) => {
        const art: Record<string, string> = {};
        tracks.forEach((track) => {
          if (!track.imageUrl) return;
          art[track.id] = track.imageUrl;
          if (track.title) art[track.title.toLowerCase()] = track.imageUrl;
        });
        this.trackArtwork.set(art);
      },
      error: () => {},
    });
  }

  private trackImageFor(spec: TopSpecStat): string | null {
    const art = this.trackArtwork();
    return art[spec.spec_id] || art[(spec.title || '').toLowerCase()] || null;
  }
}
