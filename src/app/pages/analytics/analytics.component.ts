import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, ViewChild } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, ChartEvent, ActiveElement } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';
import { AnalyticsOverviewResponse, TopSpecStat } from '../../core/api/analytics.requests';
import { CsvExportService } from '../../core/services/csv-export.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent {
  private analyticsService = inject(AnalyticsService);
  private csvService = inject(CsvExportService);

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  isLoading = signal(true);
  error = signal<string | null>(null);
  data = signal<AnalyticsOverviewResponse | null>(null);
  topSpecs = signal<TopSpecStat[]>([]);

  // Filter States
  currentDays = signal(30);
  sortBy = signal<'plays' | 'revenue' | 'downloads'>('plays');

  // Chart Properties
  public lineChartType: ChartType = 'line';
  public doughnutChartType: 'doughnut' = 'doughnut';

  // --- Chart Data Signals ---
  public lineChartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });
  public revenueChartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });
  public doughnutChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });

  // --- Chart Options (Premium Style) ---
  public commonChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4, // Smooth curves
        borderWidth: 3,
        fill: 'origin',
      },
      point: {
        radius: 0, // Clean look, show on hover only
        hitRadius: 20,
        hoverRadius: 6,
        hoverBorderWidth: 2,
      },
      bar: {
        borderRadius: 4,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
          tickLength: 0,
        },
        ticks: {
          color: '#64748b',
          font: { family: 'Manrope', size: 11 },
          padding: 10,
          maxTicksLimit: 6,
        },
        border: { display: false }, // No axis line
      },
      x: {
        grid: { display: false }, // No vertical grid lines
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
      legend: {
        display: false, // We'll build custom legends if needed, or minimalistic ones
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
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
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  public revenueChartOptions: ChartConfiguration['options'] = {
    ...this.commonChartOptions,
    scales: {
      ...this.commonChartOptions?.scales,
      y: {
        ...this.commonChartOptions?.scales?.['y'],
        ticks: {
          ...this.commonChartOptions?.scales?.['y']?.ticks,
          callback: (value) => '₹' + value,
        },
      },
    },
  };

  public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%', // Thinner ring
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#cbd5e1',
          font: { family: 'Manrope', size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        ...this.commonChartOptions?.plugins?.tooltip,
      },
    },
    elements: {
      arc: {
        borderWidth: 0, // No borders on segments
      },
    },
  };

  constructor() {
    this.loadData();
  }

  setFilter(days: number) {
    if (this.currentDays() === days) return;
    this.currentDays.set(days);
    this.loadData();
  }

  setSort(sort: 'plays' | 'revenue' | 'downloads') {
    if (this.sortBy() === sort) return;
    this.sortBy.set(sort);
    this.loadTopSpecs();
  }

  loadData() {
    this.isLoading.set(true);
    this.analyticsService.getOverview(this.currentDays(), 'plays').subscribe({
      next: (res) => {
        this.data.set(res);
        this.isLoading.set(false);
        this.updateCharts(res);
      },
      error: (err) => {
        console.error('Analytics error', err);
        this.error.set('Failed to load analytics data');
        this.isLoading.set(false);
      },
    });
    this.loadTopSpecs();
  }

  loadTopSpecs() {
    this.analyticsService.getTopSpecs(5, this.sortBy()).subscribe({
      next: (specs) => this.topSpecs.set(specs),
      error: (err) => console.error('Failed to load top specs', err),
    });
  }

  exportCSV() {
    const data = this.data();
    if (!data) return;
    this.csvService.downloadAnalyticsCsv(data, this.currentDays());
  }

  private updateCharts(data: AnalyticsOverviewResponse) {
    // --- 1. Main Performance Chart (Plays vs Downloads) ---
    const allDates = new Set<string>();
    data.plays_by_day?.forEach((d) => allDates.add(d.date));
    data.downloads_by_day?.forEach((d) => allDates.add(d.date));
    const labels = Array.from(allDates).sort();

    const playsMap = new Map(data.plays_by_day?.map((d) => [d.date, d.count]));
    const downloadsMap = new Map(data.downloads_by_day?.map((d) => [d.date, d.count]));

    const playsData = labels.map((date) => playsMap.get(date) || 0);
    const downloadsData = labels.map((date) => downloadsMap.get(date) || 0);

    // Create gradients (Note: In a real app we might need a canvas ref to do true gradients,
    // but we can simulate or just use solid colors with opacity for now)

    this.lineChartData.set({
      labels,
      datasets: [
        {
          data: playsData,
          label: 'Plays',
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#ef4444',
        },
        {
          data: downloadsData,
          label: 'Downloads',
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          pointBackgroundColor: '#a855f7',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#a855f7',
        },
      ],
    });

    // --- 2. Revenue Chart ---
    const revLabels = data.revenue_by_day?.map((d) => d.date) || [];
    const revData = data.revenue_by_day?.map((d) => d.revenue) || [];

    this.revenueChartData.set({
      labels: revLabels,
      datasets: [
        {
          data: revData,
          label: 'Revenue',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#10b981',
        },
      ],
    });

    // --- 3. License Distribution ---
    const licLabels = Object.keys(data.revenue_by_license);
    const licValues = Object.values(data.revenue_by_license);

    this.doughnutChartData.set({
      labels: licLabels,
      datasets: [
        {
          data: licValues,
          backgroundColor: [
            '#ef4444', // Red
            '#3b82f6', // Blue
            '#10b981', // Green
            '#f59e0b', // Amber
            '#8b5cf6', // Violet
          ],
          hoverOffset: 4,
        },
      ],
    });
  }
}
