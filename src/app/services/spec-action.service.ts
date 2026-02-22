import { inject, Injectable, WritableSignal, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Spec } from '../models';
import { PlayerService } from './player.service';
import { ModalService } from './modal.service';
import { AnalyticsService } from './analytics.service';
import { AuthService } from './auth.service';
import { LicenseSelectorComponent } from '../components/license-selector/license-selector.component';

@Injectable({ providedIn: 'root' })
export class SpecActionService {
  private playerService = inject(PlayerService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private analyticsService = inject(AnalyticsService);
  private authService = inject(AuthService);

  playSong(event: MouseEvent, spec: Spec) {
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

  addToCart(event: MouseEvent, spec: Spec) {
    event.stopPropagation();
    this.authService.requireAuth(() => {
      this.modalService.open(LicenseSelectorComponent, 'Select License', { spec });
    });
  }

  openDetails(spec: Spec) {
    const id = spec.id.replace('#', '');
    this.router.navigate(['/beats', id]);
  }

  toggleFavorite(
    event: MouseEvent,
    spec: Spec,
    isFavoriting: WritableSignal<boolean>,
    cdr: ChangeDetectorRef,
  ) {
    event.stopPropagation();
    this.authService.requireAuth(() => {
      if (isFavoriting()) return;
      isFavoriting.set(true);

      this.analyticsService.toggleFavorite(spec.id).subscribe({
        next: (response) => {
          if (!spec.analytics) {
            spec.analytics = {
              playCount: 0,
              favoriteCount: 0,
              totalDownloadCount: 0,
              isFavorited: false,
            };
          }

          if (spec.analytics) {
            spec.analytics.isFavorited = response.is_favorited;
            if (response.total_count !== undefined) {
              spec.analytics.favoriteCount = response.total_count;
            } else {
              if (response.is_favorited) {
                spec.analytics.favoriteCount++;
              } else {
                spec.analytics.favoriteCount = Math.max(0, spec.analytics.favoriteCount - 1);
              }
            }
          }

          isFavoriting.set(false);
          cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to toggle favorite:', err);
          isFavoriting.set(false);
          cdr.markForCheck();
        },
      });
    });
  }

  downloadFreeMp3(event: MouseEvent, spec: Spec) {
    event.stopPropagation();
    this.analyticsService.downloadFreeMp3(spec.id).subscribe({
      next: (response) => {
        if (response.url) {
          window.open(response.url, '_blank');
        } else {
          console.error('Download URL not found in response');
        }
      },
      error: (err) => console.error('Failed to download free MP3:', err),
    });
  }

  syncFavorite(spec: Spec, cdr: ChangeDetectorRef): Subscription {
    return this.analyticsService.favoriteChanges$.subscribe((change) => {
      if (spec && spec.id === change.specId) {
        if (!spec.analytics) {
          spec.analytics = {
            playCount: 0,
            favoriteCount: 0,
            totalDownloadCount: 0,
            isFavorited: false,
          };
        }
        if (
          spec.analytics.isFavorited !== change.isFavorited ||
          (change.totalCount !== undefined && spec.analytics.favoriteCount !== change.totalCount)
        ) {
          spec.analytics.isFavorited = change.isFavorited;
          if (change.totalCount !== undefined) {
            spec.analytics.favoriteCount = change.totalCount;
          }
          cdr.markForCheck();
        }
      }
    });
  }

  formatDuration(seconds: number): string {
    const currentSeconds = Math.floor(seconds);
    const mins = Math.floor(currentSeconds / 60);
    const secs = currentSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  isCurrentlyPlaying(spec: Spec): boolean {
    const currentTrack = this.playerService.currentTrack();
    const isPlaying = this.playerService.isPlaying();
    return currentTrack?.id === spec.id && isPlaying;
  }
}
