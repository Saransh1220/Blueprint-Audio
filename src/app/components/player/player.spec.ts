import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PlayerService } from '../../services/player.service';
import { VisualizerService } from '../../services/visualizer.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { AnalyticsService } from '../../services/analytics.service';
import { PlayerComponent } from './player';

describe('PlayerComponent', () => {
  let fixture: ComponentFixture<PlayerComponent>;
  let component: PlayerComponent;

  const track: any = {
    id: 's1',
    title: 'Song',
    imageUrl: 'x.jpg',
    bpm: 120,
    key: 'A MINOR',
    price: 1000,
    freeMp3Enabled: true,
    analytics: { isFavorited: false, favoriteCount: 1, playCount: 0, totalDownloadCount: 0 },
  };

  const playerService = {
    isVisible: signal(true),
    currentTrack: signal(track),
    duration: signal(200),
    currentTime: signal(50),
    isPlaying: signal(false),
    volume: signal(0.5),
    getWaveformData: vi.fn(() => new Float32Array([0.1, 0.2])),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    showPlayer: vi.fn(),
    hidePlayer: vi.fn(),
    togglePlay: vi.fn(),
    toggleMute: vi.fn(),
    volumeIcon: vi.fn(() => 'fa-volume-up'),
    currentTimeFormatted: vi.fn(() => '0:50'),
    durationFormatted: vi.fn(() => '3:20'),
  };
  const drawWaveform = vi.fn();
  const requireAuth = vi.fn((cb) => cb());
  const open = vi.fn();
  const toggleFavorite = vi.fn(() => of({ is_favorited: true, total_count: 4 }));
  const downloadFreeMp3 = vi.fn(() => of({ url: 'https://example.com/file.mp3' }));

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PlayerComponent],
      providers: [
        provideRouter([]),
        { provide: PlayerService, useValue: playerService },
        { provide: VisualizerService, useValue: { drawWaveform } },
        { provide: AuthService, useValue: { requireAuth } },
        { provide: ModalService, useValue: { open } },
        {
          provide: AnalyticsService,
          useValue: { trackPlay: vi.fn(() => of({})), toggleFavorite, downloadFreeMp3 },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('seeks, adjusts volume, and opens license modal through auth gate', () => {
    const stopPropagation = vi.fn();
    const seekCanvas = {
      getBoundingClientRect: () => ({ left: 10, width: 100 }),
    } as any;
    (component as any).canvasRef = { nativeElement: seekCanvas };

    component.onSeek({ clientX: 60 } as any);
    expect(playerService.seekTo).toHaveBeenCalledWith(100);

    component.onSeekSlider({ target: { value: '0.5' } } as any);
    expect(playerService.seekTo).toHaveBeenCalledWith(100);

    component.onVolumeChange({ target: { value: '0.25' } } as any);
    expect(playerService.setVolume).toHaveBeenCalledWith(0.25);

    component.addToCart({ stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();
    expect(open).toHaveBeenCalled();

    playerService.currentTrack.set(null as any);
    component.addToCart({ stopPropagation } as any);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('toggles favorites and handles download flows', () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const stopPropagation = vi.fn();

    component.toggleFavorite({ stopPropagation } as any, track);
    expect(toggleFavorite).toHaveBeenCalledWith('s1');
    expect(track.analytics.isFavorited).toBe(true);
    expect(track.analytics.favoriteCount).toBe(4);

    component.isFavoriting.set(true);
    component.toggleFavorite({ stopPropagation } as any, track);
    expect(toggleFavorite).toHaveBeenCalledTimes(1);
    component.isFavoriting.set(false);

    const noAnalyticsTrack: any = { id: 's2', title: 'No Analytics' };
    toggleFavorite.mockReturnValueOnce(of({ is_favorited: true }));
    component.toggleFavorite({ stopPropagation } as any, noAnalyticsTrack);
    expect(noAnalyticsTrack.analytics.favoriteCount).toBe(1);

    toggleFavorite.mockReturnValueOnce(of({ is_favorited: false }));
    component.toggleFavorite({ stopPropagation } as any, noAnalyticsTrack);
    expect(noAnalyticsTrack.analytics.favoriteCount).toBe(0);

    toggleFavorite.mockReturnValueOnce(throwError(() => new Error('fail')));
    component.toggleFavorite({ stopPropagation } as any, track);
    expect(logSpy).toHaveBeenCalled();

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    component.downloadFreeMp3({ stopPropagation } as any, track);
    expect(openSpy).toHaveBeenCalledWith('https://example.com/file.mp3', '_blank');

    downloadFreeMp3.mockReturnValueOnce(of({}));
    component.downloadFreeMp3({ stopPropagation } as any, track);
    expect(logSpy).toHaveBeenCalled();

    downloadFreeMp3.mockReturnValueOnce(throwError(() => new Error('x')));
    component.downloadFreeMp3({ stopPropagation } as any, track);
    expect(logSpy).toHaveBeenCalled();
  });

  it('draws waveform and cleans up animation frame', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const ctx = {} as any;
    const canvas = {
      width: 100,
      height: 20,
      getContext: () => ctx,
      getBoundingClientRect: () => ({ width: 100, height: 20 }),
    } as any;
    (component as any).canvasRef = { nativeElement: canvas };

    (component as any).drawWaveform();
    expect(drawWaveform).toHaveBeenCalled();

    (component as any).animationId = 1;
    component.ngOnDestroy();
    expect(cancelSpy).toHaveBeenCalledWith(1);

    (component as any).animationId = null;
    component.ngOnDestroy();
  });
});
