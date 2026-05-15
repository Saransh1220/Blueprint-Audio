import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  HostListener,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PlayerService } from '../../services/player.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { AnalyticsService } from '../../services/analytics.service';
import { LabService } from '../../services/lab';
import { ToastService } from '../../services/toast.service';
import { LicenseSelectorComponent } from '../license-selector/license-selector.component';
import type { Spec } from '../../models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './player.html',
  styleUrls: ['./player.scss'],
})
export class PlayerComponent implements OnDestroy {
  playerService = inject(PlayerService);
  authService = inject(AuthService);
  modalService = inject(ModalService);
  analyticsService = inject(AnalyticsService);
  labService = inject(LabService);
  toastService = inject(ToastService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);

  isFavoriting = signal(false);
  isMenuOpen = signal(false);
  expandedTrackDetail = signal<Spec | null>(null);
  waveformBars = signal<number[]>(this.createIdleWaveform());
  displayTrack = signal<Spec | null>(null);
  isDockActive = signal(false);
  speedOptions = [0.75, 1, 1.25, 1.5];

  progress = computed(() => {
    const duration = this.playerService.duration();
    const current = this.playerService.currentTime();
    return duration > 0 ? current / duration : 0;
  });

  queueItems = computed(() =>
    this.playerService.queue().map((item, index) => ({
      track: item,
      index,
      isActive: index === this.playerService.queueIndex(),
    })),
  );

  displayGenres = computed(() => {
    const track = this.expandedTrackDetail() ?? this.playerService.currentTrack();
    return track?.genres?.slice(0, 3) ?? [];
  });

  detailTags = computed(() => {
    const track = this.expandedTrackDetail() ?? this.playerService.currentTrack();
    const tags = track?.tags?.slice(0, 3) ?? [];
    if (track?.freeMp3Enabled) {
      return [...tags, 'Free MP3'];
    }
    return tags;
  });

  minimumLicensePrice = computed(() => {
    const track = this.expandedTrackDetail() ?? this.playerService.currentTrack();
    if (!track) return 0;
    if (!track.licenses?.length) return track.price;
    return track.licenses.reduce(
      (min, license) => Math.min(min, license.price),
      track.licenses[0].price,
    );
  });

  private lastVisibleState = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private activateFrame: number | null = null;

  private detailSub?: Subscription;
  private waveformFrame: number | null = null;

  constructor() {
    effect(() => {
      const isVisible = this.playerService.isVisible();
      const track = this.playerService.currentTrack();
      const wasVisible = this.lastVisibleState;
      this.lastVisibleState = isVisible;

      if (isVisible && track) {
        this.clearHideTimer();
        this.displayTrack.set(track);

        if (!wasVisible) {
          this.isDockActive.set(false);
          this.scheduleActivate();
        } else {
          this.isDockActive.set(true);
        }
        return;
      }

      if (!isVisible && wasVisible && this.displayTrack()) {
        this.cancelActivateFrame();
        this.isDockActive.set(false);
        this.hideTimer = setTimeout(() => {
          if (!this.playerService.isVisible()) {
            this.displayTrack.set(null);
            this.expandedTrackDetail.set(null);
          }
        }, 320);
      }
    });

    effect(() => {
      const track = this.playerService.currentTrack();
      const expanded = this.playerService.isExpanded();

      this.expandedTrackDetail.set(track);
      this.detailSub?.unsubscribe();

      if (!track || !expanded) return;

      this.detailSub = this.labService.getSpecById(track.id).subscribe({
        next: (spec) => {
          if (spec) {
            this.expandedTrackDetail.set(spec);
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.expandedTrackDetail.set(track);
          this.cdr.markForCheck();
        },
      });
    });

    effect(() => {
      const visible = this.playerService.isVisible();
      const track = this.playerService.currentTrack();
      const playing = this.playerService.isPlaying();

      this.stopWaveformLoop();

      if (!visible || !track) {
        this.waveformBars.set(this.createIdleWaveform());
        return;
      }

      this.tickWaveform();

      if (playing) {
        this.waveformFrame = requestAnimationFrame(() => this.startWaveformLoop());
      }
    });
  }

  ngOnDestroy() {
    this.detailSub?.unsubscribe();
    this.stopWaveformLoop();
    this.clearHideTimer();
    this.cancelActivateFrame();
  }

  @HostListener('document:click')
  handleDocumentClick() {
    this.isMenuOpen.set(false);
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isMenuOpen.update((open) => !open);
  }

  stopBubble(event: Event) {
    event.stopPropagation();
  }

  onSeekSlider(event: Event) {
    const input = event.target as HTMLInputElement;
    const percentage = parseFloat(input.value);
    const duration = this.playerService.duration() || 1;
    this.playerService.seekTo(percentage * duration);
  }

  onSeek(event: MouseEvent) {
    const rail = event.currentTarget as HTMLElement | null;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const duration = this.playerService.duration() || 1;
    this.playerService.seekTo(percentage * duration);
  }

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.playerService.setVolume(parseFloat(input.value));
  }

  setPlaybackRate(rate: number) {
    this.playerService.setPlaybackRate(rate);
  }

  addToCart(event: MouseEvent) {
    event.stopPropagation();
    const track = this.playerService.currentTrack();
    if (!track) return;

    this.authService.requireAuth(() => {
      this.modalService.open(LicenseSelectorComponent, 'Select License', {
        spec: this.expandedTrackDetail() ?? track,
      });
    });
  }

  toggleFavorite(event: MouseEvent, track: Spec) {
    event.stopPropagation();
    this.authService.requireAuth(() => {
      if (this.isFavoriting()) return;
      this.isFavoriting.set(true);

      this.analyticsService.toggleFavorite(track.id).subscribe({
        next: (response) => {
          if (!track.analytics) {
            track.analytics = {
              playCount: 0,
              favoriteCount: 0,
              totalDownloadCount: 0,
              isFavorited: false,
            };
          }

          track.analytics.isFavorited = response.is_favorited;
          if (response.total_count !== undefined) {
            track.analytics.favoriteCount = response.total_count;
          } else if (response.is_favorited) {
            track.analytics.favoriteCount++;
          } else {
            track.analytics.favoriteCount = Math.max(0, track.analytics.favoriteCount - 1);
          }

          this.isFavoriting.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Player: Failed to toggle favorite:', err);
          this.isFavoriting.set(false);
          this.cdr.markForCheck();
        },
      });
    });
  }

  downloadFreeMp3(event: MouseEvent, track: Spec) {
    event.stopPropagation();
    this.analyticsService.downloadFreeMp3(track.id).subscribe({
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

  openBeatPage(event?: Event) {
    event?.stopPropagation();
    const track = this.playerService.currentTrack();
    if (!track) return;
    const targetId = track.shortCode || track.id.replace('#', '');
    void this.router.navigate(['/', targetId]);
    this.isMenuOpen.set(false);
  }

  openProducerProfile(event?: Event) {
    event?.stopPropagation();
    const track = this.playerService.currentTrack();
    if (!track?.producerId) return;
    void this.router.navigate(['/explore']);
    this.isMenuOpen.set(false);
  }

  async copyBeatLink(event?: Event) {
    event?.stopPropagation();
    const track = this.playerService.currentTrack();
    if (!track) return;

    const url = `${window.location.origin}/beats/${track.id.replace('#', '')}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      this.toastService.success('Beat link copied');
    } else {
      this.toastService.info('Clipboard support is unavailable here');
    }
    this.isMenuOpen.set(false);
  }

  async shareBeat(event?: Event) {
    event?.stopPropagation();
    const track = this.playerService.currentTrack();
    if (!track) return;

    const url = `${window.location.origin}/beats/${track.id.replace('#', '')}`;
    if (navigator.share) {
      await navigator.share({ title: track.title, url });
      this.toastService.success('Shared successfully');
    } else {
      await this.copyBeatLink();
    }
    this.isMenuOpen.set(false);
  }

  notifyApiNeeded(message: string, event?: Event) {
    event?.stopPropagation();
    this.toastService.info(message);
    this.isMenuOpen.set(false);
  }

  formatDuration(seconds?: number): string {
    if (!seconds || Number.isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatPanelKey(key?: string): { root: string; mode: string } {
    if (!key) {
      return { root: '--', mode: '' };
    }

    const normalized = key.replace(/\s+/g, ' ').trim();
    const compactMinor = normalized.match(/^([A-G](?:#|b)?)(?:\s*)(m|min|minor)$/i);
    if (compactMinor) {
      return { root: compactMinor[1].toUpperCase(), mode: 'min' };
    }

    const compactMajor = normalized.match(/^([A-G](?:#|b)?)(?:\s*)(maj|major)$/i);
    if (compactMajor) {
      return { root: compactMajor[1].toUpperCase(), mode: 'maj' };
    }

    const parts = normalized.split(' ');
    const root = parts.shift() ?? normalized;
    const mode = parts.join(' ').toLowerCase();

    if (mode.includes('minor')) {
      return { root: root.toUpperCase(), mode: 'min' };
    }

    if (mode.includes('major')) {
      return { root: root.toUpperCase(), mode: 'maj' };
    }

    if (mode === 'm') {
      return { root: root.toUpperCase(), mode: 'min' };
    }

    return { root: root.toUpperCase(), mode: mode ? mode.slice(0, 3) : '' };
  }

  isBarPlayed(index: number): boolean {
    return index / this.waveformBars().length < this.progress();
  }

  private startWaveformLoop() {
    this.tickWaveform();
    if (
      this.playerService.isVisible() &&
      this.playerService.currentTrack() &&
      this.playerService.isPlaying()
    ) {
      this.waveformFrame = requestAnimationFrame(() => this.startWaveformLoop());
    }
  }

  private stopWaveformLoop() {
    if (this.waveformFrame !== null) {
      cancelAnimationFrame(this.waveformFrame);
      this.waveformFrame = null;
    }
  }

  private tickWaveform() {
    const data = this.playerService.getWaveformData();
    if (!data?.length) {
      this.waveformBars.set(this.createIdleWaveform());
      return;
    }

    const bars = 60;
    const nextBars = Array.from({ length: bars }, (_, index) => {
      const sourceIndex = Math.floor((index / bars) * data.length);
      const value = data[sourceIndex] ?? 0;
      return Math.max(12, Math.min(100, 10 + (value / 255) * 90));
    });

    this.waveformBars.set(nextBars);
  }

  private createIdleWaveform() {
    return Array.from({ length: 60 }, (_, i) => 16 + ((i * 17) % 34));
  }

  private scheduleActivate() {
    this.cancelActivateFrame();
    this.activateFrame = requestAnimationFrame(() => {
      this.activateFrame = requestAnimationFrame(() => {
        if (this.playerService.isVisible()) {
          this.isDockActive.set(true);
        }
        this.activateFrame = null;
      });
    });
  }

  private clearHideTimer() {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private cancelActivateFrame() {
    if (this.activateFrame !== null) {
      cancelAnimationFrame(this.activateFrame);
      this.activateFrame = null;
    }
  }
}
