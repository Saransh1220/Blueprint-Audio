import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnDestroy,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, map, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpecAdapter } from '../../adapters/spec.adapter';
import { SpecCardComponent } from '../../components/spec-card/spec-card';
import type { Spec } from '../../models';
import { CurrencyService } from '../../services/currency.service';
import { SpecActionService } from '../../services/spec-action.service';
import { SpecService } from '../../services/spec.service';
import { UserService } from '../../services/user.service';
import type { PublicUserResponse } from '../../core/api/user.requests';

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
  private document = inject(DOCUMENT);

  profile = signal<PublicUserResponse | null>(null);
  specs = signal<Spec[]>([]);
  loading = signal(true);
  error = signal(false);
  activeGenre = signal('All');
  following = signal(false);
  totalSpecs = signal(0);
  currentPage = signal(1);
  loadingMore = signal(false);
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
  handle = computed(() => this.profile()?.name || 'producer');
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
            tap((profile) => this.profile.set(profile)),
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
  }

  compact(value: number) {
    return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
      value,
    );
  }
  toggleFollow() {
    this.following.update((value) => !value);
  }
  play(event: Event, spec: Spec) {
    this.actions.playSong(event, spec);
  }
  addToCart(event: Event, spec: Spec) {
    this.actions.addToCart(event, spec);
  }
  price(spec: Spec) {
    return this.currency.formatMoney(
      spec.displayPriceMoney ?? spec.priceMoney,
      spec.price,
      this.profile()?.store_currency || 'USD',
    );
  }
}
