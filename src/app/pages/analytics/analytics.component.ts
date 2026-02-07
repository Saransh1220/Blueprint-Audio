import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { AnalyticsService } from '../../services/analytics.service';
import { AnalyticsOverviewDto, DailyStat, TopSpecStat } from '../../core/api/analytics.requests';
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
  data = signal<AnalyticsOverviewDto | null>(null);
  currentDays = signal(30);

  // Chart Configs
  public lineChartType: ChartType = 'line';
  public doughnutChartType: ChartType = 'doughnut';

  public lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Plays',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(148,159,177,0.8)',
        fill: 'origin',
      },
    ],
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0.5,
      },
    },
    scales: {
      // We show x axis
    },
    plugins: {
      legend: { display: true },
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

  loadData() {
    this.isLoading.set(true);
    this.analyticsService.getOverview(this.currentDays()).subscribe({
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
  }

  private csvService = inject(CsvExportService);

  exportCSV() {
    const data = this.data();
    if (!data) return;
    this.csvService.downloadAnalyticsCsv(data, this.currentDays());
  }

  updateCharts(data: AnalyticsOverviewDto) {
    // Update Line Chart (Plays by day)
    // Note: data.plays_by_day might be empty if we didn't implement time-series properly yet
    if (data.plays_by_day && data.plays_by_day.length > 0) {
      this.lineChartData = {
        labels: data.plays_by_day.map((d) => d.date),
        datasets: [
          {
            data: data.plays_by_day.map((d) => d.count),
            label: 'Plays',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderColor: '#ef4444',
            pointBackgroundColor: '#ef4444',
            fill: 'origin',
          },
        ],
      };
    } else {
      // Default empty state
      this.lineChartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [0, 0, 0, 0, 0, 0, 0],
            label: 'Plays',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderColor: '#ef4444',
            pointBackgroundColor: '#ef4444',
            fill: 'origin',
          },
        ],
      };
    }

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
