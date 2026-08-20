import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';
import { LabService } from '../../services/lab';
import { ModalService } from '../../services/modal.service';
import { PlayerService } from '../../services/player.service';
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

  it('wraps the persistent player in the Flame Wrap effect', () => {
    const player = (fixture.nativeElement as HTMLElement).querySelector('.mini-player');

    expect(player?.querySelector('app-flame-wrap-effect .flame-output')).toBeTruthy();
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

  it('covers player presentation helpers and menu state', () => {
    playerService.currentTrack.set(track);
    playerService.duration.set(200);
    playerService.currentTime.set(50);
    expect(component.progress()).toBe(0.25);

    playerService.duration.set(0);
    expect(component.progress()).toBe(0);
    playerService.duration.set(200);

    expect(component.queueItems()).toEqual([{ track, index: 0, isActive: true }]);
    expect(component.displayGenres()).toEqual(track.genres);
    expect(component.detailTags()).toEqual(['dark', 'Free MP3']);
    expect(component.minimumLicensePrice()).toBe(1000);
    expect(component.minimumLicensePriceLabel()).toContain('1,000');

    const cheaperTrack: any = {
      ...track,
      licenses: [
        { ...track.licenses[0], price: 40 },
        { ...track.licenses[0], id: 'l2', price: 15 },
      ],
    };
    component.expandedTrackDetail.set(cheaperTrack);
    expect(component.minimumLicensePrice()).toBe(15);
    expect(component.minimumLicensePriceLabel()).toContain('15');

    component.expandedTrackDetail.set(null);
    playerService.currentTrack.set(null as any);
    expect(component.displayGenres()).toEqual([]);
    expect(component.detailTags()).toEqual([]);
    expect(component.minimumLicensePrice()).toBe(0);
    expect(component.minimumLicensePriceLabel()).toContain('0');
    playerService.currentTrack.set(track);

    expect(component.formatDuration()).toBe('0:00');
    expect(component.formatDuration(Number.NaN)).toBe('0:00');
    expect(component.formatDuration(65)).toBe('1:05');
    expect(component.formatPanelKey()).toEqual({ root: '--', mode: '' });
    expect(component.formatPanelKey('F#m')).toEqual({ root: 'F#', mode: 'min' });
    expect(component.formatPanelKey('Db major')).toEqual({ root: 'DB', mode: 'maj' });
    expect(component.formatPanelKey('C minor')).toEqual({ root: 'C', mode: 'min' });
    expect(component.formatPanelKey('A lydian')).toEqual({ root: 'A', mode: 'lyd' });

    const stopPropagation = vi.fn();
    component.toggleMenu({ stopPropagation } as any);
    expect(component.isMenuOpen()).toBe(true);
    component.stopBubble({ stopPropagation } as any);
    component.handleDocumentClick();
    expect(component.isMenuOpen()).toBe(false);
    expect(stopPropagation).toHaveBeenCalledTimes(2);

    expect(component.mobileSheetTransform()).toBeNull();
    component.mobileSheetOffset.set(20);
    expect(component.mobileSheetTransform()).toBe('translateY(20px)');
  });

  it('navigates, copies, and shares the current beat', async () => {
    playerService.currentTrack.set({ ...track, id: '#fallback', shortCode: 'abc12345' });
    const navigateSpy = vi.spyOn(component.router, 'navigate').mockResolvedValue(true);
    const stopPropagation = vi.fn();

    component.isMenuOpen.set(true);
    component.openBeatPage({ stopPropagation } as any);
    expect(navigateSpy).toHaveBeenCalledWith(['/', 'abc12345']);
    expect(component.isMenuOpen()).toBe(false);

    component.isMenuOpen.set(true);
    component.openProducerProfile({ stopPropagation } as any);
    expect(navigateSpy).toHaveBeenCalledWith(['/@', 'blaze'], {
      queryParams: { id: 'p1' },
    });
    expect(component.isMenuOpen()).toBe(false);

    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const shareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share');
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });

    await component.copyBeatLink({ stopPropagation } as any);
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/abc12345$/));
    expect(success).toHaveBeenCalledWith('Beat link copied');

    await component.shareBeat({ stopPropagation } as any);
    expect(share).toHaveBeenCalledWith({
      title: 'Song',
      url: expect.stringMatching(/\/abc12345$/),
    });
    expect(success).toHaveBeenCalledWith('Shared successfully');

    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    await component.shareBeat();
    expect(writeText).toHaveBeenCalledTimes(2);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    await component.copyBeatLink();
    expect(info).toHaveBeenCalledWith('Clipboard support is unavailable here');

    if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    else delete (navigator as any).clipboard;
    if (shareDescriptor) Object.defineProperty(navigator, 'share', shareDescriptor);
    else delete (navigator as any).share;

    playerService.currentTrack.set(null as any);
    component.openBeatPage();
    component.openProducerProfile();
    await component.copyBeatLink();
    await component.shareBeat();
    expect(stopPropagation).toHaveBeenCalledTimes(4);
  });
});
