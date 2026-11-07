import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AnalyticsOverviewResponse, TopSpecStat } from '../../../core/api/analytics.requests';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { AppCurrency } from '../../../models';
import { LabService } from '../../../services';
import { AnalyticsService } from '../../../services/analytics.service';
import { CurrencyService } from '../../../services/currency.service';
import { PaymentService } from '../../../services/payment.service';
import {
  BentoInsightsComponent,
  BentoPageComponent,
  BentoSegmentedComponent,
} from '../../../components/bento';
import type { SuAccent } from '../ui';

interface MetricTile {
  label: string;
  value: string;
  delta: string;
  up: boolean | null;
  hint: string;
  spark: string;
  accent: SuAccent;
}

@Component({
  selector: 'app-studio-analytics',
  imports: [BentoInsightsComponent, BentoPageComponent, BentoSegmentedComponent],
  templateUrl: './studio-analytics.component.html',
  styleUrl: './studio-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioAnalyticsComponent {
  private analyticsService = inject(AnalyticsService);
  private csvService = inject(CsvExportService);
  private labService = inject(LabService, { optional: true });
  private paymentService = inject(PaymentService);
  private currencyService = inject(CurrencyService);

  private readonly ordersCurrency = signal<AppCurrency>('INR');
  /** Set when the producer picks a currency; revenue is then requested in it. */
  readonly reportCurrencyOverride = signal<string | undefined>(undefined);
  producerCurrency = computed<AppCurrency>(
    () => this.reportCurrencyOverride() ?? this.ordersCurrency(),
  );

  readonly currencyOptions = computed(() =>
    this.currencyService.currencies().map((c) => ({ value: c.code, label: c.code })),
  );

  onCurrencySelected(value: string | number) {
    const code = String(value);
    if (this.producerCurrency() === code) return;
    this.reportCurrencyOverride.set(code);
    this.loadData();
  }


  readonly periodOptions = [
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 90, label: '90D' },
    { value: 365, label: '1Y' },
    { value: 3650, label: 'All' },
  ];

  readonly sortOptions = [
    { value: 'plays', label: 'Plays' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'downloads', label: 'Downloads' },
  ];

  readonly insightState = computed<'loading' | 'ready' | 'unavailable'>(() =>
    this.isLoading() ? 'loading' : this.data() ? 'ready' : 'unavailable',
  );

  /** Highlights the "All" option for any range longer than a year. */
  readonly periodValue = computed(() => (this.currentDays() > 365 ? 3650 : this.currentDays()));

  readonly periodTitle = computed(() => {
    const label = this.rangeLabel();
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly rankHint = computed(
    () => `By ${this.sortBy()} ${this.sortDirection() === 'asc' ? '↑' : '↓'}`,
  );

  onPeriodSelected(value: string | number) {
    this.setFilter(Number(value));
  }

  onSortSelected(value: string | number) {
    this.onSort(value as 'plays' | 'revenue' | 'downloads');
  }

  isLoading = signal(true);
  error = signal<string | null>(null);
  data = signal<AnalyticsOverviewResponse | null>(null);
  topSpecs = signal<TopSpecStat[]>([]);
  lineChartData = signal<any>({ labels: [], datasets: [] });
  revenueChartData = signal<any>({ labels: [], datasets: [] });
  doughnutChartData = signal<any>({ labels: [], datasets: [] });
  trackArtwork = signal<Record<string, string>>({});
  hoveredBigPoint = signal<{
    x: number;
    revenueY: number;
    playsY: number;
    revenue: number;
    plays: number;
    label: string;
  } | null>(null);

  currentDays = signal(30);
  sortBy = signal<'plays' | 'revenue' | 'downloads'>('plays');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Chart computed signals
  trendPoints = computed(() => {
    const d = this.data();
    if (!d) return [];
    const plays = d.plays_by_day ?? [];
    const downloads = d.downloads_by_day ?? [];
    const maxVal = Math.max(...plays.map((p) => p.count), ...downloads.map((p) => p.count), 1);
    const downloadsMap = new Map(downloads.map((item) => [item.date, item.count]));

    return plays.map((item) => ({
      date: item.date,
      plays: item.count,
      downloads: downloadsMap.get(item.date) ?? 0,
      playsH: Math.round((item.count / maxVal) * 100),
      dlH: Math.round(((downloadsMap.get(item.date) ?? 0) / maxVal) * 100),
    }));
  });

  playsLinePoints = computed(() => {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const width = 800;
    const height = 200;
    const step = width / Math.max(pts.length - 1, 1);
    return pts.map((p, i) => `${i * step},${height - p.playsH * 1.8}`).join(' ');
  });

  playsAreaPoints = computed(() => {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const width = 800;
    const height = 200;
    const step = width / Math.max(pts.length - 1, 1);
    const top = pts.map((p, i) => `${i * step},${height - p.playsH * 1.8}`).join(' ');
    return `0,${height} ${top} ${width},${height}`;
  });

  downloadsLinePoints = computed(() => {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const width = 800;
    const height = 200;
    const step = width / Math.max(pts.length - 1, 1);
    return pts.map((p, i) => `${i * step},${height - p.dlH * 1.8}`).join(' ');
  });

  bigSeries = computed(() => {
    const data = this.data();
    const revenue = data?.revenue_by_day ?? [];
    const plays = data?.plays_by_day ?? [];
    const revenueValues = revenue.map((row) => row.revenue);
    const playValues = plays.map((row) => row.count);
    const labels = (revenue.length ? revenue : plays).map((row) => this.shortDate(row.date));
    const max = Math.max(...revenueValues, ...playValues.map((v) => v * 20), 1);
    const width = 800;
    const height = 280;
    const pad = 10;

    const make = (values: number[], multiplier = 1) =>
      values.map((value, i) => ({
        x: pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2),
        y: 260 - ((value * multiplier) / max) * 220,
        value,
        label: labels[i] ?? `Day ${i + 1}`,
      }));

    return {
      revenue: make(revenueValues),
      plays: make(playValues, 20),
      width,
      height,
    };
  });

  bigRevenueLinePath = computed(() => this.linePath(this.bigSeries().revenue));
  bigRevenueAreaPath = computed(() => this.areaPath(this.bigSeries().revenue, 260));
  bigPlaysLinePath = computed(() => this.linePath(this.bigSeries().plays));
  bigPlaysAreaPath = computed(() => this.areaPath(this.bigSeries().plays, 260));
  topSpecRows = computed(() =>
    this.topSpecs().map((spec) => ({
      ...spec,
      imageUrl: this.trackImageFor(spec),
    })),
  );

  donutSegments = computed(() => {
    const items = this.licenseBreakdown();
    const circumference = 302;
    let offset = 0;
    return items.map((item) => {
      const dash = Math.max(1, (item.share / 100) * circumference);
      const segment = { ...item, dash: `${dash} ${circumference - dash}`, offset: -offset };
      offset += dash;
      return segment;
    });
  });

  revenueBars = computed(() => {
    const d = this.data();
    if (!d || !d.revenue_by_day) return [];
    const revs = d.revenue_by_day;
    const maxRev = Math.max(...revs.map((r) => r.revenue), 1);
    return revs.map((r) => ({
      date: r.date,
      val: r.revenue,
      h: Math.round((r.revenue / maxRev) * 100),
    }));
  });

  licenseBreakdown = computed(() => {
    const d = this.data();
    if (!d || !d.revenue_by_license) return [];
    const entries = Object.entries(d.revenue_by_license);
    const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        share: Math.round((value / total) * 100),
        color: ['var(--hot)', 'var(--cobalt)', 'var(--lime)', 'var(--sun)', 'var(--lavender)'][
          i % 5
        ],
      }));
  });

  // ── Refreshed analytics helpers ──────────────────────

  private sum(values: number[]): number {
    return values.reduce((total, v) => total + v, 0);
  }

  /** Later half vs earlier half of the selected range, or null if there are too few points. */
  private halfChange(values: number[]): { text: string; up: boolean } | null {
    const n = Math.floor(values.length / 2);
    if (n < 2) return null;
    const current = this.sum(values.slice(-n));
    const previous = this.sum(values.slice(-2 * n, -n));
    if (previous <= 0) return null;
    const pct = ((current - previous) / previous) * 100;
    return { text: `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 };
  }

  private sparkOf(values: number[]): string {
    const series = values.slice(-14);
    if (series.length < 2) return '';
    const max = Math.max(...series);
    const min = Math.min(...series);
    const span = max - min || 1;
    const step = 80 / (series.length - 1);
    return series
      .map((v, i) => `${(i * step).toFixed(1)},${(20 - ((v - min) / span) * 18).toFixed(1)}`)
      .join(' ');
  }

  /** True when the selected range returned real daily data (the chart never draws placeholder curves). */
  hasTrend = computed(() => {
    const d = this.data();
    return !!d && ((d.revenue_by_day?.length ?? 0) > 0 || (d.plays_by_day?.length ?? 0) > 0);
  });

  /** Four real metrics for the selected range. */
  metricTiles = computed<MetricTile[]>(() => {
    const d = this.data();
    const plays = (d?.plays_by_day ?? []).map((r) => r.count);
    const downloads = (d?.downloads_by_day ?? []).map((r) => r.count);
    const revenue = (d?.revenue_by_day ?? []).map((r) => r.revenue);
    const range = this.rangeLabel();

    const make = (label: string, value: string, accent: SuAccent, series: number[]): MetricTile => {
      const change = this.halfChange(series);
      return {
        label,
        value,
        delta: change?.text ?? '',
        up: change ? change.up : null,
        hint: change ? 'vs earlier half' : range,
        spark: this.sparkOf(series),
        accent,
      };
    };

    return [
      make(
        'Plays',
        (plays.length ? this.sum(plays) : (d?.total_plays ?? 0)).toLocaleString('en-IN'),
        'hot',
        plays,
      ),
      make(
        'Revenue',
        this.currency(revenue.length ? this.sum(revenue) : (d?.total_revenue ?? 0)),
        'cobalt',
        revenue,
      ),
      make(
        'Downloads',
        (downloads.length ? this.sum(downloads) : (d?.total_downloads ?? 0)).toLocaleString(
          'en-IN',
        ),
        'sun',
        downloads,
      ),
      {
        label: 'Favorites',
        value: (d?.total_favorites ?? 0).toLocaleString('en-IN'),
        delta: '',
        up: null,
        hint: 'All time',
        spark: '',
        accent: 'lavender',
      },
    ];
  });

  /** First / middle / last date labels under the main chart. */
  chartAxis = computed(() => {
    const points = this.bigSeries().revenue;
    if (!points.length || !this.hasTrend()) return [];
    return [points[0].label, points[Math.floor(points.length / 2)].label, 'Today'];
  });

  constructor() {
    this.loadData();
    this.loadTrackArtwork();

    this.paymentService.getProducerOrders(1, 5).subscribe({
      next: (res) => {
        if (res.orders && res.orders.length > 0 && res.orders[0].currency) {
          this.ordersCurrency.set(res.orders[0].currency as AppCurrency);
        }
      },
      error: () => {},
    });
  }

  setFilter(days: number) {
    if (this.currentDays() === days) return;
    this.currentDays.set(days);
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.error.set(null);
    if (this.reportCurrencyOverride()) this.data.set(null);
    this.analyticsService.getOverview(
        this.currentDays(),
        this.sortBy(),
        ...(this.reportCurrencyOverride() ? ([this.reportCurrencyOverride()] as [string]) : []),
      ).subscribe({
      next: (res) => {
        this.data.set(res);
        this.setChartCompatibilityData(res);
        this.error.set(null);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load analytics data');
        this.isLoading.set(false);
      },
    });
    this.loadTopSpecs();
  }

  loadTopSpecs() {
    this.analyticsService.getTopSpecs(5, this.sortBy()).subscribe((res) => {
      const sorted = [...res];
      if (this.sortDirection() === 'asc') sorted.reverse();
      this.topSpecs.set(sorted);
    });
  }

  onSort(field: 'plays' | 'revenue' | 'downloads') {
    if (this.sortBy() === field) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(field);
      this.sortDirection.set('desc');
    }
    this.loadTopSpecs();
  }

  exportCSV() {
    const data = this.data();
    if (!data) return;
    this.csvService.downloadAnalyticsCsv(data, this.currentDays());
  }

  onBigChartMove(event: MouseEvent) {
    const series = this.bigSeries();
    if (!series.revenue.length) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * series.width;
    const nearestIndex = series.revenue.reduce(
      (bestIndex, point, index) =>
        Math.abs(point.x - x) < Math.abs(series.revenue[bestIndex].x - x) ? index : bestIndex,
      0,
    );
    const revenue = series.revenue[nearestIndex];
    const plays = series.plays[Math.min(nearestIndex, series.plays.length - 1)] ?? revenue;
    this.hoveredBigPoint.set({
      x: revenue.x,
      revenueY: revenue.y,
      playsY: plays.y,
      revenue: revenue.value,
      plays: plays.value,
      label: revenue.label,
    });
  }

  clearBigChartHover() {
    this.hoveredBigPoint.set(null);
  }

  shortDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr.slice(5, 10);
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

  getLegendColor(index: number): string {
    const dataset = this.doughnutChartData().datasets?.[0];
    const colors = dataset?.backgroundColor;
    if (Array.isArray(colors)) return colors[index] ?? '#ccc';
    if (typeof colors === 'string' && index === 0) return colors;
    return '#ccc';
  }

  rangeLabel(): string {
    const days = this.currentDays();
    if (days === 7) return 'last 7 days';
    if (days === 30) return 'last 30 days';
    if (days === 90) return 'last 90 days';
    if (days === 365) return 'last year';
    return 'all time';
  }

  totalLicenseCount(): number {
    return (
      this.licenseBreakdown().reduce((sum, item) => sum + Math.round(item.value / 1000), 0) ||
      this.licenseBreakdown().length
    );
  }

  currency(value: number): string {
    return this.currencyService.formatMoney(null, value, this.producerCurrency());
  }

  private linePath(points: { x: number; y: number }[]): string {
    if (!points.length) return '';
    return `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
  }

  private areaPath(points: { x: number; y: number }[], baseline: number): string {
    if (!points.length) return '';
    return `M ${points[0].x} ${baseline} L ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${
      points[points.length - 1].x
    } ${baseline} Z`;
  }

  private loadTrackArtwork() {
    this.labService?.getSpecs({ category: 'beat', per_page: 12, sort: this.sortBy() }).subscribe({
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

  private setChartCompatibilityData(data: AnalyticsOverviewResponse): void {
    const gradient =
      (hot: string, cold: string) =>
      ({ chart }: any) => {
        const ctx = chart?.ctx;
        if (!ctx?.createLinearGradient) return hot;
        const fill = ctx.createLinearGradient(0, 0, 0, 280);
        fill.addColorStop(0, hot);
        fill.addColorStop(1, cold);
        return fill;
      };

    this.lineChartData.set({
      labels: (data.plays_by_day ?? []).map((row) => row.date),
      datasets: [
        {
          data: (data.plays_by_day ?? []).map((row) => row.count),
          backgroundColor: gradient('rgba(239,68,68,0.25)', 'rgba(239,68,68,0)'),
        },
        {
          data: (data.downloads_by_day ?? []).map((row) => row.count),
          backgroundColor: gradient('rgba(45,76,255,0.2)', 'rgba(45,76,255,0)'),
        },
      ],
    });

    this.revenueChartData.set({
      labels: (data.revenue_by_day ?? []).map((row) => row.date),
      datasets: [
        {
          data: (data.revenue_by_day ?? []).map((row) => row.revenue),
          backgroundColor: gradient('rgba(200,232,79,0.3)', 'rgba(200,232,79,0)'),
        },
      ],
    });

    const colors = ['#ef4444', '#f59e0b', '#2d4cff', '#c8e84f', '#c9b8ff'];
    const entries = Object.entries(data.revenue_by_license ?? {});
    this.doughnutChartData.set({
      labels: entries.map(([label]) => label),
      datasets: [
        {
          data: entries.map(([, value]) => value),
          backgroundColor: colors.slice(0, entries.length),
        },
      ],
    });
  }
}
