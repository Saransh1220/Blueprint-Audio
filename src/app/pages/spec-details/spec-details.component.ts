import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { HeaderComponent, LicenseSelectorComponent, SpecRowComponent } from '../../components';
import { Spec } from '../../models';
import { CartService, LabService, ModalService, PlayerService, AnalyticsService } from '../../services';

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
  private modalService = inject(ModalService);
  private analyticsService = inject(AnalyticsService);

  isFavoriting = signal(false);

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

  openLicenseModal() {
    const s = this.spec();
    if (s) {
      this.modalService.open(LicenseSelectorComponent, 'Select License', {
        spec: s,
      });
    }
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
