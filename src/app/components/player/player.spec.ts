import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PlayerService } from '../../services/player.service';
import { AuthService } from '../../services/auth.service';
import { ModalService } from '../../services/modal.service';
import { AnalyticsService } from '../../services/analytics.service';
import { LabService } from '../../services/lab';
import { ToastService } from '../../services/toast.service';
import { PlayerComponent } from './player';

describe('PlayerComponent', () => {
  let fixture: ComponentFixture<PlayerComponent>;
  let component: PlayerComponent;

  const track: any = {
    id: 's1',
    producerId: 'p1',
    producerName: 'Blaze',
    title: 'Song',
    imageUrl: 'x.jpg',
    bpm: 120,
    key: 'A MINOR',
    price: 1000,
    duration: 200,
    genres: [{ id: 'g1', name: 'Trap', slug: 'trap' }],
    tags: ['dark'],
    licenses: [
      {
        id: 'l1',
        name: 'Basic Lease',
        type: 'Basic',
        price: 1000,
        features: [],
        fileTypes: ['mp3'],
      },
    ],
    freeMp3Enabled: true,
    analytics: { isFavorited: false, favoriteCount: 1, playCount: 0, totalDownloadCount: 0 },
  };

  const playerService = {
    isVisible: signal(true),
    isExpanded: signal(false),
    currentTrack: signal(track),
    duration: signal(200),
    currentTime: signal(50),
    isPlaying: signal(false),
    volume: signal(0.5),
    queue: signal([track]),
    queueIndex: signal(0),
    shuffleEnabled: signal(false),
    repeatEnabled: signal(false),
    playbackRate: signal(1),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    showPlayer: vi.fn(),
    hidePlayer: vi.fn(),
    togglePlay: vi.fn(),
    setExpanded: vi.fn((expanded: boolean) => playerService.isExpanded.set(expanded)),
    toggleMute: vi.fn(),
    toggleShuffle: vi.fn(),
    toggleRepeat: vi.fn(),
    playPrevious: vi.fn(),
    playNext: vi.fn(),
    playTrackAt: vi.fn(),
    clearQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    setPlaybackRate: vi.fn(),
    hasPrevious: vi.fn(() => true),
    hasNext: vi.fn(() => true),
    volumeIcon: vi.fn(() => 'fa-volume-high'),
    currentTimeFormatted: vi.fn(() => '0:50'),
    durationFormatted: vi.fn(() => '3:20'),
    getWaveformData: vi.fn(() => new Uint8Array([32, 64, 128, 255])),
  };
  const requireAuth = vi.fn((cb) => cb());
  const open = vi.fn();
  const success = vi.fn();
  const info = vi.fn();
  const toggleFavorite = vi.fn(() => of({ is_favorited: true, total_count: 4 }));
  const downloadFreeMp3 = vi.fn(() => of({ url: 'https://example.com/file.mp3' }));
  const getSpecById = vi.fn(() => of(track));

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PlayerComponent],
      providers: [
        provideRouter([]),
        { provide: PlayerService, useValue: playerService },
        { provide: AuthService, useValue: { requireAuth } },
        { provide: ModalService, useValue: { open } },
        { provide: ToastService, useValue: { success, info } },
        { provide: LabService, useValue: { getSpecById } },
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
    const seekRail = {
      getBoundingClientRect: () => ({ left: 10, width: 100 }),
    } as any;

    component.onSeek({ clientX: 60, currentTarget: seekRail } as any);
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
    playerService.currentTrack.set(track);
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

    const noAnalyticsTrack: any = { ...track, id: 's2', analytics: undefined };
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

  it('marks played waveform bars and supports local player interactions', () => {
    expect(component.isBarPlayed(0)).toBe(true);
    expect(component.isBarPlayed(59)).toBe(false);

    component.setPlaybackRate(1.25);
    expect(playerService.setPlaybackRate).toHaveBeenCalledWith(1.25);

    component.notifyApiNeeded('Playlist API needed');
    expect(info).toHaveBeenCalledWith('Playlist API needed');

    component.ngOnDestroy();
  });

  it('opens and dismisses the expanded mobile player', () => {
    vi.useFakeTimers();
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });

    const preventDefault = vi.fn();
    component.openMobilePlayer({
      target: document.createElement('div'),
      preventDefault,
    } as any);
    expect(playerService.setExpanded).toHaveBeenCalledWith(true);

    component.onMobileHandlePointerDown({
      clientY: 100,
      preventDefault,
      stopPropagation: vi.fn(),
    } as any);
    component.handleMobileSheetPointerMove({
      clientY: 210,
      preventDefault,
    } as any);
    expect(component.mobileSheetOffset()).toBe(110);

    component.handleMobileSheetPointerUp();
    expect(component.isMobileSheetClosing()).toBe(true);
    vi.advanceTimersByTime(340);
    expect(playerService.setExpanded).toHaveBeenCalledWith(false);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
    vi.useRealTimers();
  });
});
