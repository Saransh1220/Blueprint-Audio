import { Injectable } from '@angular/core';
import { AnalyticsOverviewResponse } from '../api/analytics.requests';

@Injectable({
  providedIn: 'root',
})
export class CsvExportService {
  downloadAnalyticsCsv(data: AnalyticsOverviewResponse, days: number, currency: string = 'INR'): void {
    const sections: string[] = [];

    // 1. Report Header
    sections.push(this.generateHeader(days, currency));

    // 2. Summary Stats
    sections.push(this.generateSummary(data, currency));

    // 3. Revenue Breakdown
    sections.push(this.generateRevenueBreakdown(data.revenue_by_license, currency));

    // 4. Top Specs
    sections.push(this.generateTopSpecs(data.top_specs, currency));

    // 5. Daily Plays (Timeline)
    sections.push(this.generateDailyPlays(data.plays_by_day));

    // Combine and download
    const csvContent = sections.join('\n\n'); // Add spacing between sections
    this.downloadFile(csvContent, `analytics-report-${days}d.csv`);
  }

  private generateHeader(days: number, currency: string = 'INR'): string {
    const today = new Date().toLocaleDateString();
    return `Analytics Report\nGenerated on,${today}\nPeriod,Last ${days} Days\nCurrency,${currency}`;
  }

  private generateSummary(data: AnalyticsOverviewResponse, currency: string = 'INR'): string {
    return [
      'Summary',
      'Metric,Value,Currency',
      `Total Plays,${data.total_plays},—`,
      `Total Revenue,${data.total_revenue},${currency}`,
      `Total Favorites,${data.total_favorites},—`,
      `Total Downloads,${data.total_downloads},—`,
    ].join('\n');
  }

  private generateRevenueBreakdown(revenue: { [key: string]: number }, currency: string = 'INR'): string {
    const rows = Object.entries(revenue).map(([license, amount]) => `${license},${amount},${currency}`);
    return ['Revenue by License', 'License Type,Amount,Currency', ...rows].join('\n');
  }

  private generateTopSpecs(
    specs: { title: string; plays: number; downloads: number; revenue: number }[],
    currency: string = 'INR',
  ): string {
    if (!specs.length) return 'Top Specs\nNo data available';

    // Sanitize titles to avoid CSV injection or broken cols (wrap in quotes if needed)
    const rows = specs.map(
      (s) => `"${s.title.replace(/"/g, '""')}",${s.plays},${s.downloads},${s.revenue},${currency}`,
    );
    return ['Top Performing Specs', 'Title,Plays,Downloads,Revenue,Currency', ...rows].join('\n');
  }

  private generateDailyPlays(days: { date: string; count: number }[]): string {
    if (!days.length) return 'Daily Activity\nNo data available';

    const rows = days.map((d) => `${d.date},${d.count}`);
    return ['Daily Plays Timeline', 'Date,Plays', ...rows].join('\n');
  }

  downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  downloadCsv(data: any[], filename: string): void {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((fieldName) => {
            const value = row[fieldName]?.toString() || '';
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ].join('\n');

    this.downloadFile(csvContent, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  }
}
