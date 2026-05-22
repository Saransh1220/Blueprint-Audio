import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { SpecListItemComponent } from '../../components/spec-list-item/spec-list-item.component';
import { type LicenseOption, type Spec } from '../../models';
import type { Money } from '../../models/money';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
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
  imports: [CommonModule, RouterLink, SpecListItemComponent, MoneyPipe],
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

  isFavoriting = signal(false);
  specLoadSettled = signal(false);
  selectedLicense = signal<LicenseOption | null>(null);
  relatedViewMode = signal<'grid' | 'list'>('grid');
  waveformBars = signal<number[]>([]);
  mobileArtPalette = signal({
    deep: '#0c0c0c',
    mid: '#2a2926',
    accent: '#f0e9d6',
  });
  waveformProgress = computed(() => {
    const current = this.spec();
    const active = this.getActivePlayerTrack();
    if (!current || active?.id !== current.id) return 0;

    const duration = this.getPlayerDuration() || current.duration || 0;
    if (!duration) return 0;

    return Math.max(0, Math.min(1, this.getPlayerCurrentTime() / duration));
  });
  waveformPlayheadIndex = computed(() =>
    Math.floor(this.waveformBars().length * this.waveformProgress()),
  );
  waveformCurrentTime = computed(() => {
    const current = this.spec();
    const active = this.getActivePlayerTrack();
    return current && active?.id === current.id ? this.getPlayerCurrentTime() : 0;
  });
  waveformDuration = computed(() => {
    const current = this.spec();
    const active = this.getActivePlayerTrack();
    if (current && active?.id === current.id) {
      return this.getPlayerDuration() || current.duration || 0;
    }
    return current?.duration || 0;
  });
  isSpecLoading = computed(() => !this.specLoadSettled() && !this.spec());
  isSpecMissing = computed(() => this.specLoadSettled() && !this.spec());
  private waveformRequestId = 0;
  tickerItems = [
    'Instant license delivery',
    'Tag-free preview included',
    'Waveyard producer marketplace',
    'Pressed for late-night writing sessions',
  ];

  // Reactive spec fetching
  spec = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        this.specLoadSettled.set(false);
        const idOrCode = params.get('id') || params.get('shortCode');
        return this.labService.getSpecById(idOrCode || '').pipe(
          catchError(() => of(undefined)),
          finalize(() => this.specLoadSettled.set(true)),
        );
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
  displayPriceMoney = computed<Money | undefined>(
    () => this.selectedLicense()?.displayPriceMoney ?? this.spec()?.displayPriceMoney,
  );
  primaryGenre = computed(() => this.spec()?.genres[0]?.name ?? 'Beat');
  producerImageUrl = computed(() => this.spec()?.producerAvatarUrl || '');
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

    effect(() => {
      const s = this.spec();
      this.loadWaveformForSpec(s);
    });

    effect(() => {
      this.updateMobileArtPalette(this.spec());
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

  seekWaveform(event: MouseEvent) {
    const s = this.spec();
    if (!s) return;

    const rail = event.currentTarget as HTMLElement | null;
    const rect = rail?.getBoundingClientRect();
    if (!rect?.width) {
      this.playSpec();
      return;
    }

    const progress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const isCurrent = this.getActivePlayerTrack()?.id === s.id;

    if (!isCurrent) {
      this.playSpec();
      return;
    }

    const duration = this.getPlayerDuration() || s.duration || 0;
    if (duration > 0) {
      this.playerService.seekTo(progress * duration);
    }
  }

  selectLicense(license: LicenseOption) {
    this.selectedLicense.set(license);
  }

  setRelatedViewMode(mode: 'grid' | 'list') {
    this.relatedViewMode.set(mode);
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

  async copyBeatLink() {
    const s = this.spec();
    if (!s || typeof window === 'undefined') return;

    const targetId = s.shortCode || s.id.replace('#', '');
    const url = `${window.location.origin}/${targetId}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      this.toastService.success('Beat link copied');
    } else {
      this.toastService.info('Clipboard support is unavailable here');
    }
  }

  formatDuration(seconds: number): string {
    const wholeSeconds = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(wholeSeconds / 60);
    const secs = wholeSeconds % 60;
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

  private async loadWaveformForSpec(spec: Spec | undefined) {
    const requestId = ++this.waveformRequestId;
    if (!spec) {
      this.waveformBars.set([]);
      return;
    }

    const fallback = this.buildFallbackWaveform(spec);
    if (!spec.audioUrl || typeof window === 'undefined') {
      this.waveformBars.set(fallback);
      return;
    }

    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        this.waveformBars.set(fallback);
        return;
      }

      const response = await fetch(spec.audioUrl);
      if (!response.ok) {
        throw new Error(`Waveform fetch failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContextCtor();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      await audioContext.close().catch(() => undefined);

      if (requestId !== this.waveformRequestId) return;
      this.waveformBars.set(this.sampleWaveform(audioBuffer, 64));
    } catch (err) {
      if (requestId === this.waveformRequestId) {
        this.waveformBars.set(fallback);
      }
    }
  }

  private sampleWaveform(audioBuffer: AudioBuffer, bars: number) {
    const channel = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / bars));
    const samples = Array.from({ length: bars }, (_, index) => {
      const start = index * blockSize;
      let sum = 0;
      for (let i = 0; i < blockSize && start + i < channel.length; i++) {
        sum += Math.abs(channel[start + i]);
      }
      return sum / blockSize;
    });

    const peak = Math.max(...samples, 0.001);
    return samples.map((sample) => Math.max(8, Math.round((sample / peak) * 100)));
  }

  private buildFallbackWaveform(spec: Spec) {
    const seed = `${spec.id}:${spec.bpm}:${spec.key}`.split('').reduce((sum, char) => {
      return (sum + char.charCodeAt(0) * 17) % 997;
    }, 23);

    return Array.from({ length: 64 }, (_, index) => {
      const pulse = Math.sin((index + seed) * 0.52) * 0.5 + 0.5;
      const chop = ((index * 29 + seed) % 100) / 100;
      return Math.round(12 + Math.max(pulse, chop * 0.8) * 82);
    });
  }

  private getActivePlayerTrack(): Spec | null {
    return this.playerService.currentTrack?.() ?? null;
  }

  private getPlayerCurrentTime(): number {
    return this.playerService.currentTime?.() ?? 0;
  }

  private getPlayerDuration(): number {
    return this.playerService.duration?.() ?? 0;
  }

  private updateMobileArtPalette(spec: Spec | undefined) {
    if (!spec?.imageUrl || typeof Image === 'undefined' || typeof document === 'undefined') {
      this.mobileArtPalette.set(this.defaultMobileArtPalette());
      return;
    }

    const imageUrl = spec.imageUrl;
    const fallbackPalette = this.defaultMobileArtPalette();
    this.mobileArtPalette.set(fallbackPalette);

    void this.loadPaletteImage(imageUrl)
      .then(({ image, cleanup }) => {
        try {
          if (this.spec()?.imageUrl !== imageUrl) return;
          this.mobileArtPalette.set(this.extractPalette(image));
        } finally {
          cleanup();
        }
      })
      .catch(() => {
        if (this.spec()?.imageUrl === imageUrl) {
          this.mobileArtPalette.set(fallbackPalette);
        }
      });
  }

  private async loadPaletteImage(
    imageUrl: string,
  ): Promise<{ image: HTMLImageElement; cleanup: () => void }> {
    if (
      typeof fetch === 'function' &&
      typeof URL !== 'undefined' &&
      !/^(data:|blob:)/i.test(imageUrl)
    ) {
      try {
        const response = await fetch(imageUrl, {
          mode: 'cors',
          cache: 'reload',
          credentials: 'omit',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const objectUrl = URL.createObjectURL(await response.blob());
        return {
          image: await this.loadImageElement(objectUrl, false),
          cleanup: () => URL.revokeObjectURL(objectUrl),
        };
      } catch {
        // Fall back to normal image loading when CORS fetch is rejected.
      }
    }

    return {
      image: await this.loadImageElement(imageUrl, true),
      cleanup: () => undefined,
    };
  }

  private loadImageElement(imageUrl: string, useAnonymousCors: boolean) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (useAnonymousCors) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  private extractPalette(img: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    const size = 36;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return this.defaultMobileArtPalette();

    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    let r = 0;
    let g = 0;
    let b = 0;
    let accentR = 0;
    let accentG = 0;
    let accentB = 0;
    let accentScore = -1;
    let count = 0;

    for (let i = 0; i < data.length; i += 16) {
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      const saturation = max - min;
      const luma = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
      const score = saturation * 1.35 + luma * 0.24;

      r += pr;
      g += pg;
      b += pb;
      count++;

      if (score > accentScore && luma > 34) {
        accentScore = score;
        accentR = pr;
        accentG = pg;
        accentB = pb;
      }
    }

    const avgR = r / count;
    const avgG = g / count;
    const avgB = b / count;
    return {
      deep: this.rgbString(avgR * 0.22, avgG * 0.22, avgB * 0.22),
      mid: this.rgbString(avgR * 0.82 + 16, avgG * 0.82 + 16, avgB * 0.82 + 16),
      accent: this.rgbString(accentR * 1.04 + 10, accentG * 1.04 + 10, accentB * 1.04 + 10),
    };
  }

  private rgbString(r: number, g: number, b: number) {
    const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
    return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
  }

  private defaultMobileArtPalette() {
    return {
      deep: '#0c0c0c',
      mid: '#2a2926',
      accent: '#f0e9d6',
    };
  }
}
