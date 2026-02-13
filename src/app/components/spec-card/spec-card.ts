import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  computed,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

import { NgOptimizedImage } from '@angular/common';

import type { Spec } from '../../models';
import { ModalService, PlayerService } from '../../services';
import { AnalyticsService } from '../../services/analytics.service';
import { LicenseSelectorComponent } from '../license-selector/license-selector.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-spec-card',
  imports: [CommonModule, NgOptimizedImage, RouterLink],
  templateUrl: './spec-card.html',
  styleUrls: ['./spec-card.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecCardComponent {
  @Input() spec!: Spec;
  @Input() priority = false;
  playerService = inject(PlayerService);
  modalService = inject(ModalService);
  router = inject(Router);
  analyticsService = inject(AnalyticsService);
  authService = inject(AuthService);

  cdr = inject(ChangeDetectorRef);

  // Local state for favorite
  isFavoriting = signal(false);

  // Computed: Check if this spec is currently playing
  isCurrentlyPlaying = computed(() => {
    const currentTrack = this.playerService.currentTrack();
    const isPlaying = this.playerService.isPlaying();
    return currentTrack?.id === this.spec.id && isPlaying;
  });

  playSong(event: MouseEvent) {
    event.stopPropagation();
    const currentTrack = this.playerService.currentTrack();

    // If this track is already loaded, toggle play/pause
    if (currentTrack?.id === this.spec.id) {
      this.playerService.togglePlay();
    } else {
      // Load and play new track
      this.playerService.showPlayer(this.spec);
      // Track the play event
      this.analyticsService.trackPlay(this.spec.id).subscribe({
        error: (err) => console.error('Failed to track play:', err),
      });
    }
  }

  addToCart(event: MouseEvent) {
    event.stopPropagation();
    this.authService.requireAuth(() => {
      this.modalService.open(LicenseSelectorComponent, 'Select License', {
        spec: this.spec,
      });
    });
  }

  openDetails() {
    // Navigate to details page
    // Remove the '#' if present to make URL cleaner, though our service handles both
    const id = this.spec.id.replace('#', '');
    this.router.navigate(['/beats', id]);
  }

  toggleFavorite(event: MouseEvent) {
    event.stopPropagation();
    this.authService.requireAuth(() => {
      if (this.isFavoriting()) return;

      this.isFavoriting.set(true);

      this.analyticsService.toggleFavorite(this.spec.id).subscribe({
        next: (response) => {
          // Update the spec's analytics
          if (!this.spec.analytics) {
            this.spec.analytics = {
              playCount: 0,
              favoriteCount: 0,
              totalDownloadCount: 0,
              isFavorited: false,
            };
          }

          if (this.spec.analytics) {
            this.spec.analytics.isFavorited = response.is_favorited;

            if (response.total_count !== undefined) {
              this.spec.analytics.favoriteCount = response.total_count;
            } else {
              // Fallback: manually update count if backend doesn't return it
              if (response.is_favorited) {
                this.spec.analytics.favoriteCount++;
              } else {
                this.spec.analytics.favoriteCount = Math.max(
                  0,
                  this.spec.analytics.favoriteCount - 1,
                );
              }
            }
          }

          this.isFavoriting.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to toggle favorite:', err);
          this.isFavoriting.set(false);
          this.cdr.markForCheck();
        },
      });
    });
  }

  downloadFreeMp3(event: MouseEvent) {
    event.stopPropagation();
    this.analyticsService.downloadFreeMp3(this.spec.id).subscribe({
      next: (response) => {
        // Open download URL in new tab
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

  get imageUrl(): string {
    return this.spec.imageUrl || 'assets/images/placeholder.jpg';
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
