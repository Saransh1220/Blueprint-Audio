import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  signal,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpecRowComponent } from '../../components/spec-row/spec-row.component';
import { AuthService, LabService, AnalyticsService } from '../../services';
import { PlayerService } from '../../services/player.service';
import { Role } from '../../models';
import type { Spec } from '../../models';
import type { AnalyticsOverviewResponse, TopSpecStat } from '../../core/api/analytics.requests';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, SpecRowComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private labService = inject(LabService);
  private analyticsService = inject(AnalyticsService);
  private playerService = inject(PlayerService);

  readonly Role = Role;

  currentUser = this.authService.currentUser;

  // --- Role view switching ---
  activeRole = signal<'producer' | 'listener'>('producer');

  // --- Sub-nav tab ---
  activeTab = signal<string>('overview');

  // --- Toast ---
  toastMessage = signal<string>('');
  toastVisible = signal<boolean>(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  showToast(msg: string) {
    this.toastMessage.set(msg);
    this.toastVisible.set(true);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible.set(false), 2200);
  }

  // --- Real playback ---
  playSong(event: Event, spec: import('../../models').Spec) {
    event.stopPropagation();
    const currentTrack = this.playerService.currentTrack();
    if (currentTrack?.id === spec.id) {
      this.playerService.togglePlay();
    } else {
      this.playerService.showPlayer(spec);
      this.analyticsService.trackPlay(spec.id).subscribe({
        error: (err) => console.error('Failed to track play:', err),
      });
    }
  }

  isPlaying(spec: import('../../models').Spec): boolean {
    const t = this.playerService.currentTrack();
    return t?.id === spec.id && this.playerService.isPlaying();
  }

  // --- Time-based greeting ---
  private _now = signal<Date>(new Date());

  greeting = computed(() => {
    const h = this._now().getHours();
    if (h < 5) return 'Late night';
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    if (h < 21) return 'Evening';
    return 'Late night';
  });

  dateLine = computed(() => {
    const now = this._now();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hm = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    return `${days[now.getDay()]} · ${hm}`;
  });

  displayName = computed(() => {
    const u = this.currentUser();
    if (!u) return 'Friend';
    return u.display_name || u.name || 'Friend';
  });

  // --- Analytics overview data ---
  analyticsData = signal<AnalyticsOverviewResponse | null>(null);
  analyticsLoading = signal(true);

  stats = computed(() => {
    const data = this.analyticsData();
    if (!data)
      return [
        { label: 'Total Plays', value: '—', delta: 'Loading...', deltaDir: 'flat', accent: 'c1' },
        { label: 'Revenue', value: '—', delta: 'Loading...', deltaDir: 'flat', accent: 'c2' },
        { label: 'Downloads', value: '—', delta: 'Loading...', deltaDir: 'flat', accent: 'c3' },
        { label: 'Favorites', value: '—', delta: 'Loading...', deltaDir: 'flat', accent: 'c4' },
      ];
    return [
      {
        label: 'Total Plays',
        value: data.total_plays.toLocaleString(),
        delta: 'Lifetime',
        deltaDir: 'up',
        accent: 'c1',
      },
      {
        label: 'Revenue',
        value: '₹' + data.total_revenue.toLocaleString(),
        delta: 'Lifetime',
        deltaDir: 'up',
        accent: 'c2',
      },
      {
        label: 'Downloads',
        value: data.total_downloads.toLocaleString(),
        delta: 'Lifetime',
        deltaDir: 'up',
        accent: 'c3',
      },
      {
        label: 'Favorites',
        value: data.total_favorites.toLocaleString(),
        delta: 'Lifetime',
        deltaDir: 'up',
        accent: 'c4',
      },
    ];
  });

  totalRevenue = computed(() => {
    const data = this.analyticsData();
    if (!data) return null;
    return data.total_revenue;
  });

  // Top specs from analytics API (for crate scroll)
  topSpecs = signal<TopSpecStat[]>([]);

  // Producer's own published specs (for drops table)
  producerSpecs = signal<Spec[]>([]);

  listenerStats = signal([
    { label: 'Beats owned', value: '47', delta: '+3 this month', deltaDir: 'up', accent: 'c1' },
    {
      label: 'Total spent',
      value: '$1,324',
      delta: 'avg $28 / beat',
      deltaDir: 'flat',
      accent: 'c2',
    },
    {
      label: 'Listening hours',
      value: '68 hrs',
      delta: 'this month',
      deltaDir: 'up',
      accent: 'c3',
    },
    {
      label: 'In your wishlist',
      value: '12',
      delta: '2 on sale now',
      deltaDir: 'up',
      accent: 'c4',
    },
  ]);

  listenerDrops = signal([
    {
      letter: 'v',
      gradient: 'linear-gradient(135deg,#ff3d5a,#ff6b1a)',
      titleEm: 'Violet',
      titleRest: ' Hour',
      meta: 'prod. Kita Sol · purchased 3 days ago',
      license: 'Premium WAV',
      downloads: '3 downloads',
      rev: '$79.99',
    },
    {
      letter: 'p',
      gradient: 'linear-gradient(135deg,#c9b8ff,#ff3d5a)',
      titleEm: 'Paper',
      titleRest: ' Moon',
      meta: 'prod. Meridian · purchased 2 weeks ago',
      license: 'Basic MP3',
      downloads: '1 download',
      rev: '$24.99',
    },
    {
      letter: 'g',
      gradient: 'linear-gradient(135deg,#c8e84f,#ffc93c)',
      titleEm: 'Ghostwire',
      titleRest: '',
      meta: 'prod. Rufio Ash · purchased 1 month ago',
      license: 'Unlimited Pro',
      downloads: '5 downloads',
      rev: '$199.99',
    },
    {
      letter: 'i',
      gradient: 'linear-gradient(135deg,#2d4cff,#c9b8ff)',
      titleEm: 'Iron',
      titleRest: ' Lullaby',
      meta: 'prod. Rufio Ash · purchased 2 months ago',
      license: 'Premium WAV',
      downloads: '2 downloads',
      rev: '$79.99',
    },
  ]);

  activityItems = signal([
    {
      avatarClass: 'c1',
      letter: 'j',
      producerText: 'left a 5★ review on your latest beat.',
      producerStrong: 'Jamie O.',
      listenerText: 'just dropped a new release.',
      listenerStrong: 'Kita Sol',
      listenerEm: '',
      time: '2m',
      isNew: true,
    },
    {
      avatarClass: 'c3',
      letter: '✦',
      producerText: 'was added to 3 carts.',
      producerStrong: 'Your beat',
      listenerText: 'on your wishlist are on sale.',
      listenerStrong: '2 beats',
      listenerEm: 'on sale',
      time: '14m',
      isNew: true,
    },
    {
      avatarClass: 'c2',
      letter: 'm',
      producerText: 'started following you.',
      producerStrong: 'Meridian',
      listenerText: 'released a new pack.',
      listenerStrong: 'Meridian',
      listenerEm: '',
      time: '1h',
      isNew: false,
    },
    {
      avatarClass: 'c4',
      letter: '$',
      producerText: 'License sold · Premium WAV.',
      producerStrong: '',
      producerEm: '',
      listenerText: 'for your purchase was received.',
      listenerStrong: 'Payment',
      listenerEm: '',
      time: '3h',
      isNew: false,
    },
    {
      avatarClass: 'c5',
      letter: 'r',
      producerText: 'commented on your mix.',
      producerStrong: 'A producer',
      listenerText: 'liked your playlist.',
      listenerStrong: 'Rufio Ash',
      listenerEm: '',
      time: '6h',
      isNew: false,
    },
  ]);

  pulseRows = signal([
    {
      letter: 'g',
      gradient: 'linear-gradient(135deg,#c8e84f,#ffc93c)',
      title: 'Ghostwire',
      meta: 'prod. Rufio Ash · 4,218 plays',
      rank: '#1',
      badgeClass: 'hot',
    },
    {
      letter: 'v',
      gradient: 'linear-gradient(135deg,#ff3d5a,#ff6b1a)',
      title: 'Violet Hour',
      meta: 'prod. Kita Sol · 3,891 plays',
      rank: '#2',
      badgeClass: '',
    },
    {
      letter: 'm',
      gradient: 'linear-gradient(135deg,#2d4cff,#c9b8ff)',
      title: 'Mint Smoke',
      meta: 'prod. Meridian · 2,674 plays',
      rank: '#3',
      badgeClass: '',
    },
  ]);

  // Colour palette cycling for generated cards
  private readonly gradients = [
    'linear-gradient(135deg,#ff3d5a,#ff6b1a)',
    'linear-gradient(135deg,#2d4cff,#c9b8ff)',
    'linear-gradient(135deg,#c8e84f,#ffc93c)',
    'linear-gradient(135deg,#c9b8ff,#ff3d5a)',
    'linear-gradient(135deg,#ffc93c,#ff3d5a)',
    'linear-gradient(135deg,#3a3630,#2d4cff)',
  ];
  private readonly colorClasses = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

  constructor() {
    setInterval(() => this._now.set(new Date()), 60_000);

    effect(() => {
      const user = this.currentUser();
      if (user?.role === Role.PRODUCER) {
        this.activeRole.set('producer');
        this.loadAnalytics();
      } else {
        this.activeRole.set('listener');
      }
    });

    this.labService.refresh$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.loadProducerSpecs();
    });
  }

  ngOnInit() {}

  setRole(role: 'producer' | 'listener') {
    this.activeRole.set(role);
    this.showToast(role === 'producer' ? 'Switched to producer view' : 'Switched to listener view');
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  loadAnalytics() {
    this.analyticsLoading.set(true);
    this.analyticsService.getOverview(30, 'plays').subscribe({
      next: (data) => {
        this.analyticsData.set(data);
        // Use top_specs from overview response for the crate scroll
        if (data.top_specs?.length) {
          this.topSpecs.set(data.top_specs);
        }
        this.analyticsLoading.set(false);
      },
      error: () => {
        this.analyticsLoading.set(false);
      },
    });

    this.loadProducerSpecs();
  }

  loadProducerSpecs() {
    // Load currently logged-in producer's specs — limit to 8 for dashboard
    this.labService.getSpecs({ category: 'beat', per_page: 8, sort: 'newest' }).subscribe({
      next: (specs) => this.producerSpecs.set(specs),
      error: () => {},
    });
  }

  // Helpers to derive card display data from real specs
  specToCard(spec: Spec, index: number) {
    return {
      letter: spec.title.charAt(0).toLowerCase(),
      colorClass: this.colorClasses[index % this.colorClasses.length],
      title: spec.title,
      prod: spec.producerName ? `prod. ${spec.producerName}` : '',
      bpm: spec.bpm ? `${spec.bpm} BPM` : '',
      key: spec.key || '',
      price: spec.price != null ? `₹${spec.price.toLocaleString()}` : '',
    };
  }

  topSpecToCard(spec: TopSpecStat, index: number) {
    return {
      letter: spec.title.charAt(0).toLowerCase(),
      colorClass: this.colorClasses[index % this.colorClasses.length],
      title: spec.title,
      prod: '',
      plays: spec.plays?.toLocaleString() || '—',
      rev: spec.revenue != null ? `₹${spec.revenue.toLocaleString()}` : '—',
    };
  }

  producerSpecToDropRow(spec: Spec, index: number) {
    return {
      letter: spec.title.charAt(0).toLowerCase(),
      gradient: this.gradients[index % this.gradients.length],
      titleEm: spec.title.split(' ')[0],
      titleRest: spec.title.includes(' ') ? ' ' + spec.title.split(' ').slice(1).join(' ') : '',
      meta: [spec.bpm ? `${spec.bpm} BPM` : '', spec.key || '', spec.genres?.[0]?.name || '']
        .filter(Boolean)
        .join(' · '),
      plays: spec.analytics?.playCount?.toLocaleString() || '—',
      downloads: spec.analytics?.totalDownloadCount?.toLocaleString() || '—',
      rev: spec.price != null ? `₹${spec.price.toLocaleString()}` : '—',
      status:
        spec.processingStatus === 'completed'
          ? 'live'
          : spec.processingStatus === 'pending'
            ? 'draft'
            : 'review',
    };
  }
}
