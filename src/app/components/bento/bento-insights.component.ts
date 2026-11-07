import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { AnalyticsOverviewResponse, TopSpecStat } from '../../core/api/analytics.requests';
import type { AppCurrency } from '../../models/money';
import { CurrencyService } from '../../services/currency.service';
import { bucketSum, formatPercent, peakIndex, weekdayTotals } from '../../utils/bento-chart';
import { buildInsightSeries, shortDateLabel } from '../../utils/bento-insights';
import { BentoCardComponent } from './bento-card.component';
import { BentoGaugeComponent, type BentoShare } from './bento-gauge.component';
import { type BentoRankRow, BentoRankListComponent } from './bento-rank-list.component';
import { BentoStatTileComponent } from './bento-stat-tile.component';
import { BentoStreamChartComponent } from './bento-stream-chart.component';
import { BentoWaveComponent } from './bento-wave.component';
import { BentoWeekdayBarsComponent } from './bento-weekday-bars.component';

const SHARE_COLORS = ['#ffffff', '#a9b2ff', '#ffb37a', '#e8ff1f', '#7fe0b0'];

/**
 * The three analytics rows of the bento layout, drawn from one overview response:
 * activity stream + license gauge, four KPI tiles, revenue wave + top beats + weekday capsules.
 * Renders cards directly into the surrounding `app-bento-page` grid (`display: contents`).
 * Everything comes from the response; with no data every card shows an honest empty state.
 */
@Component({
  selector: 'app-bento-insights',
  imports: [
    BentoCardComponent,
    BentoGaugeComponent,
    BentoRankListComponent,
    BentoStatTileComponent,
    BentoStreamChartComponent,
    BentoWaveComponent,
    BentoWeekdayBarsComponent,
  ],
  templateUrl: './bento-insights.component.html',
  styleUrl: './bento-insights.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoInsightsComponent {
  private readonly currencyService = inject(CurrencyService);

  readonly data = input<AnalyticsOverviewResponse | null>(null);
  readonly state = input<'loading' | 'ready' | 'unavailable'>('ready');
  readonly currency = input.required<AppCurrency>();
  /** Human period, e.g. "Last 30 days". */
  readonly periodLabel = input('');
  /** Calendar window for gap-filled series and previous-period deltas (dashboard); omit for studio. */
  readonly windowDays = input<number | null>(null);
  readonly topSpecs = input<TopSpecStat[]>([]);
  readonly artwork = input<Record<string, string>>({});
  readonly rankBy = input<'plays' | 'revenue' | 'downloads'>('plays');
  readonly rankHint = input('By plays');
  readonly gaugeHint = input('');
  readonly tilesLink = input('');
  /** Changes whenever the charts should replay their entrance (period or currency change). */
  readonly animateKey = input('');

  protected readonly series = computed(() =>
    buildInsightSeries(this.state() === 'ready' ? this.data() : null, {
      windowDays: this.windowDays() ?? undefined,
    }),
  );

  protected readonly labels = computed(() => this.series().dates.map(shortDateLabel));

  protected readonly money = (value: number) =>
    this.currencyService.formatMoney(null, value, this.currency());
  protected readonly count = (value: number) => Math.round(value).toLocaleString('en-US');

  private readonly compact = (value: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

  protected readonly stream = computed(() => [
    { label: 'Plays', color: 'var(--bento-s1, #fff)', values: this.series().plays },
    { label: 'Downloads', color: 'var(--bento-s2, #a9b2ff)', values: this.series().downloads },
  ]);

  protected readonly headline = computed(() => this.count(this.series().totals.plays));
  protected readonly headlineChip = computed(() => formatPercent(this.series().change.plays));

  protected readonly revenueTotal = computed(() => this.money(this.series().totals.revenue));
  protected readonly hasRevenue = computed(() => this.series().revenue.some((v) => v > 0));

  protected readonly weekdays = computed(() => {
    const rows = this.series().dates.map((date, i) => ({ date, count: this.series().plays[i] }));
    return weekdayTotals(rows);
  });
  protected readonly weekdayPeak = computed(() => peakIndex(this.weekdays()));

  protected readonly shares = computed<BentoShare[]>(() => {
    if (this.state() !== 'ready') return [];
    const entries = Object.entries(this.data()?.revenue_by_license ?? {})
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return entries.map(([label, value], i) => ({
      label,
      share: Math.round((value / total) * 100),
      amount: this.money(value),
      color: SHARE_COLORS[i % SHARE_COLORS.length],
    }));
  });

  protected readonly tiles = computed(() => {
    const s = this.series();
    const hint = s.comparedWith;
    const tile = (
      label: string,
      icon: string,
      value: string,
      values: number[],
      change: number | null,
      accent = false,
    ) => ({
      label,
      icon,
      value,
      accent,
      spark: bucketSum(values, 14),
      delta: formatPercent(change),
      up: change === null ? null : change >= 0,
      hint: change === null ? this.periodLabel() : hint,
    });
    return [
      tile(
        'Revenue',
        'fa-solid fa-sack-dollar',
        this.money(s.totals.revenue),
        s.revenue,
        s.change.revenue,
        true,
      ),
      tile('Plays', 'fa-solid fa-play', this.count(s.totals.plays), s.plays, s.change.plays),
      tile(
        'Downloads',
        'fa-solid fa-download',
        this.count(s.totals.downloads),
        s.downloads,
        s.change.downloads,
      ),
      {
        label: 'Favorites',
        icon: 'fa-solid fa-heart',
        value: this.count(this.data()?.total_favorites ?? 0),
        accent: false,
        spark: [] as number[],
        delta: '',
        up: null,
        hint: 'All time',
      },
    ];
  });

  protected readonly ranked = computed<BentoRankRow[]>(() => {
    if (this.state() !== 'ready') return [];
    const by = this.rankBy();
    const specs = this.topSpecs();
    const max = Math.max(...specs.map((s) => s[by] ?? 0), 0) || 1;
    const art = this.artwork();
    return specs.map((spec) => {
      const value = spec[by] ?? 0;
      return {
        id: spec.spec_id,
        title: spec.title,
        value: by === 'revenue' ? this.money(value) : this.count(value),
        meta:
          by === 'plays'
            ? `${this.compact(spec.downloads ?? 0)} downloads`
            : `${this.compact(spec.plays ?? 0)} plays`,
        percent: Math.max(4, (value / max) * 100),
        imageUrl: art[spec.spec_id] || art[(spec.title || '').toLowerCase()] || null,
        link: ['/', spec.spec_id],
      };
    });
  });

  protected readonly emptyText = computed(() =>
    this.state() === 'loading' ? 'Loading…' : 'Unavailable right now.',
  );
}
