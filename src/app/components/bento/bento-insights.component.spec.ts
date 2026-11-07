import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AnalyticsOverviewResponse } from '../../core/api/analytics.requests';
import { BentoInsightsComponent } from './bento-insights.component';

const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

function overview(): AnalyticsOverviewResponse {
  const rows = (fn: (i: number) => number) =>
    Array.from({ length: 14 }, (_, i) => ({ date: day(13 - i), count: fn(i) }));
  return {
    total_plays: 999,
    total_favorites: 7,
    revenue_currency: 'USD',
    total_revenue: 123,
    total_downloads: 55,
    plays_by_day: rows((i) => (i < 7 ? 10 : 20)),
    downloads_by_day: rows(() => 2),
    revenue_by_day: Array.from({ length: 14 }, (_, i) => ({
      date: day(13 - i),
      revenue: i < 7 ? 5 : 10,
    })),
    top_specs: [
      { spec_id: 's1', title: 'Alpha', plays: 100, downloads: 10, revenue: 50 },
      { spec_id: 's2', title: 'Beta', plays: 50, downloads: 5, revenue: 20 },
    ],
    revenue_by_license: { basic: 100, premium: 300 },
  };
}

function make(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture: ComponentFixture<BentoInsightsComponent> =
    TestBed.createComponent(BentoInsightsComponent);
  fixture.componentRef.setInput('currency', 'USD');
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('BentoInsightsComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('draws every card from one overview response', () => {
    const { el } = make({
      data: overview(),
      topSpecs: overview().top_specs,
      artwork: { s1: 'a.png' },
      periodLabel: 'Last 14 days',
    });
    expect(el.querySelectorAll('app-bento-stat-tile').length).toBe(4);
    expect(el.querySelector('.headline .big')?.textContent).toBe('210');
    expect(el.querySelector('.chip')?.textContent).toContain('+');
    expect(el.querySelectorAll('app-bento-gauge line').length).toBe(56);
    expect(el.textContent).toContain('premium');
    expect(el.querySelector('app-bento-rank-list img')?.getAttribute('src')).toBe('a.png');
    expect(el.querySelectorAll('app-bento-weekday-bars .fill').length).toBe(7);
    expect(el.querySelector('app-bento-wave.flow')).not.toBeNull();
    expect(el.textContent).toContain('$');
  });

  it('ranks by revenue with formatted money and by downloads', () => {
    const { el, fixture } = make({
      data: overview(),
      topSpecs: overview().top_specs,
      rankBy: 'revenue',
    });
    expect(el.querySelector('app-bento-rank-list .val')?.textContent).toContain('$');
    fixture.componentRef.setInput('rankBy', 'downloads');
    fixture.detectChanges();
    expect(el.querySelector('app-bento-rank-list small')?.textContent).toContain('plays');
  });

  it('uses a gap-filled calendar window when windowDays is set', () => {
    const { el } = make({ data: overview(), windowDays: 7, periodLabel: 'Last 7 days' });
    expect(el.querySelector('.headline .big')?.textContent).toBe('140');
    expect(el.textContent).toContain('vs previous 7 days');
  });

  it('shows honest empty states while loading, when unavailable and when empty', () => {
    const loading = make({ state: 'loading' });
    expect(loading.el.textContent).toContain('Loading…');
    expect(loading.el.querySelector('app-bento-stat-tile')?.textContent).toContain('Loading');

    TestBed.resetTestingModule();
    const unavailable = make({ state: 'unavailable' });
    expect(unavailable.el.textContent).toContain('Unavailable right now.');

    TestBed.resetTestingModule();
    const empty = make({
      data: {
        ...overview(),
        plays_by_day: [],
        downloads_by_day: [],
        revenue_by_day: [],
        revenue_by_license: {},
        top_specs: [],
      },
    });
    expect(empty.el.textContent).toContain('No plays or downloads in this period yet.');
    expect(empty.el.textContent).toContain('No paid sales in this currency yet.');
    expect(empty.el.textContent).toContain('No paid sales in this currency for this period.');
    expect(empty.el.textContent).toContain('Upload beats to see your top performers here.');
    expect(empty.el.textContent).toContain('No plays in this period yet.');
  });

  it('overview variant leads with revenue and has no stream or weekday cards', () => {
    const { el } = make({ variant: 'overview', data: overview(), topSpecs: overview().top_specs });
    expect(el.querySelector('app-bento-stream-chart')).toBeNull();
    expect(el.querySelector('app-bento-weekday-bars')).toBeNull();
    expect(el.querySelector('app-bento-wave.tall')).not.toBeNull();
    expect(el.querySelectorAll('app-bento-stat-tile').length).toBe(4);
    expect(el.querySelectorAll('app-bento-gauge line').length).toBe(56);

    TestBed.resetTestingModule();
    const empty = make({ variant: 'overview', state: 'unavailable' });
    expect(empty.el.textContent).toContain('Unavailable right now.');
  });

  it('analytics variant adds derived figures, a series switch and a table', () => {
    const { el, fixture } = make({
      variant: 'analytics',
      data: overview(),
      topSpecs: overview().top_specs,
    });
    const text = el.textContent ?? '';
    expect(text).toContain('Best day');
    expect(text).toContain('Download rate');
    expect(text).toContain('Revenue per 1k plays');
    expect(el.querySelectorAll('.table .tr').length).toBe(3);
    expect(el.querySelectorAll('app-bento-stream-chart .layers path').length).toBe(2);
    (el.querySelectorAll('[aria-label="Stream series"] button')[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelectorAll('app-bento-stream-chart .layers path').length).toBe(1);

    TestBed.resetTestingModule();
    const empty = make({
      variant: 'analytics',
      data: { ...overview(), plays_by_day: [], downloads_by_day: [], revenue_by_day: [] },
    });
    expect(empty.el.textContent).toContain('—');
    expect(empty.el.textContent).toContain('Your top-performing beats will appear here.');
  });
});
