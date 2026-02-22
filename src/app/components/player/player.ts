import {
  type AfterViewInit,
  Component,
  computed,
  type ElementRef,
  effect,
  inject,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  signal,
} from '@angular/core';
import { gsap } from 'gsap';
import { PlayerService } from '../../services/player.service';
import { VisualizerService } from '../../services/visualizer.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { AnalyticsService } from '../../services/analytics.service';
import { LicenseSelectorComponent } from '../license-selector/license-selector.component';
import type { Spec } from '../../models';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [],
  templateUrl: './player.html',
  styleUrls: ['./player.scss'],
})
export class PlayerComponent implements AfterViewInit, OnDestroy {
  playerService = inject(PlayerService);
  visualizerService = inject(VisualizerService);
  authService = inject(AuthService);
  modalService = inject(ModalService);
  analyticsService = inject(AnalyticsService);
  cdr = inject(ChangeDetectorRef);

  isFavoriting = signal(false);

  progress = computed(() => {
    const duration = this.playerService.duration();
    const current = this.playerService.currentTime();
    return duration > 0 ? current / duration : 0;
  });

  @ViewChild('controlDeck') controlDeck!: ElementRef;
  @ViewChild('waveformCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // Animation Frame ID
  private animationId: number | null = null;
  private brandColor = '#ffffff';

  constructor() {
    // Use effect to react to changes in the isVisible signal
    effect(() => {
      const isVisible = this.playerService.isVisible();
      if (this.controlDeck?.nativeElement) {
        const el = this.controlDeck.nativeElement;
        if (isVisible) {
          gsap.to(el, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
        } else {
          gsap.to(el, { y: 100, opacity: 0, duration: 0.5, ease: 'power2.in' });
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Set initial state
    if (this.controlDeck?.nativeElement && !this.playerService.isVisible()) {
      gsap.set(this.controlDeck.nativeElement, { y: 100, opacity: 0 });
    }

    // Initialize Canvas
    if (this.canvasRef?.nativeElement) {
      this.initCanvas();
    }
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private initCanvas() {
    this.updateCanvasSize();

    // Get theme color
    const style = getComputedStyle(document.documentElement);
    this.brandColor = style.getPropertyValue('--brand-color').trim() || '#ffffff';

    // Handle Resize
    window.addEventListener('resize', () => {
      this.updateCanvasSize();
      this.drawWaveform();
    });

    // Start Animation Loop
    this.animateWaveform();
  }

  private animateWaveform() {
    this.drawWaveform();
    this.animationId = requestAnimationFrame(() => this.animateWaveform());
  }

  private updateCanvasSize() {
    if (!this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
  }

  private drawWaveform() {
    if (!this.canvasRef?.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTime = this.playerService.currentTime();
    const duration = this.playerService.duration();
    const progressPercent = duration > 0 ? currentTime / duration : 0;

    this.visualizerService.drawWaveform(
      ctx,
      canvas.width,
      canvas.height,
      this.playerService.getWaveformData(),
      this.playerService.isPlaying(),
      progressPercent,
      this.brandColor,
    );
  }

  onSeek(event: MouseEvent) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const duration = this.playerService.duration() || 1;
    this.playerService.seekTo(percentage * duration);
  }

  onSeekSlider(event: Event) {
    const input = event.target as HTMLInputElement;
    const percentage = parseFloat(input.value);
    const duration = this.playerService.duration() || 1;
    this.playerService.seekTo(percentage * duration);
  }

  addToCart(event: MouseEvent) {
    event.stopPropagation();
    const track = this.playerService.currentTrack();
    if (!track) return;

    this.authService.requireAuth(() => {
      this.modalService.open(LicenseSelectorComponent, 'Select License', {
        spec: track,
      });
    });
  }

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.playerService.setVolume(parseFloat(input.value));
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
          if (track.analytics) {
            track.analytics.isFavorited = response.is_favorited;
            if (response.total_count !== undefined) {
              track.analytics.favoriteCount = response.total_count;
            } else {
              if (response.is_favorited) {
                track.analytics.favoriteCount++;
              } else {
                track.analytics.favoriteCount = Math.max(0, track.analytics.favoriteCount - 1);
              }
            }
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
}
