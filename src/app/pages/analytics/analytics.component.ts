import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
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

  isLoading = signal(true);
  error = signal<string | null>(null);
  data = signal<AnalyticsOverviewResponse | null>(null);
  topSpecs = signal<TopSpecStat[]>([]);
  currentDays = signal(30);
  sortBy = signal<'plays' | 'revenue' | 'downloads'>('plays');

  // Chart Configs
  public lineChartType: ChartType = 'line';
  public doughnutChartType: ChartType = 'doughnut';

  public lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [],
  };

  public revenueChartData: ChartData<'line'> = {
    labels: [],
    datasets: [],
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 2,
        hoverRadius: 6,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: { color: '#94a3b8' },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' },
      },
    },
    plugins: {
      legend: {
        display: true,
        labels: { color: '#fff' },
      },
    },
  };

  public revenueChartOptions: ChartConfiguration['options'] = {
    ...this.lineChartOptions,
    scales: {
      y: {
        ...this.lineChartOptions?.scales?.['y'],
        ticks: {
          color: '#94a3b8',
          callback: (value) => '₹' + value,
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' },
      },
    },
  };

  public doughnutChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [],
  };

  constructor() {
    this.loadData();
  }

  onFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const days = parseInt(select.value, 10);
    this.currentDays.set(days);
    this.loadData();
  }

  onSortChange(sortBy: string) {
    this.sortBy.set(sortBy as 'plays' | 'revenue' | 'downloads');
    this.loadTopSpecs();
  }

  loadData() {
    this.isLoading.set(true);

    // Load Overview
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

    // Load Top Specs
    this.loadTopSpecs();
  }

  loadTopSpecs() {
    this.analyticsService.getTopSpecs(5, this.sortBy()).subscribe({
      next: (specs) => {
        this.topSpecs.set(specs);
      },
      error: (err) => {
        console.error('Failed to load top specs', err);
      },
    });
  }

  private csvService = inject(CsvExportService);

  exportCSV() {
    const data = this.data();
    if (!data) return;
    this.csvService.downloadAnalyticsCsv(data, this.currentDays());
  }

  updateCharts(data: AnalyticsOverviewResponse) {
    // Update Line Chart (Plays & Downloads)
    // 1. Get all unique dates from both datasets
    const allDates = new Set<string>();
    data.plays_by_day?.forEach((d) => allDates.add(d.date));
    data.downloads_by_day?.forEach((d) => allDates.add(d.date));

    // 2. Sort dates
    const labels = Array.from(allDates).sort();

    // 3. Create maps for O(1) lookup
    const playsMap = new Map(data.plays_by_day?.map((d) => [d.date, d.count]));
    const downloadsMap = new Map(data.downloads_by_day?.map((d) => [d.date, d.count]));

    // 4. Map data to sorted dates (filling 0 for missing days)
    const playsData = labels.map((date) => playsMap.get(date) || 0);
    const downloadsData = labels.map((date) => downloadsMap.get(date) || 0);

    this.lineChartData = {
      labels,
      datasets: [
        {
          data: playsData,
          label: 'Plays',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: '#ef4444',
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#ef4444',
          fill: 'origin',
        },
        {
          data: downloadsData,
          label: 'Downloads',
          backgroundColor: 'rgba(168, 85, 247, 0.1)', // Purple
          borderColor: '#a855f7',
          pointBackgroundColor: '#a855f7',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#a855f7',
          fill: 'origin',
        },
      ],
    };

    // Update Revenue Chart
    const revenueLabels = data.revenue_by_day?.map((d) => d.date) || [];
    const revenueData = data.revenue_by_day?.map((d) => d.revenue) || [];

    this.revenueChartData = {
      labels: revenueLabels,
      datasets: [
        {
          data: revenueData,
          label: 'Revenue (₹)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)', // Green
          borderColor: '#10b981',
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#10b981',
          fill: 'origin',
        },
      ],
    };

    // Update Doughnut Chart (Revenue by License)
    const licenseLabels = Object.keys(data.revenue_by_license);
    const licenseValues = Object.values(data.revenue_by_license);

    this.doughnutChartData = {
      labels: licenseLabels,
      datasets: [
        {
          data: licenseValues,
          backgroundColor: [
            '#ef4444', // brand red
            '#3b82f6', // blue
            '#10b981', // green
            '#f59e0b', // yellow
          ],
        },
      ],
    };
  }
}
