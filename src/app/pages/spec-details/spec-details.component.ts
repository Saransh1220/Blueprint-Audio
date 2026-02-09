import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { SpecRowComponent } from '../../components';
import { type LicenseOption } from '../../models';
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
  imports: [CommonModule, RouterLink, SpecRowComponent],
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
          s.analytics.isFavorited = response.favorited;
          s.analytics.favoriteCount = response.total_count;
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
        window.open(response.download_url, '_blank');
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
}
