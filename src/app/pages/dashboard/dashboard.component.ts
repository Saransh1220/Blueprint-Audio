import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AnalyticsOverviewResponse } from '../../core/api/analytics.requests';
import type { ProducerOrderDto } from '../../core/api/payment.requests';
import { Role } from '../../models';
import { type AppCurrency, minorToMajor } from '../../models/money';
import type { License } from '../../models/payment';
import {
  AnalyticsService,
  AuthService,
  NotificationService,
  PaymentService,
} from '../../services';
import { CurrencyService } from '../../services/currency.service';

type RoleView = 'producer' | 'listener';
type Range = '7D' | '30D' | '90D';
type Tone = 'ok' | 'warn' | 'bad' | 'info';
type Variant = 'pop' | 'soft' | 'ink';

interface Highlight {
  label: string;
  value: string;
  note: string;
  cta: string;
  link: string;
}

interface Kpi {
  tone: 'lav' | 'cobalt' | 'tang' | 'ink';
  label: string;
  value: string;
  delta: string;
  up: boolean | null;
  note: string;
  spark: number[];
  link: string;
}

interface Series {
  total: string;
  delta: string;
  up: boolean | null;
  values: number[];
  dates: string[];
}

interface Split {
  label: string;
  amount: string;
  pct: number;
}

interface AttentionItem {
  id: string;
  title: string;
  text: string;
  cta: string;
  link: string | null;
  tone: Tone;
}

interface BeatRow {
  id: string;
  title: string;
  meta: string;
  plays: string;
  downloads: string;
  revenue: string;
  color: string;
}

interface PurchaseRow {
  title: string;
  meta: string;
  price: string;
  color: string;
}

interface ActivityItem {
  strong: string;
  text: string;
  time: string;
  tone: Tone;
}

interface Metric {
  label: string;
  value: string;
}

interface Goal {
  title: string;
  current: string;
  target: string;
  pct: number;
  note: string;
}

interface Bar {
  label: string;
  pct: number;
}

interface Battle {
  tag: string;
  title: string;
  note: string;
  cta: string;
  link: string;
}

interface OrderRow {
  name: string;
  note: string;
  badge: string;
  time: string;
  color: string;
}

interface QuickLink {
  label: string;
  hint: string;
  link: string;
}

const DAYS: Record<Range, number> = { '7D': 7, '30D': 30, '90D': 90 };
const MAX_BARS = 45;
const PALETTE = ['#1f8f55', '#6c4de6', '#2d4cff', '#b57700', '#d3213f', '#0f7c8a'];

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private analyticsService = inject(AnalyticsService);
  private paymentService = inject(PaymentService);
  private notificationService = inject(NotificationService);
  private currencyService = inject(CurrencyService);

  currentUser = this.authService.currentUser;

  role = signal<RoleView>(
    this.authService.currentUser()?.role === Role.PRODUCER ? 'producer' : 'listener',
  );
  range = signal<Range>('30D');
  readonly ranges: Range[] = ['7D', '30D', '90D'];

  readonly variants: { id: Variant; label: string }[] = [
    { id: 'pop', label: 'Pop' },
    { id: 'soft', label: 'Soft' },
    { id: 'ink', label: 'Ink' },
  ];
  variant = signal<Variant>(this.readVariant());

  private now = new Date();

  greeting = computed(() => {
    const h = this.now.getHours();
    if (h < 5) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  });

  dateLine = this.now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  displayName = computed(() => {
    const u = this.currentUser();
    const full = u?.display_name || u?.name || '';
    return full.split(' ')[0] || 'there';
  });

  // ── Remote data ──────────────────────────────────────
  private overviewCache = new Map<Range, AnalyticsOverviewResponse>();
  private ordersRequested = false;
  private licensesRequested = false;

  overview = signal<AnalyticsOverviewResponse | null>(null);
  orders = signal<ProducerOrderDto[]>([]);
  licenses = signal<License[]>([]);
  licenseTotal = signal<number | null>(null);

  private producerLoading = signal(true);
  private listenerLoading = signal(true);
  loading = computed(() =>
    this.role() === 'producer' ? this.producerLoading() : this.listenerLoading(),
  );

  private notes = this.notificationService.notifications;

  constructor() {
    effect(() => {
      const role = this.role();
      const range = this.range();
      untracked(() => {
        if (role === 'producer') {
          this.loadOverview(range);
          this.loadOrders();
        } else {
          this.loadLicenses();
        }
      });
    });
  }

  private loadOverview(range: Range) {
    const cached = this.overviewCache.get(range);
    if (cached) {
      this.overview.set(cached);
      return;
    }
    this.producerLoading.set(true);
    // Ask for two windows so we can compare against the previous period
    this.analyticsService.getOverview(DAYS[range] * 2, 'revenue').subscribe({
      next: (data) => {
        this.overviewCache.set(range, data);
        if (this.range() === range) this.overview.set(data);
        this.producerLoading.set(false);
      },
      error: () => {
        if (this.range() === range) this.overview.set(null);
        this.producerLoading.set(false);
      },
    });
  }

  private loadOrders() {
    if (this.ordersRequested) return;
    this.ordersRequested = true;
    this.paymentService.getProducerOrders(1, 20).subscribe({
      next: (res) => this.orders.set(res?.orders ?? []),
      error: () => this.orders.set([]),
    });
  }

  private loadLicenses() {
    if (this.licensesRequested) return;
    this.licensesRequested = true;
    this.listenerLoading.set(true);
    this.paymentService.fetchUserLicenses(1, 50).subscribe({
      next: (rows) => {
        this.licenses.set(rows);
        this.licenseTotal.set(this.paymentService.licensePagination()?.total ?? rows.length);
        this.listenerLoading.set(false);
      },
      error: () => {
        this.licenses.set([]);
        this.listenerLoading.set(false);
      },
    });
  }

  // ── Money helpers ────────────────────────────────────
  currency = computed<AppCurrency>(() => {
    if (this.role() === 'producer') {
      return this.currencyService.normalizeCurrency(this.orders()[0]?.currency);
    }
    return this.currencyService.normalizeCurrency(this.licenses()[0]?.currency);
  });

  private money(amount: number): string {
    return this.currencyService.formatMoney(null, amount, this.currency());
  }

  private compactMoney(amount: number): string {
    const currency = this.currency();
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }

  private compact(n: number): string {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
      n,
    );
  }

  private change(cur: number, prev: number): { text: string; up: boolean | null } {
    if (prev <= 0) return { text: '—', up: null };
    const pct = ((cur - prev) / prev) * 100;
    return { text: `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`, up: pct >= 0 };
  }

  private windows<T extends { date: string }>(rows: T[] | undefined, days: number) {
    const sorted = [...(rows ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    return { cur: sorted.slice(-days), prev: sorted.slice(-days * 2, -days) };
  }

  private sum(values: number[]): number {
    return values.reduce((total, v) => total + v, 0);
  }

  private downsample(values: number[], max: number): number[] {
    if (values.length <= max) return values;
    const size = Math.ceil(values.length / max);
    const out: number[] = [];
    for (let i = 0; i < values.length; i += size) out.push(this.sum(values.slice(i, i + size)));
    return out;
  }

  private sparkOf(values: number[]): number[] {
    const out = this.downsample(values, 10);
    return out.length > 1 ? out : [0, 0];
  }

  timeAgo(value: string | Date | undefined): string {
    if (!value) return '';
    const diff = Date.now() - new Date(value).getTime();
    const mins = Math.max(Math.round(diff / 60000), 0);
    if (mins < 60) return `${Math.max(mins, 1)}m`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return days < 30 ? `${days}d` : `${Math.round(days / 30)}mo`;
  }

  // ── Primary chart ────────────────────────────────────
  private licenseDays(range: Range) {
    const days = DAYS[range];
    const key = (d: Date) => d.toISOString().slice(0, 10);
    const perDay = new Map<string, number>();
    const currency = this.currency();
    for (const lic of this.licenses()) {
      const day = (lic.issued_at ?? lic.created_at ?? '').slice(0, 10);
      perDay.set(day, (perDay.get(day) ?? 0) + minorToMajor(lic.purchase_price, currency));
    }
    const row = (offset: number) => {
      const d = new Date(this.now);
      d.setDate(d.getDate() - offset);
      return { date: key(d), value: perDay.get(key(d)) ?? 0 };
    };
    return {
      cur: Array.from({ length: days }, (_, i) => row(days - 1 - i)),
      prev: Array.from({ length: days }, (_, i) => row(days * 2 - 1 - i)),
    };
  }

  series = computed<Series>(() => {
    const range = this.range();
    const days = DAYS[range];

    if (this.role() === 'producer') {
      const { cur, prev } = this.windows(this.overview()?.revenue_by_day, days);
      const curSum = this.sum(cur.map((r) => r.revenue));
      const diff = this.change(curSum, this.sum(prev.map((r) => r.revenue)));
      return {
        total: this.money(curSum),
        delta: diff.text,
        up: diff.up,
        values: cur.map((r) => r.revenue),
        dates: cur.map((r) => r.date),
      };
    }

    const { cur, prev } = this.licenseDays(range);
    const curSum = this.sum(cur.map((r) => r.value));
    const diff = this.change(curSum, this.sum(prev.map((r) => r.value)));
    return {
      total: this.money(curSum),
      delta: diff.text,
      up: diff.up,
      values: cur.map((r) => r.value),
      dates: cur.map((r) => r.date),
    };
  });

  chartTitle = computed(() => (this.role() === 'producer' ? 'Revenue' : 'Spending'));

  private chartValues = computed(() => this.downsample(this.series().values, MAX_BARS));

  private niceMax = computed(() => {
    const max = Math.max(0, ...this.chartValues());
    if (max <= 0) return 100;
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const step = magnitude / 2;
    return Math.ceil(max / step) * step;
  });

  yTicks = computed(() => {
    const m = this.niceMax();
    return [m, m / 2, 0].map((v) => this.compactMoney(v));
  });

  xTicks = computed(() => {
    const dates = this.series().dates;
    const fmt = (iso: string | undefined) =>
      iso
        ? new Date(`${iso}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })
        : '';
    return [fmt(dates[0]), fmt(dates[Math.floor(dates.length / 2)]), 'Today'];
  });

  bars = computed(() => {
    const values = this.chartValues();
    const max = this.niceMax();
    return values.map((v, i) => ({
      height: v > 0 ? Math.max((v / max) * 100, 3) : 0,
      value: this.money(v),
      latest: i === values.length - 1,
    }));
  });

  // ── Today strip ──────────────────────────────────────
  private listenerToday: Metric[] = [
    { label: 'Listened today', value: '2.1h' },
    { label: 'Downloads', value: '1' },
    { label: 'Saved', value: '3' },
  ];

  today = computed<Metric[]>(() => {
    if (this.role() !== 'producer') return this.listenerToday;
    const todayKey = this.now.toISOString().slice(0, 10);
    const todays = this.orders().filter((o) => o.created_at?.slice(0, 10) === todayKey);
    const plays = this.overview()?.plays_by_day?.find((d) => d.date === todayKey)?.count ?? 0;
    return [
      { label: 'Earned today', value: this.money(this.sum(todays.map((o) => o.amount))) },
      { label: 'Sales', value: String(todays.length) },
      { label: 'Plays', value: this.compact(plays) },
    ];
  });

  // ── KPI tiles ────────────────────────────────────────
  kpis = computed<Kpi[]>(() => {
    const range = this.range();
    const days = DAYS[range];

    if (this.role() === 'producer') {
      const o = this.overview();
      const plays = this.windows(o?.plays_by_day, days);
      const downloads = this.windows(o?.downloads_by_day, days);
      const playsCur = this.sum(plays.cur.map((r) => r.count));
      const dlCur = this.sum(downloads.cur.map((r) => r.count));
      const playsDiff = this.change(playsCur, this.sum(plays.prev.map((r) => r.count)));
      const dlDiff = this.change(dlCur, this.sum(downloads.prev.map((r) => r.count)));

      return [
        {
          tone: 'lav',
          label: 'Plays',
          value: this.compact(playsCur),
          delta: playsDiff.text,
          up: playsDiff.up,
          note: `vs previous ${range}`,
          spark: this.sparkOf(plays.cur.map((r) => r.count)),
          link: '/studio/analytics',
        },
        {
          tone: 'cobalt',
          label: 'Downloads',
          value: this.compact(dlCur),
          delta: dlDiff.text,
          up: dlDiff.up,
          note: `vs previous ${range}`,
          spark: this.sparkOf(downloads.cur.map((r) => r.count)),
          link: '/studio/analytics',
        },
        // Followers has no data source yet
        {
          tone: 'tang',
          label: 'Followers',
          value: '2,106',
          delta: '+54',
          up: true,
          note: 'this week',
          spark: [3, 4, 3, 5, 5, 6, 6, 8, 7, 9],
          link: '/studio/profile',
        },
        {
          tone: 'ink',
          label: 'Favorites',
          value: this.compact(o?.total_favorites ?? 0),
          delta: 'All time',
          up: null,
          note: 'across your beats',
          spark: this.sparkOf(plays.cur.map((r) => r.count)),
          link: '/studio/analytics',
        },
      ];
    }

    const licenses = this.licenses();
    const monthAgo = Date.now() - 30 * 86400000;
    const recent = licenses.filter(
      (l) => new Date(l.issued_at ?? l.created_at).getTime() >= monthAgo,
    ).length;
    const totalDownloads = this.sum(licenses.map((l) => l.downloads_count ?? 0));

    return [
      {
        tone: 'lav',
        label: 'Library',
        value: String(this.licenseTotal() ?? licenses.length),
        delta: `+${recent}`,
        up: recent > 0 ? true : null,
        note: 'this month',
        spark: this.sparkOf(this.licenseDays('90D').cur.map((r) => r.value)),
        link: '/studio/purchases',
      },
      // Wishlist has no data source yet
      {
        tone: 'cobalt',
        label: 'Wishlist',
        value: '12',
        delta: '2 on sale',
        up: true,
        note: 'saved beats',
        spark: [3, 4, 4, 5, 5, 5, 6, 6, 7, 7],
        link: '/explore',
      },
      {
        tone: 'tang',
        label: 'Downloads',
        value: String(totalDownloads),
        delta: `${licenses.length} licenses`,
        up: null,
        note: 'across your library',
        spark: this.sparkOf(this.licenseDays('30D').cur.map((r) => r.value)),
        link: '/studio/purchases',
      },
      // Following has no data source yet
      {
        tone: 'ink',
        label: 'Following',
        value: '9',
        delta: '+1',
        up: true,
        note: 'producers',
        spark: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
        link: '/explore',
      },
    ];
  });

  // ── Payout + goal (no data source yet) ───────────────
  readonly producerHighlight: Highlight = {
    label: 'Ready to withdraw',
    value: '$1,240',
    note: 'Next automatic payout on Friday.',
    cta: 'Withdraw',
    link: '/studio/earnings',
  };

  readonly listenerHighlight: Highlight = {
    label: 'On sale now',
    value: '2 beats',
    note: 'Wishlist beats just dropped in price.',
    cta: 'See offers',
    link: '/explore',
  };

  readonly producerGoal: Goal = {
    title: 'Monthly goal',
    current: '$4,820',
    target: '$6,000',
    pct: 80,
    note: '$1,180 to go · 7 days left',
  };

  readonly listenerGoal: Goal = {
    title: 'Listening goal',
    current: '68 hrs',
    target: '80 hrs',
    pct: 85,
    note: '12 hrs to go · 7 days left',
  };

  // ── Needs attention + activity (notifications) ───────
  attention = computed<AttentionItem[]>(() =>
    this.notes()
      .filter((n) => !n.is_read)
      .slice(0, 3)
      .map((n) => {
        const processing = n.type === 'processing_complete' || n.type === 'processing_failed';
        return {
          id: n.id,
          title: n.title,
          text: n.message,
          cta: processing ? 'View tracks' : 'Dismiss',
          link: processing ? '/studio/tracks' : null,
          tone: this.toneOf(n.type),
        };
      }),
  );

  activity = computed<ActivityItem[]>(() =>
    this.notes()
      .slice(0, 6)
      .map((n) => ({
        strong: n.title,
        text: n.message,
        time: this.timeAgo(n.created_at),
        tone: this.toneOf(n.type),
      })),
  );

  private toneOf(type: string): Tone {
    if (type === 'processing_failed' || type === 'error') return 'bad';
    if (type === 'processing_complete' || type === 'success') return 'ok';
    return 'info';
  }

  markRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  // ── Performance ──────────────────────────────────────
  beats = computed<BeatRow[]>(() =>
    (this.overview()?.top_specs ?? []).slice(0, 5).map((s, i) => ({
      id: s.spec_id,
      title: s.title,
      meta: `${this.compact(s.plays ?? 0)} plays · ${this.compact(s.downloads ?? 0)} downloads`,
      plays: this.compact(s.plays ?? 0),
      downloads: this.compact(s.downloads ?? 0),
      revenue: this.money(s.revenue ?? 0),
      color: PALETTE[i % PALETTE.length],
    })),
  );

  purchases = computed<PurchaseRow[]>(() =>
    this.licenses()
      .slice(0, 5)
      .map((l, i) => ({
        title: l.spec_title || 'Untitled beat',
        meta: `${l.license_type} · ${this.timeAgo(l.issued_at ?? l.created_at)} ago`,
        price: this.currencyService.formatMinorMoney(l.purchase_price, l.currency),
        color: PALETTE[i % PALETTE.length],
      })),
  );

  splitTitle = computed(() =>
    this.role() === 'producer' ? 'Revenue by license' : 'Spend by license',
  );

  split = computed<Split[]>(() => {
    let entries: [string, number][];
    if (this.role() === 'producer') {
      entries = Object.entries(this.overview()?.revenue_by_license ?? {});
    } else {
      const totals = new Map<string, number>();
      const currency = this.currency();
      for (const l of this.licenses()) {
        totals.set(
          l.license_type,
          (totals.get(l.license_type) ?? 0) + minorToMajor(l.purchase_price, currency),
        );
      }
      entries = [...totals.entries()];
    }
    const sorted = entries.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = this.sum(sorted.map(([, v]) => v)) || 1;
    return sorted.map(([label, value]) => ({
      label,
      amount: this.money(value),
      pct: Math.round((value / total) * 100),
    }));
  });

  // ── Audience / taste (no data source yet) ────────────
  readonly producerAudienceTitle = 'Top countries';
  readonly listenerAudienceTitle = 'Your top genres';

  readonly producerAudience: Bar[] = [
    { label: 'United States', pct: 38 },
    { label: 'India', pct: 21 },
    { label: 'United Kingdom', pct: 12 },
    { label: 'Germany', pct: 8 },
    { label: 'Brazil', pct: 6 },
  ];

  readonly listenerAudience: Bar[] = [
    { label: 'Trap', pct: 34 },
    { label: 'R&B', pct: 26 },
    { label: 'Lo-fi', pct: 18 },
    { label: 'House', pct: 12 },
    { label: 'Drill', pct: 10 },
  ];

  // ── Battle (no data source yet) ──────────────────────
  readonly producerBattle: Battle = {
    tag: 'Beat Battle #14',
    title: 'Midnight Heat',
    note: 'Closes in 2d 4h · 128 entries',
    cta: 'Enter battle',
    link: '/battles',
  };

  readonly listenerBattle: Battle = {
    tag: 'Beat Battle #14',
    title: 'Midnight Heat',
    note: 'Closes in 2d 4h · vote for your favorite',
    cta: 'Vote now',
    link: '/battles',
  };

  // ── Orders / following ───────────────────────────────
  readonly ordersTitle = 'Recent orders';
  readonly followingTitle = 'Following';

  private readonly following: OrderRow[] = [
    { name: 'Kita Sol', note: 'Violet Hour II', badge: 'New', time: '2m', color: '#6c4de6' },
    { name: 'Meridian', note: 'Lo-fi pack · 12 beats', badge: 'New', time: '1h', color: '#b57700' },
    { name: 'Rufio Ash', note: 'Ghostwire VIP', badge: 'Beat', time: '1d', color: '#1f8f55' },
    { name: 'Nova Keys', note: 'Midnight Run', badge: 'Beat', time: '2d', color: '#d3213f' },
  ];

  peopleRows = computed<OrderRow[]>(() => {
    if (this.role() !== 'producer') return this.following;
    return this.orders()
      .slice(0, 5)
      .map((o, i) => {
        const currency = this.currencyService.normalizeCurrency(o.currency);
        return {
          name: o.buyer_name || o.buyer_email || 'Customer',
          note: `${o.spec_title} · ${o.license_type}`,
          badge: this.currencyService.formatMoney(null, o.amount, currency),
          time: this.timeAgo(o.created_at),
          color: PALETTE[i % PALETTE.length],
        };
      });
  });

  // ── Shortcuts ────────────────────────────────────────
  readonly producerLinks: QuickLink[] = [
    { label: 'Upload a beat', hint: 'Publish new work', link: '/upload' },
    { label: 'Analytics', hint: 'Plays, sales, audience', link: '/studio/analytics' },
    { label: 'Orders', hint: 'Buyers and licenses', link: '/studio/orders' },
    { label: 'Public profile', hint: 'How buyers see you', link: '/studio/profile' },
  ];

  readonly listenerLinks: QuickLink[] = [
    { label: 'Explore beats', hint: 'Browse the catalog', link: '/explore' },
    { label: 'Your library', hint: 'Purchases and downloads', link: '/studio/purchases' },
    { label: 'Beat battles', hint: 'Vote and compete', link: '/battles' },
    { label: 'Cart', hint: 'Finish checkout', link: '/cart' },
  ];

  // ── Actions ──────────────────────────────────────────
  setRole(role: RoleView) {
    this.role.set(role);
  }

  setRange(range: Range) {
    this.range.set(range);
  }

  setVariant(variant: Variant) {
    this.variant.set(variant);
    try {
      localStorage.setItem('dashboard-variant', variant);
    } catch {
      // storage unavailable (private mode) — keep the choice for this visit only
    }
  }

  private readVariant(): Variant {
    try {
      const saved = localStorage.getItem('dashboard-variant');
      if (saved === 'soft' || saved === 'ink' || saved === 'pop') return saved;
    } catch {
      // ignore
    }
    return 'pop';
  }

  initial(title: string) {
    return title.charAt(0).toUpperCase();
  }

  /** Sparkline polyline points in a 100×28 box */
  sparkPoints(values: number[]): string {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    const step = 100 / (values.length - 1);
    return values
      .map((v, i) => `${(i * step).toFixed(1)},${(26 - ((v - min) / span) * 24).toFixed(1)}`)
      .join(' ');
  }
}
