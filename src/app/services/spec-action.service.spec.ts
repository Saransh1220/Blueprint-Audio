import { ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { MusicalKey } from '../models/enums';
import type { Spec } from '../models/spec';
import { LicenseSelectorComponent } from '../components/license-selector/license-selector.component';
import { AnalyticsService, FavoriteChangeEvent } from './analytics.service';
import { AuthService } from './auth.service';
import { ModalService } from './modal.service';
import { PlayerService } from './player.service';
import { SpecActionService } from './spec-action.service';

describe('SpecActionService', () => {
  const makeSpec = (overrides?: Partial<Spec>): Spec =>
    ({
      id: 'spec-1',
      producerId: 'prod-1',
      producerName: 'Producer',
      type: 'beat',
      category: 'beat',
      imageUrl: 'cover.jpg',
      title: 'Track',
      bpm: 120,
      key: MusicalKey.C_MINOR,
      tags: [],
      price: 100,
      genres: [],
      licenses: [],
      processingStatus: 'completed',
      analytics: {
        playCount: 0,
        favoriteCount: 0,
        totalDownloadCount: 0,
        isFavorited: false,
      },
      ...overrides,
    }) as Spec;

  function setup() {
    const favoriteChanges$ = new Subject<FavoriteChangeEvent>();
    const currentTrack = signal<Spec | null>(null);
    const isPlaying = signal(false);

    const playerServiceMock = {
      currentTrack,
      isPlaying,
      togglePlay: vi.fn(),
      showPlayer: vi.fn(),
    };
    const modalServiceMock = {
      open: vi.fn(),
    };
    const routerMock = {
      navigate: vi.fn(),
    };
    const analyticsServiceMock = {
      favoriteChanges$: favoriteChanges$.asObservable(),
      trackPlay: vi.fn().mockReturnValue(of(void 0)),
      toggleFavorite: vi.fn(),
      downloadFreeMp3: vi.fn(),
    };
    const authServiceMock = {
      requireAuth: vi.fn((cb: () => void) => cb()),
    };

    TestBed.configureTestingModule({
      providers: [
        SpecActionService,
        { provide: PlayerService, useValue: playerServiceMock },
        { provide: ModalService, useValue: modalServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: AnalyticsService, useValue: analyticsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    return {
      service: TestBed.inject(SpecActionService),
      favoriteChanges$,
      playerServiceMock,
      modalServiceMock,
      routerMock,
      analyticsServiceMock,
      authServiceMock,
    };
  }

  it('playSong toggles when current track is same spec', () => {
    const { service, playerServiceMock } = setup();
    const spec = makeSpec({ id: 'same' });
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    playerServiceMock.currentTrack.set(spec);

    service.playSong(event, spec);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(playerServiceMock.togglePlay).toHaveBeenCalledTimes(1);
    expect(playerServiceMock.showPlayer).not.toHaveBeenCalled();
  });

  it('playSong shows player and tracks play for a different current track', () => {
    const { service, playerServiceMock, analyticsServiceMock } = setup();
    const spec = makeSpec({ id: 'new' });
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    analyticsServiceMock.trackPlay.mockReturnValue(of(void 0));

    service.playSong(event, spec);

    expect(playerServiceMock.showPlayer).toHaveBeenCalledWith(spec);
    expect(analyticsServiceMock.trackPlay).toHaveBeenCalledWith('new');
  });

  it('playSong logs error when trackPlay fails', () => {
    const { service, analyticsServiceMock } = setup();
    const spec = makeSpec();
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    analyticsServiceMock.trackPlay.mockReturnValue(throwError(() => new Error('fail')));

    service.playSong(event, spec);

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('addToCart requires auth and opens license selector modal', () => {
    const { service, authServiceMock, modalServiceMock } = setup();
    const spec = makeSpec();
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;

    service.addToCart(event, spec);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(authServiceMock.requireAuth).toHaveBeenCalledTimes(1);
    expect(modalServiceMock.open).toHaveBeenCalledWith(LicenseSelectorComponent, 'Select License', {
      spec,
    });
  });

  it('openDetails strips hash and navigates to beats detail route', () => {
    const { service, routerMock } = setup();

    service.openDetails(makeSpec({ id: '#abc' }));

    expect(routerMock.navigate).toHaveBeenCalledWith(['/beats', 'abc']);
  });

  it('toggleFavorite returns early when already favoriting', () => {
    const { service, authServiceMock, analyticsServiceMock } = setup();
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    const isFavoriting = signal(true);
    const cdr = { markForCheck: vi.fn() } as ChangeDetectorRef;

    service.toggleFavorite(event, makeSpec(), isFavoriting, cdr);

    expect(authServiceMock.requireAuth).toHaveBeenCalled();
    expect(analyticsServiceMock.toggleFavorite).not.toHaveBeenCalled();
  });

  it('toggleFavorite initializes analytics when missing and uses total_count when provided', () => {
    const { service, analyticsServiceMock } = setup();
    const spec = makeSpec({ analytics: undefined });
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    const isFavoriting = signal(false);
    const cdr = { markForCheck: vi.fn() } as ChangeDetectorRef;
    analyticsServiceMock.toggleFavorite.mockReturnValue(
      of({
        is_favorited: true,
        total_count: 12,
      }),
    );

    service.toggleFavorite(event, spec, isFavoriting, cdr);

    expect(spec.analytics).toBeTruthy();
    expect(spec.analytics?.isFavorited).toBe(true);
    expect(spec.analytics?.favoriteCount).toBe(12);
    expect(isFavoriting()).toBe(false);
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('toggleFavorite fallback increments/decrements count when total_count is absent', () => {
    const { service, analyticsServiceMock } = setup();
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    const cdr = { markForCheck: vi.fn() } as ChangeDetectorRef;

    const spec = makeSpec({
      analytics: {
        playCount: 0,
        favoriteCount: 2,
        totalDownloadCount: 0,
        isFavorited: false,
      },
    });
    analyticsServiceMock.toggleFavorite.mockReturnValueOnce(of({ is_favorited: true }));

    service.toggleFavorite(event, spec, signal(false), cdr);

    expect(spec.analytics?.favoriteCount).toBe(3);
    expect(spec.analytics?.isFavorited).toBe(true);

    analyticsServiceMock.toggleFavorite.mockReturnValueOnce(of({ is_favorited: false }));
    service.toggleFavorite(event, spec, signal(false), cdr);

    expect(spec.analytics?.favoriteCount).toBe(2);
    expect(spec.analytics?.isFavorited).toBe(false);
  });

  it('toggleFavorite handles errors and resets state', () => {
    const { service, analyticsServiceMock } = setup();
    const spec = makeSpec();
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    const isFavoriting = signal(false);
    const cdr = { markForCheck: vi.fn() } as ChangeDetectorRef;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    analyticsServiceMock.toggleFavorite.mockReturnValue(throwError(() => new Error('nope')));

    service.toggleFavorite(event, spec, isFavoriting, cdr);

    expect(errorSpy).toHaveBeenCalled();
    expect(isFavoriting()).toBe(false);
    expect(cdr.markForCheck).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('downloadFreeMp3 opens URL when response includes one', () => {
    const { service, analyticsServiceMock } = setup();
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    const spec = makeSpec({ id: 'dl-1' });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    analyticsServiceMock.downloadFreeMp3.mockReturnValue(
      of({ url: 'https://example.com/file.mp3' }),
    );

    service.downloadFreeMp3(event, spec);

    expect(analyticsServiceMock.downloadFreeMp3).toHaveBeenCalledWith('dl-1');
    expect(openSpy).toHaveBeenCalledWith('https://example.com/file.mp3', '_blank');
    openSpy.mockRestore();
  });

  it('downloadFreeMp3 logs when URL missing and when request errors', () => {
    const { service, analyticsServiceMock } = setup();
    const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;
    const spec = makeSpec();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    analyticsServiceMock.downloadFreeMp3.mockReturnValueOnce(of({}));
    service.downloadFreeMp3(event, spec);

    analyticsServiceMock.downloadFreeMp3.mockReturnValueOnce(
      throwError(() => new Error('download fail')),
    );
    service.downloadFreeMp3(event, spec);

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('syncFavorite updates matching spec and marks for check only on meaningful change', () => {
    const { service, favoriteChanges$ } = setup();
    const spec = makeSpec({
      id: 'sync-1',
      analytics: {
        playCount: 0,
        favoriteCount: 1,
        totalDownloadCount: 0,
        isFavorited: false,
      },
    });
    const cdr = { markForCheck: vi.fn() } as ChangeDetectorRef;

    const sub = service.syncFavorite(spec, cdr);

    favoriteChanges$.next({ specId: 'other', isFavorited: true, totalCount: 10 });
    expect(cdr.markForCheck).not.toHaveBeenCalled();

    favoriteChanges$.next({ specId: 'sync-1', isFavorited: false, totalCount: 1 });
    expect(cdr.markForCheck).not.toHaveBeenCalled();

    favoriteChanges$.next({ specId: 'sync-1', isFavorited: true, totalCount: 5 });
    expect(spec.analytics?.isFavorited).toBe(true);
    expect(spec.analytics?.favoriteCount).toBe(5);
    expect(cdr.markForCheck).toHaveBeenCalledTimes(1);

    sub.unsubscribe();
  });

  it('syncFavorite initializes analytics when missing', () => {
    const { service, favoriteChanges$ } = setup();
    const spec = makeSpec({ id: 'missing-analytics', analytics: undefined });
    const cdr = { markForCheck: vi.fn() } as ChangeDetectorRef;

    const sub = service.syncFavorite(spec, cdr);
    favoriteChanges$.next({ specId: 'missing-analytics', isFavorited: true, totalCount: 9 });

    expect(spec.analytics).toBeTruthy();
    expect(spec.analytics?.favoriteCount).toBe(9);
    expect(spec.analytics?.isFavorited).toBe(true);
    expect(cdr.markForCheck).toHaveBeenCalled();

    sub.unsubscribe();
  });

  it('formatDuration returns mm:ss and isCurrentlyPlaying checks track and state', () => {
    const { service, playerServiceMock } = setup();
    const spec = makeSpec({ id: 'p1' });

    expect(service.formatDuration(5)).toBe('0:05');
    expect(service.formatDuration(125)).toBe('2:05');

    playerServiceMock.currentTrack.set(makeSpec({ id: 'p1' }));
    playerServiceMock.isPlaying.set(true);
    expect(service.isCurrentlyPlaying(spec)).toBe(true);

    playerServiceMock.isPlaying.set(false);
    expect(service.isCurrentlyPlaying(spec)).toBe(false);
  });
});
