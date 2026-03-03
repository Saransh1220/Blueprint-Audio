import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AnalyticsService } from '../../services/analytics.service';
import { CsvExportService } from '../../core/services/csv-export.service';
import { AnalyticsComponent } from './analytics.component';

describe('AnalyticsComponent', () => {
  const getOverview = vi.fn();
  const getTopSpecs = vi.fn();
  const downloadAnalyticsCsv = vi.fn();

  const overview = {
    total_plays: 10,
    total_revenue: 20,
    total_downloads: 5,
    total_favorites: 3,
    plays_by_day: [
      { date: '2026-02-20', count: 5 },
      { date: '2026-02-21', count: 7 },
    ],
    downloads_by_day: [{ date: '2026-02-21', count: 2 }],
    revenue_by_day: [{ date: '2026-02-21', revenue: 200 }],
    revenue_by_license: { Basic: 100, Premium: 100 },
  } as any;

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AnalyticsService, useValue: { getOverview, getTopSpecs } },
        { provide: CsvExportService, useValue: { downloadAnalyticsCsv } },
      ],
    });
    return TestBed.runInInjectionContext(() => new AnalyticsComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getOverview.mockReturnValue(of(overview));
    getTopSpecs.mockReturnValue(
      of([{ spec_id: 's1', title: 'A', plays: 10, revenue: 20, downloads: 3 }]),
    );
  });

  it('loads analytics and charts on construction', () => {
    const component = create();
    expect(component.isLoading()).toBe(false);
    expect(component.data()).toEqual(overview);
    expect(component.lineChartData().labels).toEqual(['2026-02-20', '2026-02-21']);
    expect(component.topSpecs().length).toBe(1);
  });

  it('handles load errors and sorting behavior', () => {
    getOverview.mockReturnValueOnce(throwError(() => new Error('boom')));
    const component = create();

    expect(component.error()).toBe('Failed to load analytics data');
    expect(component.isLoading()).toBe(false);

    component.onSort('plays');
    expect(component.sortDirection()).toBe('asc');
    component.onSort('downloads');
    expect(component.sortBy()).toBe('downloads');
    expect(component.sortDirection()).toBe('desc');

    getOverview.mockClear();
    component.setFilter(30);
    expect(getOverview).not.toHaveBeenCalled();
    component.setFilter(7);
    expect(getOverview).toHaveBeenCalled();
  });

  it('toggles chart type, exports csv and resolves legend colors', () => {
    const component = create();
    component.toggleRevenueChart();
    expect(component.revenueChartType()).toBe('line');

    component.exportCSV();
    expect(downloadAnalyticsCsv).toHaveBeenCalledWith(overview, 30);

    expect(component.getLegendColor(0)).toBe('#ef4444');
    expect(component.getLegendColor(99)).toBe('#ccc');

    component.doughnutChartData.set({ labels: [], datasets: [] } as any);
    expect(component.getLegendColor(0)).toBe('#ccc');
    component.doughnutChartData.set({
      labels: ['A'],
      datasets: [{ data: [1], backgroundColor: '#123456' } as any],
    });
    expect(component.getLegendColor(0)).toBe('#123456');
  });

  it('executes chart gradient callbacks for line and revenue datasets', () => {
    const component = create();
    const fakeCanvasCtx = {
      createLinearGradient: () => ({
        addColorStop: vi.fn(),
      }),
    } as any;

    const lineBgFn = component.lineChartData().datasets[1].backgroundColor as any;
    const revBgFn = component.revenueChartData().datasets[0].backgroundColor as any;

    expect(lineBgFn({ chart: { ctx: fakeCanvasCtx } })).toBeTruthy();
    expect(revBgFn({ chart: { ctx: fakeCanvasCtx } })).toBeTruthy();
  });
});
