import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, ScriptableContext } from 'chart.js';
import { AnalyticsService } from '../../../services/analytics.service';
import { AnalyticsOverviewResponse, TopSpecStat } from '../../../core/api/analytics.requests';
import { CsvExportService } from '../../../core/services/csv-export.service';

@Component({
  selector: 'app-studio-analytics',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './studio-analytics.component.html',
  styleUrl: './studio-analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioAnalyticsComponent {
  private analyticsService = inject(AnalyticsService);
  private csvService = inject(CsvExportService);

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  isLoading = signal(true);
  error = signal<string | null>(null);
  data = signal<AnalyticsOverviewResponse | null>(null);
  topSpecs = signal<TopSpecStat[]>([]);

  currentDays = signal(30);
  sortBy = signal<'plays' | 'revenue' | 'downloads'>('plays');
  sortDirection = signal<'asc' | 'desc'>('desc');
  revenueChartType = signal<'bar' | 'line'>('bar');

  public lineChartType: ChartType = 'line';
  public doughnutChartType: 'doughnut' = 'doughnut';

  public lineChartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });
  public revenueChartData = signal<ChartData<'bar' | 'line'>>({ labels: [], datasets: [] });
  public doughnutChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });

  public commonChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: { tension: 0.4, borderWidth: 3, fill: 'origin' },
      point: { radius: 0, hitRadius: 20, hoverRadius: 6, hoverBorderWidth: 2 },
      bar: { borderRadius: 4 },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.03)', tickLength: 0 },
        ticks: {
          color: '#64748b',
          font: { family: 'Manrope', size: 11 },
          padding: 10,
          maxTicksLimit: 6,
        },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#64748b',
          font: { family: 'Manrope', size: 11 },
          maxTicksLimit: 8,
          maxRotation: 0,
        },
        border: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: 'Manrope', size: 13, weight: 'bold' },
        bodyFont: { family: 'Manrope', size: 12 },
        displayColors: true,
        boxPadding: 4,
      },
    },
    interaction: { mode: 'index', intersect: false },
  };

  public revenueChartOptions: ChartConfiguration['options'] = {
    ...this.commonChartOptions,
    plugins: {
      ...this.commonChartOptions?.plugins,
      tooltip: {
        ...this.commonChartOptions?.plugins?.tooltip,
        callbacks: { label: (ctx) => ` ₹${ctx.parsed.y}` },
      },
    },
    scales: {
      ...this.commonChartOptions?.scales,
      y: {
        ...this.commonChartOptions?.scales?.['y'],
        ticks: { ...this.commonChartOptions?.scales?.['y']?.ticks, callback: (v) => '₹' + v },
      },
    },
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '85%',
    circumference: 180,
    rotation: -90,
    plugins: {
      legend: { display: false },
      tooltip: { ...this.commonChartOptions?.plugins?.tooltip },
    },
    elements: { arc: { borderWidth: 0 } },
  };

  constructor() {
    this.loadData();
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
        this.isLoading.set(false);
        this.updateCharts(res);
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

  getLegendColor(index: number): string {
    const dataset = this.doughnutChartData().datasets[0];
    if (!dataset) return '#ccc';
    const bg = dataset.backgroundColor as any;
    if (Array.isArray(bg)) return bg[index] || '#ccc';
    return typeof bg === 'string' ? bg : '#ccc';
  }

  private updateCharts(data: AnalyticsOverviewResponse) {
    const allDates = new Set<string>();
    data.plays_by_day?.forEach((d) => allDates.add(d.date));
    data.downloads_by_day?.forEach((d) => allDates.add(d.date));
    const labels = Array.from(allDates).sort();
    const playsMap = new Map(data.plays_by_day?.map((d) => [d.date, d.count]));
    const downloadsMap = new Map(data.downloads_by_day?.map((d) => [d.date, d.count]));

    this.lineChartData.set({
      labels,
      datasets: [
        {
          data: labels.map((date) => playsMap.get(date) || 0),
          label: 'Plays',
          borderColor: '#ef4444',
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, 'rgba(239,68,68,0.4)');
            g.addColorStop(1, 'rgba(239,68,68,0.0)');
            return g;
          },
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#ef4444',
          fill: true,
          tension: 0.4,
        },
        {
          data: labels.map((date) => downloadsMap.get(date) || 0),
          label: 'Downloads',
          borderColor: '#a855f7',
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, 'rgba(168,85,247,0.4)');
            g.addColorStop(1, 'rgba(168,85,247,0.0)');
            return g;
          },
          pointBackgroundColor: '#a855f7',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#a855f7',
          fill: true,
          tension: 0.4,
        },
      ],
    });

    const revLabels = data.revenue_by_day?.map((d) => d.date) || [];
    this.revenueChartData.set({
      labels: revLabels,
      datasets: [
        {
          data: data.revenue_by_day?.map((d) => d.revenue) || [],
          label: 'Revenue',
          borderColor: '#10b981',
          backgroundColor: (ctx: ScriptableContext<'bar'>) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, 'rgba(16,185,129,0.2)');
            g.addColorStop(1, 'rgba(16,185,129,0.0)');
            return g;
          },
          hoverBackgroundColor: '#34d399',
          barThickness: 12,
          borderRadius: 4,
          tension: 0.4,
          fill: this.revenueChartType() === 'line',
        },
      ],
    });

    const licLabels = Object.keys(data.revenue_by_license);
    this.doughnutChartData.set({
      labels: licLabels,
      datasets: [
        {
          data: Object.values(data.revenue_by_license),
          backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
          hoverOffset: 4,
        },
      ],
    });
  }
}
