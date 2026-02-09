import { Injectable } from '@angular/core';
import { AnalyticsOverviewDto } from '../api/analytics.requests';

@Injectable({
  providedIn: 'root',
})
export class CsvExportService {
  downloadAnalyticsCsv(data: AnalyticsOverviewDto, days: number): void {
    const sections: string[] = [];

    // 1. Report Header
    sections.push(this.generateHeader(days));

    // 2. Summary Stats
    sections.push(this.generateSummary(data));

    // 3. Revenue Breakdown
    sections.push(this.generateRevenueBreakdown(data.revenue_by_license));

    // 4. Top Specs
    sections.push(this.generateTopSpecs(data.top_specs));

    // 5. Daily Plays (Timeline)
    sections.push(this.generateDailyPlays(data.plays_by_day));

    // Combine and download
    const csvContent = sections.join('\n\n'); // Add spacing between sections
    this.downloadFile(csvContent, `analytics-report-${days}d.csv`);
  }

  private generateHeader(days: number): string {
    const today = new Date().toLocaleDateString();
    return `Analytics Report\nGenerated on,${today}\nPeriod,Last ${days} Days`;
  }

  private generateSummary(data: AnalyticsOverviewDto): string {
    return [
      'Summary',
      'Metric,Value',
      `Total Plays,${data.total_plays}`,
      `Total Revenue,${data.total_revenue}`,
      `Total Favorites,${data.total_favorites}`,
      `Total Downloads,${data.total_downloads}`,
    ].join('\n');
  }

  private generateRevenueBreakdown(revenue: { [key: string]: number }): string {
    const rows = Object.entries(revenue).map(([license, amount]) => `${license},${amount}`);
    return ['Revenue by License', 'License Type,Amount', ...rows].join('\n');
  }

  private generateTopSpecs(specs: { title: string; plays: number }[]): string {
    if (!specs.length) return 'Top Specs\nNo data available';

    // Sanitize titles to avoid CSV injection or broken cols (wrap in quotes if needed)
    const rows = specs.map((s) => `"${s.title.replace(/"/g, '""')}",${s.plays}`);
    return ['Top Performing Specs', 'Title,Plays', ...rows].join('\n');
  }

  private generateDailyPlays(days: { date: string; count: number }[]): string {
    if (!days.length) return 'Daily Activity\nNo data available';

    const rows = days.map((d) => `${d.date},${d.count}`);
    return ['Daily Plays Timeline', 'Date,Plays', ...rows].join('\n');
  }

  private downloadFile(content: string, filename: string): void {
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
}
