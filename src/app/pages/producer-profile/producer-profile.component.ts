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
import { combineLatest, filter, map, switchMap } from 'rxjs';
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
  handle = computed(() => (this.profile()?.name || 'producer').toLowerCase().replaceAll(' ', ''));
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
        map(() => this.route.snapshot.queryParamMap.get('id')),
        filter((id): id is string => !!id),
        switchMap((id) =>
          combineLatest([
            this.userService.getPublicProfile(id),
            this.specService.getUserSpecs(id, 1, 10),
          ]),
        ),
      )
      .subscribe({
        next: ([profile, catalog]) => {
          this.profile.set(profile);
          this.specs.set(catalog.data.map((spec) => this.adapter.adapt(spec)));
          this.totalSpecs.set(catalog.metadata.total);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
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
      spec.displayPriceMoney,
      spec.price,
      profileCurrency(this.profile()?.store_currency),
    );
  }
}

function profileCurrency(currency?: string) {
  return currency === 'INR' ? ('INR' as const) : ('USD' as const);
}
