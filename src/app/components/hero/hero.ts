import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import type { Spec } from '../../models';
import { LabService } from '../../services';
import { CurrencyService } from '../../services/currency.service';

type BeatCard = {
  id: string;
  title: string;
  producer: string;
  producerHandle: string;
  genre: string;
  meta: string;
  price: string;
  imageUrl: string;
  className: string;
  shortCode?: string;
  slug?: string;
  tilt: number;
  lift: number;
};

const CARD_LAYOUTS = [
  { className: 'cover-noir', tilt: -14, lift: 34 },
  { className: 'cover-blueprint', tilt: -9, lift: 14 },
  { className: 'cover-yellow', tilt: -4, lift: 2 },
  { className: 'cover-coral', tilt: 2, lift: 0 },
  { className: 'cover-redline', tilt: 7, lift: 9 },
  { className: 'cover-poster', tilt: 12, lift: 22 },
  { className: 'cover-green', tilt: 16, lift: 40 },
] as const;

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class HeroComponent implements OnInit {
  private labService = inject(LabService);
  private currencyService = inject(CurrencyService);

  readonly cardLayouts = CARD_LAYOUTS;
  beatCards = signal<BeatCard[]>([]);
  isLoading = signal(true);
  private initialized = false;
  private fallbackLoaded = false;
  private _useExternalData = false;
  private externalLoading = true;

  @Input()
  set useExternalData(value: boolean) {
    this._useExternalData = value;
    if (!value && this.initialized && !this.fallbackLoaded) {
      this.loadFeaturedSpecs();
    }
  }

  @Input()
  set homepageLoading(value: boolean) {
    this.externalLoading = value;
    if (this._useExternalData) {
      this.isLoading.set(value);
    }
  }

  @Input()
  set featuredSpecs(specs: Spec[] | null | undefined) {
    if (!this._useExternalData || !specs) return;
    if (this.externalLoading && specs.length === 0) return;
    this.beatCards.set(
      specs.slice(0, CARD_LAYOUTS.length).map((spec, index) => this.toBeatCard(spec, index)),
    );
    this.isLoading.set(false);
  }

  ngOnInit(): void {
    this.initialized = true;
    if (this._useExternalData) {
      return;
    }
    this.loadFeaturedSpecs();
  }

  private loadFeaturedSpecs(): void {
    this.fallbackLoaded = true;
    this.labService
      .getSpecs({ category: 'beat', page: 1, per_page: 7, sort: 'newest' })
      .pipe(
        catchError(() => of([] as Spec[])),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((specs) => {
        this.beatCards.set(
          specs.slice(0, CARD_LAYOUTS.length).map((spec, index) => this.toBeatCard(spec, index)),
        );
      });
  }

  private toBeatCard(spec: Spec, index: number): BeatCard {
    const layout = CARD_LAYOUTS[index % CARD_LAYOUTS.length];
    const genre = spec.genres?.[0]?.name || spec.category;
    const meta = [spec.bpm ? `${spec.bpm} BPM` : '', spec.key].filter(Boolean).join(' / ');

    return {
      id: spec.id,
      title: spec.title,
      producer: spec.producerName,
      producerHandle: this.toHandle(spec.producerName),
      genre,
      meta,
      price: this.currencyService.formatMoney(spec.displayPriceMoney, spec.price),
      imageUrl: spec.imageUrl,
      shortCode: spec.shortCode,
      slug: spec.slug,
      ...layout,
    };
  }

  private toHandle(name: string): string {
    const clean = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
    return clean ? `@${clean.slice(0, 14)}` : '@producer';
  }
}
