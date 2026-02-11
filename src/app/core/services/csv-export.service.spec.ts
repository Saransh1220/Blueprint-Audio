import { CsvExportService } from './csv-export.service';

describe('CsvExportService', () => {
  it('builds report sections and triggers file download', () => {
    const service = new CsvExportService();
    const downloadSpy = vi.spyOn(service as never, 'downloadFile' as never);
    const dateSpy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('01/01/2026');

    service.downloadAnalyticsCsv(
      {
        total_plays: 100,
        total_favorites: 20,
        total_revenue: 450,
        total_downloads: 8,
        revenue_by_license: { Basic: 300, Premium: 150 },
        top_specs: [
          { spec_id: 's1', title: 'Night "Drive"', plays: 88, downloads: 12, revenue: 999 },
        ],
        plays_by_day: [{ date: '2026-01-01', count: 10 }],
        downloads_by_day: [{ date: '2026-01-01', count: 2 }],
        revenue_by_day: [{ date: '2026-01-01', revenue: 100 }],
      },
      30,
    );

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    const [csv, filename] = downloadSpy.mock.calls[0] as [string, string];
    expect(filename).toBe('analytics-report-30d.csv');
    expect(csv).toContain('Analytics Report');
    expect(csv).toContain('Generated on,01/01/2026');
    expect(csv).toContain('Revenue by License');
    expect(csv).toContain('Title,Plays,Downloads,Revenue');
    expect(csv).toContain('"Night ""Drive""",88,12,999');
    expect(csv).toContain('Daily Plays Timeline');

    dateSpy.mockRestore();
  });

  it('handles empty top specs and daily plays branches', () => {
    const service = new CsvExportService();
    const downloadSpy = vi.spyOn(service as never, 'downloadFile' as never);

    service.downloadAnalyticsCsv(
      {
        total_plays: 0,
        total_favorites: 0,
        total_revenue: 0,
        total_downloads: 0,
        revenue_by_license: {},
        top_specs: [],
        plays_by_day: [],
        downloads_by_day: [],
        revenue_by_day: [],
      },
      7,
    );

    const [csv] = downloadSpy.mock.calls[0] as [string, string];
    expect(csv).toContain('Top Specs\nNo data available');
    expect(csv).toContain('Daily Activity\nNo data available');
  });

  it('downloadCsv no-ops for empty data', () => {
    const service = new CsvExportService();
    const downloadSpy = vi.spyOn(service, 'downloadFile');

    service.downloadCsv([], 'orders');

    expect(downloadSpy).not.toHaveBeenCalled();
  });

  it('downloadCsv escapes values and appends extension', () => {
    const service = new CsvExportService();
    const downloadSpy = vi.spyOn(service, 'downloadFile');

    service.downloadCsv([{ Name: 'Sam "Wave"', Email: 'sam@test.com' }], 'orders_export');

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    const [csv, filename] = downloadSpy.mock.calls[0] as [string, string];
    expect(csv).toContain('Name,Email');
    expect(csv).toContain('"Sam ""Wave""","sam@test.com"');
    expect(filename).toBe('orders_export.csv');
  });
});
