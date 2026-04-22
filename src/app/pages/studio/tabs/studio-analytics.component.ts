import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../services/analytics.service';
import { AnalyticsOverviewResponse, TopSpecStat } from '../../../core/api/analytics.requests';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { LabService } from '../../../services';

@Component({
  selector: 'app-studio-analytics',
  imports: [CommonModule],
  templateUrl: './studio-analytics.component.html',
  styleUrl: './studio-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioAnalyticsComponent {
  private analyticsService = inject(AnalyticsService);
  private csvService = inject(CsvExportService);
  private labService = inject(LabService, { optional: true });

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
    const len = Math.max(revenue.length, plays.length, 1);
    const fallbackRevenue = Array.from(
      { length: len || 30 },
      (_, i) => 1200 + i * 80 + Math.sin(i * 0.7) * 450,
    );
    const fallbackPlays = Array.from(
      { length: len || 30 },
      (_, i) => 80 + i * 5 + Math.cos(i * 0.8) * 22,
    );
    const revenueValues = revenue.length ? revenue.map((row) => row.revenue) : fallbackRevenue;
    const playValues = plays.length ? plays.map((row) => row.count) : fallbackPlays;
    const labels = (revenue.length ? revenue : plays).length
      ? (revenue.length ? revenue : plays).map((row) => this.shortDate(row.date))
      : revenueValues.map((_, i) => `Day ${i + 1}`);
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

  analyticsCards = computed(() => [
    {
      cls: 'c1',
      label: 'Total plays',
      icon: '▶',
      value: (this.data()?.total_plays ?? 0).toLocaleString('en-IN'),
      delta: '+24%',
      spark: '0,18 10,16 20,12 30,10 40,8 50,6 60,7 70,4 80,2',
    },
    {
      cls: 'c2',
      label: 'Unique listeners',
      icon: '◉',
      value: '18,420',
      delta: '+16%',
      spark: '0,16 10,14 20,11 30,10 40,8 50,9 60,6 70,5 80,3',
    },
    {
      cls: 'c3',
      label: 'Avg. watch time',
      icon: '⏱',
      value: '1:48',
      delta: '+8s',
      spark: '0,14 10,12 20,13 30,10 40,11 50,8 60,9 70,6 80,7',
    },
    {
      cls: 'c4',
      label: 'Bounce rate',
      icon: '↩',
      value: '32%',
      delta: '-4%',
      spark: '0,4 10,6 20,8 30,7 40,10 50,11 60,13 70,14 80,16',
    },
  ]);

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

  heatmapCells = Array.from({ length: 24 }, (_, i) => {
    const intensity = Math.round(
      18 + Math.max(0, Math.sin((i - 13) / 3)) * 68 + (i >= 21 && i <= 23 ? 22 : 0),
    );
    return { hour: i, color: `rgba(255, 61, 90, ${intensity / 100})` };
  });

  topCountries = [
    { label: 'United States', pct: 32, color: 'var(--hot)' },
    { label: 'Nigeria', pct: 20, color: 'var(--cobalt)' },
    { label: 'United Kingdom', pct: 14, color: 'var(--sun)' },
    { label: 'Germany', pct: 9, color: 'var(--lime)' },
    { label: 'Canada', pct: 7, color: 'var(--lavender)' },
    { label: 'Other', pct: 13, color: 'var(--ink-mute)' },
  ];

  referrers = [
    { label: 'redwave.com · search', pct: 44, color: 'var(--hot)' },
    { label: 'instagram.com', pct: 22, color: 'var(--cobalt)' },
    { label: 'tiktok.com', pct: 17, color: 'var(--lime)' },
    { label: 'Direct', pct: 11, color: 'var(--sun)' },
    { label: 'youtube.com', pct: 6, color: 'var(--lavender)' },
  ];

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

  constructor() {
    this.loadData();
    this.loadTrackArtwork();
  }

  setFilter(days: number) {
    if (this.currentDays() === days) return;
    this.currentDays.set(days);
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.analyticsService.getOverview(this.currentDays(), this.sortBy()).subscribe({
      next: (res) => {
        this.data.set(res);
        this.setChartCompatibilityData(res);
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
      let sorted = [...res];
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
    return `₹${Math.round(value || 0).toLocaleString('en-IN')}`;
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
