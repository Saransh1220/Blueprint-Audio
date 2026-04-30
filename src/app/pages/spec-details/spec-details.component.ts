import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { type LicenseOption, type Spec } from '../../models';
import {
  AnalyticsService,
  CartService,
  LabService,
  PlayerService,
  ToastService,
} from '../../services';

@Component({
  selector: 'app-spec-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './spec-details.component.html',
  styleUrls: ['./spec-details.component.scss'],
})
export class SpecDetailsComponent {
  private route = inject(ActivatedRoute);
  private labService = inject(LabService);
  private playerService = inject(PlayerService);
  private cartService = inject(CartService);
  private toastService = inject(ToastService);
  private analyticsService = inject(AnalyticsService);

  currencyCode = 'INR';
  isFavoriting = signal(false);
  selectedLicense = signal<LicenseOption | null>(null);
  waveformBars = Array.from({ length: 48 }, (_, i) => 18 + ((i * 17) % 58));
  tickerItems = [
    'Instant license delivery',
    'Tag-free preview included',
    'Cult Beats producer marketplace',
    'Pressed for late-night writing sessions',
  ];

  // Reactive spec fetching
  spec = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        return this.labService.getSpecById(id || '');
      }),
    ),
  );

  // Related specs (mock logic for now, just same category)
  relatedSpecs = toSignal(
    this.labService.getSpecs({ category: 'beat' }), // simplified for now
  );

  producerSpecs = computed(() => {
    const current = this.spec();
    const all = this.relatedSpecs();
    if (!current || !all) return [];
    return all.filter((s) => s.producerId === current.producerId && s.id !== current.id);
  });

  displayPrice = computed(() => this.selectedLicense()?.price ?? this.spec()?.price ?? 0);
  primaryGenre = computed(() => this.spec()?.genres[0]?.name ?? 'Beat');
  relatedDisplaySpecs = computed(() => {
    const current = this.spec();
    const related = this.relatedSpecs() ?? [];
    const producer = this.producerSpecs();
    if (!current) return [];

    const pool = [...producer, ...related].filter((item) => item.id !== current.id);
    const unique = pool.filter(
      (item, index, array) => array.findIndex((x) => x.id === item.id) === index,
    );
    return unique.slice(0, 6);
  });

  producerStats = computed(() => {
    const current = this.spec();
    const producer = this.producerSpecs();
    const all = this.relatedSpecs() ?? [];
    if (!current) {
      return { beatCount: 0, plays: 0, likes: 0 };
    }

    const allByProducer = [
      current,
      ...all.filter((item) => item.producerId === current.producerId),
    ];
    return {
      beatCount: allByProducer.length,
      plays: allByProducer.reduce((sum, item) => sum + (item.analytics?.playCount ?? 0), 0),
      likes: allByProducer.reduce((sum, item) => sum + (item.analytics?.favoriteCount ?? 0), 0),
    };
  });

  includedItems = computed(() => {
    const current = this.spec();
    const selected = this.selectedLicense();
    if (!current) return [];

    const fileTypes = new Set((selected?.fileTypes ?? []).map((type) => type.toLowerCase()));
    const hasWav = fileTypes.has('wav');
    const hasMp3 = fileTypes.has('mp3') || !!current.freeMp3Enabled;
    const hasStems =
      fileTypes.has('trackout') ||
      fileTypes.has('trackouts') ||
      fileTypes.has('stem') ||
      fileTypes.has('stems') ||
      selected?.features.some((feature) => /stem|trackout/i.test(feature));

    return [
      {
        title: 'Master WAV',
        accent: 'hot',
        meta: hasWav ? '44.1kHz · full quality' : 'Available on higher tiers',
        description: 'Full-length stereo master ready for recording and release.',
        active: hasWav,
      },
      {
        title: 'Trackouts / Stems',
        accent: 'lime',
        meta: hasStems ? 'Separated files included' : 'Premium tiers unlock this',
        description: 'Separated drums, melodies, and FX for cleaner mixing control.',
        active: !!hasStems,
      },
      {
        title: 'Tag-free MP3',
        accent: 'sun',
        meta: hasMp3 ? 'Preview-safe and mobile friendly' : 'Not included',
        description: 'Clean mp3 export for writing sessions, previews, and quick shares.',
        active: hasMp3,
      },
      {
        title: 'License PDF',
        accent: 'ink',
        meta: selected ? `${selected.name} license attached` : 'Issued at checkout',
        description: 'Purchase receipt and license terms delivered instantly after checkout.',
        active: !!selected,
      },
    ];
  });

  getLicenseVariant(license: LicenseOption, index: number, total: number) {
    const name = `${license.name} ${license.type}`.toLowerCase();
    if (name.includes('exclusive') || (index === total - 1 && total >= 4)) {
      return 'exclusive';
    }
    if (name.includes('premium') || index === 1) {
      return 'popular';
    }
    return 'standard';
  }

  getLicenseSubtitle(license: LicenseOption, index: number, total: number) {
    const variant = this.getLicenseVariant(license, index, total);
    if (variant === 'exclusive') return 'the whole beat, yours alone';
    if (variant === 'popular') return 'for proper releases';
    if (index === 0) return 'for demos and ideas';
    return 'for bigger placements';
  }

  getLicenseFormatLabel(license: LicenseOption) {
    const normalized = Array.from(
      new Set((license.fileTypes ?? []).map((type) => type.trim().toLowerCase())),
    );
    const featureText = (license.features ?? []).join(' ').toLowerCase();
    const combinedName = `${license.name} ${license.type}`.toLowerCase();

    const hasMp3 = normalized.includes('mp3');
    const hasWav = normalized.includes('wav');
    const hasStems =
      normalized.some((type) => ['stem', 'stems', 'trackout', 'trackouts'].includes(type)) ||
      /stem|trackout/.test(featureText) ||
      /trackout|exclusive|unlimited/.test(combinedName);

    if (hasMp3 && hasWav && hasStems) return 'MP3 + WAV + Stems';
    if (hasWav && hasStems) return 'WAV + Stems';
    if (hasMp3 && hasWav) return 'MP3 + WAV';
    if (hasStems) return 'Stems';
    if (hasWav) return 'WAV';
    if (hasMp3) return 'MP3';

    return license.type === 'Trackout' ? 'WAV + Stems' : license.type;
  }

  getLicenseFeatureRows(license: LicenseOption, index: number, total: number) {
    const variant = this.getLicenseVariant(license, index, total);
    const base = license.features.slice(0, 6).map((feature) => ({ text: feature, muted: false }));

    if (variant === 'standard' && index === 0) {
      return [
        ...base,
        { text: 'WAV or stems', muted: true },
        { text: 'Radio broadcast', muted: true },
      ].slice(0, 6);
    }

    if (variant === 'popular') {
      return [
        ...base,
        { text: 'Radio broadcast (terrestrial)', muted: false },
        { text: 'Royalty split included', muted: false },
      ].slice(0, 6);
    }

    if (variant === 'exclusive') {
      return [
        ...base,
        { text: 'Beat removed from store', muted: false },
        { text: 'Direct producer handoff', muted: false },
      ].slice(0, 6);
    }

    return [
      ...base,
      { text: 'Worldwide digital distribution', muted: false },
      { text: 'Beat remains available to others', muted: true },
    ].slice(0, 6);
  }

  getLicenseButtonLabel(license: LicenseOption, index: number, total: number) {
    return this.getLicenseVariant(license, index, total) === 'exclusive'
      ? 'Buy Exclusive'
      : `Buy ${license.name}`;
  }

  constructor() {
    effect(() => {
      const s = this.spec();
      if (!s?.licenses?.length) {
        this.selectedLicense.set(null);
        return;
      }

      const current = this.selectedLicense();
      if (current && s.licenses.some((license) => license.id === current.id)) {
        return;
      }

      const cheapest = s.licenses.reduce((min, license) =>
        license.price < min.price ? license : min,
      );
      this.selectedLicense.set(cheapest);
    });
  }

  playSpec() {
    const s = this.spec();
    if (s) {
      this.playerService.showPlayer(s);
      // Track play
      this.analyticsService.trackPlay(s.id).subscribe({
        error: (err) => console.error('Failed to track play:', err),
      });
    }
  }

  selectLicense(license: LicenseOption) {
    this.selectedLicense.set(license);
  }

  addLicenseToCart(license: LicenseOption) {
    this.selectedLicense.set(license);
    this.cartService.addItem(this.spec()!, license);
    this.toastService.success(`Added ${this.spec()!.title} (${license.name}) to cart`);
  }

  addSelectedLicenseToCart() {
    const s = this.spec();
    const license = this.selectedLicense();
    if (!s || !license) return;

    this.cartService.addItem(s, license);
    this.toastService.success(`Added ${s.title} (${license.name}) to cart`);
  }

  toggleFavorite() {
    const s = this.spec();
    if (!s || this.isFavoriting()) return;

    this.isFavoriting.set(true);
    this.analyticsService.toggleFavorite(s.id).subscribe({
      next: (response) => {
        if (s.analytics) {
          s.analytics.isFavorited = response.is_favorited;

          if (response.total_count !== undefined) {
            s.analytics.favoriteCount = response.total_count;
          } else {
            // Fallback: manually update count if backend doesn't return it
            if (response.is_favorited) {
              s.analytics.favoriteCount++;
            } else {
              s.analytics.favoriteCount = Math.max(0, s.analytics.favoriteCount - 1);
            }
          }
        }
        this.isFavoriting.set(false);
      },
      error: (err) => {
        console.error('Failed to toggle favorite:', err);
        this.isFavoriting.set(false);
      },
    });
  }

  downloadFreeMp3() {
    const s = this.spec();
    if (!s) return;

    this.analyticsService.downloadFreeMp3(s.id).subscribe({
      next: (response) => {
        if (response.url) {
          window.open(response.url, '_blank');
        } else {
          console.error('Download URL not found in response');
        }
      },
      error: (err) => {
        console.error('Failed to download free MP3:', err);
      },
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatCompactCount(value: number): string {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    }
    return `${value}`;
  }

  getStyledBeatTitle(title: string) {
    const parts = title.trim().split(/\s+/).filter(Boolean);
    return {
      lead: parts[0] ?? '',
      accent: parts.slice(1).join(' '),
    };
  }

  trackPlayFor(spec: Spec, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.playerService.showPlayer(spec);
    this.analyticsService.trackPlay(spec.id).subscribe({
      error: (err) => console.error('Failed to track play:', err),
    });
  }
}
