import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, filter, map, switchMap, tap } from 'rxjs';
import { SpecAdapter } from '../../adapters/spec.adapter';
import { SpecCardComponent } from '../../components/spec-card/spec-card';
import type { PublicUserResponse } from '../../core/api/user.requests';
import type { Spec } from '../../models';
import { BuyerCurrencyService } from '../../services/buyer-currency.service';
import { CurrencyService } from '../../services/currency.service';
import { SpecService } from '../../services/spec.service';
import { SpecActionService } from '../../services/spec-action.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { producerLink } from '../../utils/producer-link';

@Component({
  selector: 'app-producer-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, SpecCardComponent],
  templateUrl: './producer-profile.component.html',
  styleUrls: ['./producer-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProducerProfileComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private specService = inject(SpecService);
  private adapter = inject(SpecAdapter);
  private actions = inject(SpecActionService);
  private currency = inject(CurrencyService);
  readonly buyerCurrency = inject(BuyerCurrencyService);
  private document = inject(DOCUMENT);
  private router = inject(Router);
  private titleService = inject(Title);
  private toast = inject(ToastService);

  profile = signal<PublicUserResponse | null>(null);
  specs = signal<Spec[]>([]);
  loading = signal(true);
  error = signal(false);
  activeGenre = signal('All');
  totalSpecs = signal(0);
  currentPage = signal(1);
  loadingMore = signal(false);
  private rewritingUrl = false;
  loadMore() {
    const profile = this.profile();
    if (!profile || this.loadingMore() || this.specs().length >= this.totalSpecs()) return;
    this.loadingMore.set(true);
    this.specService.getUserSpecs(profile.id, this.currentPage() + 1, 20).subscribe({
      next: (catalog) => {
        this.specs.update((items) => [
          ...items,
          ...catalog.data.map((dto) => this.adapter.adapt(dto)),
        ]);
        this.totalSpecs.set(catalog.metadata.total);
        this.currentPage.update((page) => page + 1);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  genres = computed(() => [
    'All',
    ...new Set(this.specs().flatMap((spec) => spec.genres.map((g) => g.name))),
  ]);
  filteredSpecs = computed(() => {
    const genre = this.activeGenre();
    return genre === 'All'
      ? this.specs()
      : this.specs().filter((s) => s.genres.some((g) => g.name === genre));
  });
  displayName = computed(() => this.profile()?.display_name || this.profile()?.name || 'Producer');
  initials = computed(() => this.displayName().slice(0, 1).toUpperCase());
  /** Public, unique handle (falls back to the legacy login name on older backends). */
  handle = computed(() => this.profile()?.handle || this.profile()?.name || 'producer');
  isProducer = computed(() => this.profile()?.role === 'producer');
  joined = computed(() => {
    const created = this.profile()?.created_at;
    if (!created) return '';
    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(
      new Date(created),
    );
  });
  hasLinks = computed(() => {
    const p = this.profile();
    return !!(p?.instagram_url || p?.twitter_url || p?.youtube_url || p?.spotify_url);
  });
  totalPlays = computed(() =>
    this.specs().reduce((sum, spec) => sum + (spec.analytics?.playCount ?? 0), 0),
  );
  totalFavorites = computed(() =>
    this.specs().reduce((sum, spec) => sum + (spec.analytics?.favoriteCount ?? 0), 0),
  );

  constructor() {
    this.document.body.classList.add('producer-profile-active');

    this.route.paramMap
      .pipe(
        // The canonical-URL rewrite re-emits the same profile; don't load it twice.
        filter(() => {
          if (!this.rewritingUrl) return true;
          this.rewritingUrl = false;
          return false;
        }),
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
          this.specs.set([]);
          this.activeGenre.set('All');
        }),
        switchMap((params) =>
          (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(params.get('handle') || '')
            ? this.userService.getPublicProfile(params.get('handle')!)
            : this.userService.getProducerByHandle(params.get('handle') || '')
          ).pipe(
            tap((profile) => {
              this.profile.set(profile);
              this.titleService.setTitle(`${profile.display_name || profile.name} · Waveyard`);
              this.canonicalize(params.get('handle') || '', profile);
            }),
            switchMap((profile) => this.specService.getUserSpecs(profile.id, 1, 20)),
            catchError(() => {
              this.error.set(true);
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((catalog) => {
        this.specs.set(catalog.data.map((spec) => this.adapter.adapt(spec)));
        this.totalSpecs.set(catalog.metadata.total);
        this.currentPage.set(1);
        this.loading.set(false);
      });
  }

  ngOnDestroy() {
    this.document.body.classList.remove('producer-profile-active');
    this.titleService.setTitle('Waveyard');
  }

  compact(value: number) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
      value,
    );
  }
  async shareProfile() {
    const url = `${this.document.location.origin}${this.router.serializeUrl(
      this.router.createUrlTree(producerLink(this.handle())),
    )}`;
    try {
      await navigator.clipboard.writeText(url);
      this.toast.show('Profile link copied', 'success');
    } catch {
      this.toast.show(url, 'info', 6000);
    }
  }

  /** Old links (login name, uuid, mixed case) are rewritten to /@handle without a history entry. */
  private canonicalize(requested: string, profile: PublicUserResponse) {
    const handle = profile.handle;
    if (!handle || requested.toLowerCase() === handle) return;
    this.rewritingUrl = true;
    void this.router.navigate(producerLink(handle), { replaceUrl: true });
  }
  play(event: Event, spec: Spec) {
    this.actions.playSong(event, spec);
  }
  addToCart(event: Event, spec: Spec) {
    this.actions.addToCart(event, spec);
  }
  price(spec: Spec) {
    const fallbackCurrency =
      spec.displayPriceMoney?.currency ??
      spec.priceMoney?.currency ??
      this.buyerCurrency.effective() ??
      'USD';
    return this.currency.formatMoney(
      spec.displayPriceMoney ?? spec.priceMoney,
      spec.price,
      fallbackCurrency,
    );
  }
}
