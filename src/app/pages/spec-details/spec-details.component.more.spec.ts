import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';
import {
  AnalyticsService,
  CartService,
  LabService,
  PlayerService,
  ToastService,
} from '../../services';
import { SpecActionService } from '../../services/spec-action.service';
import { SpecDetailsComponent } from './spec-details.component';

function makeSpec(over: any = {}): any {
  return {
    id: 'beat-1',
    shortCode: 'abc',
    producerId: 'p1',
    producerName: 'Prod',
    title: 'Night Drive Remix',
    bpm: 140,
    key: 'C',
    price: 25,
    duration: 100,
    imageUrl: 'cover.jpg',
    genres: [{ id: 'g', name: 'Trap', slug: 'trap' }],
    tags: ['dark', 'club'],
    moods: ['dark', 'sad'],
    instruments: ['piano'],
    licenses: [
      { id: 'l1', type: 'Basic', name: 'Basic', price: 29, features: ['MP3'], fileTypes: ['mp3'] },
      {
        id: 'l2',
        type: 'Premium',
        name: 'Premium',
        price: 79,
        features: ['WAV', 'Stems pack'],
        fileTypes: ['WAV'],
      },
    ],
    analytics: { playCount: 5, favoriteCount: 2, totalDownloadCount: 0, isFavorited: false },
    ...over,
  };
}

describe('SpecDetailsComponent (extended)', () => {
  let params$: BehaviorSubject<any>;
  let labMock: any;
  let player: any;
  let toast: any;
  let cart: any;
  let analytics: any;

  async function setup(spec: any = makeSpec(), related: any[] = []) {
    params$ = new BehaviorSubject(convertToParamMap({ id: 'beat-1' }));
    labMock = {
      getSpecById: vi.fn().mockReturnValue(spec === 'never' ? NEVER : of(spec)),
      getSpecs: vi.fn().mockReturnValue(of(related)),
    };
    player = {
      showPlayer: vi.fn(),
      seekTo: vi.fn(),
      currentTrack: signal<any>(null),
      currentTime: signal(0),
      duration: signal(0),
    };
    toast = { success: vi.fn(), info: vi.fn() };
    cart = { addItem: vi.fn() };
    analytics = {
      trackPlay: vi.fn().mockReturnValue(of({})),
      toggleFavorite: vi.fn().mockReturnValue(of({ is_favorited: true })),
      downloadFreeMp3: vi.fn().mockReturnValue(of({})),
    };
    await TestBed.configureTestingModule({
      imports: [SpecDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: params$ } },
        { provide: LabService, useValue: labMock },
        { provide: PlayerService, useValue: player },
        { provide: CartService, useValue: cart },
        { provide: ToastService, useValue: toast },
        { provide: AnalyticsService, useValue: analytics },
        { provide: SpecActionService, useValue: {
            isCurrentlyPlaying: () => false,
            syncFavorite: () => ({ unsubscribe: () => undefined }),
            formatDuration: () => '0:00',
          } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SpecDetailsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance as any };
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows loading state while spec is pending and missing state on error', async () => {
    const { component } = await setup('never');
    expect(component.isSpecLoading()).toBe(true);
    expect(component.isSpecMissing()).toBe(false);
  });

  it('settles as missing when lookup errors and uses shortCode param', async () => {
    TestBed.resetTestingModule();
    const { component } = await setup();
    labMock.getSpecById.mockReturnValue(throwError(() => new Error('404')));
    params$.next(convertToParamMap({ shortCode: 'zzz' }));
    expect(labMock.getSpecById).toHaveBeenLastCalledWith('zzz');
    TestBed.tick();
    expect(component.spec()).toBeUndefined();
    expect(component.isSpecMissing()).toBe(true);
    expect(component.selectedLicense()).toBeNull();
    expect(component.waveformBars()).toEqual([]);
    expect(component.displayTags()).toEqual([]);
    expect(component.includedItems()).toEqual([]);
    expect(component.producerStats()).toEqual({ beatCount: 0, plays: 0, likes: 0 });
    expect(component.relatedDisplaySpecs()).toEqual([]);
    expect(component.primaryGenre()).toBe('Beat');
    expect(component.displayPrice()).toBe(0);
    expect(component.producerImageUrl()).toBe('');
  });

  it('falls back to empty id when no params are present', async () => {
    const { component } = await setup();
    params$.next(convertToParamMap({}));
    expect(labMock.getSpecById).toHaveBeenLastCalledWith('');
    expect(component.spec()).toBeTruthy();
  });

  it('reloads on route param change and keeps a still-valid license', async () => {
    const { component } = await setup();
    component.selectLicense(component.spec().licenses[1]);
    params$.next(convertToParamMap({ id: 'beat-2' }));
    expect(labMock.getSpecById).toHaveBeenLastCalledWith('beat-2');
    expect(component.selectedLicense().id).toBe('l2');
  });

  it('computes derived data: tags, producer specs, stats, related and price', async () => {
    const other = makeSpec({ id: 'beat-2', analytics: { playCount: 10, favoriteCount: 4 } });
    const noAnalytics = makeSpec({ id: 'beat-3', analytics: undefined });
    const foreign = makeSpec({ id: 'beat-4', producerId: 'p2' });
    const { component } = await setup(makeSpec(), [
      other,
      noAnalytics,
      foreign,
      makeSpec(),
    ]);

    expect(component.displayTags()).toEqual(['dark', 'sad', 'club', 'piano']);
    expect(component.producerSpecs().map((s: any) => s.id)).toEqual(['beat-2', 'beat-3']);
    expect(component.producerStats()).toEqual({ beatCount: 4, plays: 20, likes: 8 });
    expect(component.relatedDisplaySpecs().map((s: any) => s.id)).toEqual([
      'beat-2',
      'beat-3',
      'beat-4',
    ]);
    expect(component.primaryGenre()).toBe('Trap');
    expect(component.displayPrice()).toBe(29);
    component.selectedLicense.set(null);
    expect(component.displayPrice()).toBe(25);
    expect(component.displayPriceMoney()).toBeUndefined();
    const money = { amount_minor: 100, currency: 'USD' };
    component.selectedLicense.set({ ...makeSpec().licenses[0], displayPriceMoney: money });
    expect(component.displayPriceMoney()).toBe(money);
  });

  it('producerSpecs is empty before related specs are available', async () => {
    const { component } = await setup();
    expect(component.producerSpecs()).toEqual([]);
  });

  it('builds included items for different licenses', async () => {
    const { component } = await setup(makeSpec({ freeMp3Enabled: false }));
    component.selectedLicense.set(null);
    let items = component.includedItems();
    expect(items.map((i: any) => i.active)).toEqual([false, false, false, false]);
    expect(items[0].meta).toBe('Available on higher tiers');
    expect(items[3].meta).toBe('Issued at checkout');

    component.selectedLicense.set(makeSpec().licenses[1]);
    items = component.includedItems();
    expect(items[0].active).toBe(true);
    expect(items[0].meta).toContain('44.1kHz');
    expect(items[1].active).toBe(true);
    expect(items[1].meta).toBe('Separated files included');
    expect(items[2].active).toBe(false);
    expect(items[3].meta).toBe('Premium license attached');

    for (const t of ['trackout', 'trackouts', 'stem', 'stems']) {
      component.selectedLicense.set({ ...makeSpec().licenses[0], features: [], fileTypes: [t] });
      expect(component.includedItems()[1].active).toBe(true);
    }
    component.selectedLicense.set({
      ...makeSpec().licenses[0],
      features: [],
      fileTypes: undefined,
    });
    expect(component.includedItems()[1].active).toBe(false);
  });

  it('includedItems marks mp3 active when free mp3 enabled', async () => {
    const { component } = await setup(makeSpec({ freeMp3Enabled: true }));
    component.selectedLicense.set(null);
    expect(component.includedItems()[2].active).toBe(true);
  });

  it('license variants, subtitles, labels and rows', async () => {
    const { component } = await setup();
    const lic = (name: string, type = 'Basic', extra: any = {}) => ({
      id: name,
      name,
      type,
      price: 1,
      features: ['A'],
      fileTypes: [],
      ...extra,
    });
    expect(component.getLicenseVariant(lic('Exclusive'), 0, 3)).toBe('exclusive');
    expect(component.getLicenseVariant(lic('Gold'), 3, 4)).toBe('exclusive');
    expect(component.getLicenseVariant(lic('Gold'), 3, 3)).toBe('standard');
    expect(component.getLicenseVariant(lic('Premium'), 0, 3)).toBe('popular');
    expect(component.getLicenseVariant(lic('Gold'), 1, 3)).toBe('popular');
    expect(component.getLicenseVariant(lic('Gold'), 0, 3)).toBe('standard');

    expect(component.getLicenseSubtitle(lic('Exclusive'), 0, 3)).toBe(
      'the whole beat, yours alone',
    );
    expect(component.getLicenseSubtitle(lic('Premium'), 1, 3)).toBe('for proper releases');
    expect(component.getLicenseSubtitle(lic('Gold'), 0, 3)).toBe('for demos and ideas');
    expect(component.getLicenseSubtitle(lic('Gold'), 2, 3)).toBe('for bigger placements');

    expect(component.getLicenseButtonLabel(lic('Exclusive'), 0, 3)).toBe('Buy Exclusive');
    expect(component.getLicenseButtonLabel(lic('Gold'), 0, 3)).toBe('Buy Gold');

    const fmt = (fileTypes: string[] | undefined, extra: any = {}) =>
      component.getLicenseFormatLabel(lic('Gold', 'Basic', { fileTypes, ...extra }));
    expect(fmt(['mp3', 'wav', 'stems'])).toBe('MP3 + WAV + Stems');
    expect(fmt(['wav', 'trackout'])).toBe('WAV + Stems');
    expect(fmt([' MP3 ', 'wav'])).toBe('MP3 + WAV');
    expect(fmt(['stem'])).toBe('Stems');
    expect(fmt([], { features: ['includes trackouts'] })).toBe('Stems');
    expect(fmt(['wav'])).toBe('WAV');
    expect(fmt(['mp3'])).toBe('MP3');
    expect(fmt(undefined, { features: undefined, type: 'Trackout', name: 'Gold' })).toBe(
      'Stems',
    );
    expect(fmt([], { type: 'Lease' })).toBe('Lease');
    expect(component.getLicenseFormatLabel(lic('Unlimited', 'Lease'))).toBe('Stems');

    const rowsStd = component.getLicenseFeatureRows(lic('Gold'), 0, 3);
    expect(rowsStd).toHaveLength(3);
    expect(rowsStd[1]).toEqual({ text: 'WAV or stems', muted: true });
    const rowsPop = component.getLicenseFeatureRows(lic('Premium'), 1, 3);
    expect(rowsPop.map((r: any) => r.text)).toContain('Royalty split included');
    const rowsEx = component.getLicenseFeatureRows(lic('Exclusive'), 2, 3);
    expect(rowsEx.map((r: any) => r.text)).toContain('Beat removed from store');
    const rowsOther = component.getLicenseFeatureRows(lic('Gold'), 2, 3);
    expect(rowsOther.map((r: any) => r.text)).toContain('Worldwide digital distribution');
    const many = lic('Gold', 'Basic', { features: ['1', '2', '3', '4', '5', '6', '7'] });
    expect(component.getLicenseFeatureRows(many, 2, 3)).toHaveLength(6);
  });

  it('updates sticky buy state on window scroll', async () => {
    const { component } = await setup();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 700 });
    component.onWindowScroll();
    expect(component.stickyBuyVisible()).toBe(true);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    component.onWindowScroll();
    expect(component.stickyBuyVisible()).toBe(false);
  });

  it('scrolls to sections when present and ignores missing ones', async () => {
    const { component } = await setup();
    const scrollIntoView = vi.fn();
    const lic = document.createElement('div');
    const faq = document.createElement('div');
    lic.scrollIntoView = scrollIntoView;
    faq.scrollIntoView = scrollIntoView;
    const byId = vi
      .spyOn(document, 'getElementById')
      .mockImplementation((id) => (id === 'licenses' ? lic : id === 'faq' ? faq : null));

    component.scrollToLicenses();
    component.scrollToFaq();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    byId.mockReturnValue(null);
    expect(() => component.scrollToLicenses()).not.toThrow();
    expect(() => component.scrollToFaq()).not.toThrow();
  });

  it('handles comment sorting, drafting, posting and liking', async () => {
    const { component } = await setup();
    component.setCommentSort('newest');
    expect(component.commentSort()).toBe('newest');
    expect(toast.info).toHaveBeenCalledWith('Sorted by newest');
    component.setCommentSort('top');
    expect(toast.info).toHaveBeenCalledWith('Sorted by top');

    const textarea = document.createElement('textarea');
    textarea.value = '  hello world  ';
    component.updateCommentDraft({ target: textarea } as any);
    expect(component.commentDraft()).toBe('  hello world  ');
    expect(textarea.style.height).toBe(`${textarea.scrollHeight}px`);

    const before = component.comments().length;
    component.postComment();
    expect(component.comments().length).toBe(before + 1);
    expect(component.comments()[0].text).toBe('hello world');
    expect(component.comments()[0].name).toBe('You');
    expect(component.commentDraft()).toBe('');
    expect(toast.success).toHaveBeenCalledWith('Comment posted');

    component.commentDraft.set('   ');
    component.postComment();
    expect(component.comments().length).toBe(before + 1);

    component.toggleCommentLike(1);
    expect(component.comments().find((c: any) => c.id === 1)).toMatchObject({
      liked: true,
      likes: 25,
    });
    component.toggleCommentLike(1);
    expect(component.comments().find((c: any) => c.id === 1)).toMatchObject({
      liked: false,
      likes: 24,
    });
    expect(component.comments().find((c: any) => c.id === 2).likes).toBe(9);
  });

  it('shows reference notice toast', async () => {
    const { component } = await setup();
    component.showReferenceNotice('hi');
    expect(toast.info).toHaveBeenCalledWith('hi');
  });

  it('playSpec does nothing without a spec', async () => {
    const { component } = await setup();
    params$.next(convertToParamMap({ id: 'x' }));
    labMock.getSpecById.mockReturnValue(of(undefined));
    params$.next(convertToParamMap({ id: 'y' }));
    component.playSpec();
    expect(player.showPlayer).not.toHaveBeenCalled();
  });

  it('computes waveform progress for the active track', async () => {
    const { component } = await setup();
    expect(component.waveformProgress()).toBe(0);
    expect(component.waveformCurrentTime()).toBe(0);
    expect(component.waveformDuration()).toBe(100);

    player.currentTrack.set(component.spec());
    player.currentTime.set(25);
    expect(component.waveformProgress()).toBe(0.25);
    expect(component.waveformCurrentTime()).toBe(25);
    expect(component.waveformPlayheadIndex()).toBe(16);

    player.duration.set(50);
    expect(component.waveformDuration()).toBe(50);
    expect(component.waveformProgress()).toBe(0.5);

    player.currentTime.set(500);
    expect(component.waveformProgress()).toBe(1);

    player.duration.set(0);
    params$.next(convertToParamMap({ id: 'beat-1' }));
    labMock.getSpecById.mockReturnValue(of(makeSpec({ duration: undefined })));
    params$.next(convertToParamMap({ id: 'beat-9' }));
    player.currentTrack.set(component.spec());
    expect(component.waveformProgress()).toBe(0);
    expect(component.waveformDuration()).toBe(0);
  });

  it('waveform progress/duration are zero when there is no spec', async () => {
    const { component } = await setup();
    labMock.getSpecById.mockReturnValue(of(undefined));
    params$.next(convertToParamMap({ id: 'none' }));
    expect(component.waveformProgress()).toBe(0);
    expect(component.waveformCurrentTime()).toBe(0);
    expect(component.waveformDuration()).toBe(0);
  });

  it('waveform helpers tolerate player service without signals', async () => {
    const { component } = await setup();
    player.currentTrack = undefined;
    player.currentTime = undefined;
    player.duration = undefined;
    expect(component.getActivePlayerTrack()).toBeNull();
    expect(component.getPlayerCurrentTime()).toBe(0);
    expect(component.getPlayerDuration()).toBe(0);
  });

  it('seekWaveform plays when rail has no width, track is inactive, or seeks when active', async () => {
    const { component } = await setup();
    const rail = (width: number) =>
      ({ getBoundingClientRect: () => ({ left: 10, width }) }) as unknown as HTMLElement;

    component.seekWaveform({ clientX: 50, currentTarget: rail(0) } as any);
    component.seekWaveform({ clientX: 50, currentTarget: null } as any);
    expect(player.showPlayer).toHaveBeenCalledTimes(2);

    component.seekWaveform({ clientX: 50, currentTarget: rail(100) } as any);
    expect(player.showPlayer).toHaveBeenCalledTimes(3);
    expect(player.seekTo).not.toHaveBeenCalled();

    player.currentTrack.set(component.spec());
    component.seekWaveform({ clientX: 60, currentTarget: rail(100) } as any);
    expect(player.seekTo).toHaveBeenCalledWith(50);

    player.duration.set(200);
    component.seekWaveform({ clientX: 5000, currentTarget: rail(100) } as any);
    expect(player.seekTo).toHaveBeenLastCalledWith(200);
    component.seekWaveform({ clientX: -100, currentTarget: rail(100) } as any);
    expect(player.seekTo).toHaveBeenLastCalledWith(0);
  });

  it('seekWaveform does not seek when duration is unknown and ignores missing spec', async () => {
    const { component } = await setup(makeSpec({ duration: undefined }));
    player.currentTrack.set(component.spec());
    const el = { getBoundingClientRect: () => ({ left: 0, width: 100 }) } as any;
    component.seekWaveform({ clientX: 50, currentTarget: el } as any);
    expect(player.seekTo).not.toHaveBeenCalled();

    labMock.getSpecById.mockReturnValue(of(undefined));
    params$.next(convertToParamMap({ id: 'gone' }));
    component.seekWaveform({ clientX: 50, currentTarget: el } as any);
    expect(player.showPlayer).not.toHaveBeenCalled();
  });

  it('addLicenseToCart selects the license, adds it and toasts', async () => {
    const { component } = await setup();
    const license = component.spec().licenses[1];
    component.addLicenseToCart(license);
    expect(component.selectedLicense()).toBe(license);
    expect(cart.addItem).toHaveBeenCalledWith(component.spec(), license);
    expect(toast.success).toHaveBeenCalledWith('Added Night Drive Remix (Premium) to cart');
  });

  it('toggleFavorite ignores missing spec and in-flight requests', async () => {
    const { component } = await setup();
    component.isFavoriting.set(true);
    component.toggleFavorite();
    expect(analytics.toggleFavorite).not.toHaveBeenCalled();
    component.isFavoriting.set(false);

    analytics.toggleFavorite.mockReturnValue(NEVER);
    component.toggleFavorite();
    expect(component.isFavoriting()).toBe(true);
    component.toggleFavorite();
    expect(analytics.toggleFavorite).toHaveBeenCalledTimes(1);
  });

  it('toggleFavorite handles specs without analytics', async () => {
    const { component } = await setup(makeSpec({ analytics: undefined }));
    component.toggleFavorite();
    expect(component.isFavoriting()).toBe(false);
    expect(component.spec().analytics).toBeUndefined();
  });

  it('toggleFavorite never lets the count go below zero', async () => {
    const { component } = await setup();
    component.spec().analytics.favoriteCount = 0;
    analytics.toggleFavorite.mockReturnValue(of({ is_favorited: false }));
    component.toggleFavorite();
    expect(component.spec().analytics.favoriteCount).toBe(0);
    expect(component.spec().analytics.isFavorited).toBe(false);
  });

  it('downloadFreeMp3 is a no-op without a spec', async () => {
    const { component } = await setup();
    labMock.getSpecById.mockReturnValue(of(undefined));
    params$.next(convertToParamMap({ id: 'gone' }));
    component.downloadFreeMp3();
    expect(analytics.downloadFreeMp3).not.toHaveBeenCalled();
  });

  it('copyBeatLink falls back to id without hash and handles missing clipboard / spec', async () => {
    const { component } = await setup(makeSpec({ shortCode: undefined, id: '#xyz' }));
    const desc = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await component.copyBeatLink();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/xyz`);

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    await component.copyBeatLink();
    expect(toast.info).toHaveBeenCalledWith('Clipboard support is unavailable here');

    if (desc) Object.defineProperty(navigator, 'clipboard', desc);
    else delete (navigator as any).clipboard;

    labMock.getSpecById.mockReturnValue(of(undefined));
    params$.next(convertToParamMap({ id: 'gone' }));
    toast.info.mockClear();
    await component.copyBeatLink();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('formats durations, counts and titles', async () => {
    const { component } = await setup();
    expect(component.formatDuration(NaN)).toBe('0:00');
    expect(component.formatDuration(-5)).toBe('0:00');
    expect(component.formatDuration(61.9)).toBe('1:01');
    expect(component.formatCompactCount(999)).toBe('999');
    expect(component.formatCompactCount(1500)).toBe('1.5k');
    expect(component.formatCompactCount(25000)).toBe('25k');
    expect(component.getStyledBeatTitle('  Night Drive Remix ')).toEqual({
      lead: 'Night',
      accent: 'Drive Remix',
    });
    expect(component.getStyledBeatTitle('   ')).toEqual({ lead: '', accent: '' });
  });

  it('builds waveform from valid peaks only, capped at 64, else deterministic fallback', async () => {
    const { component } = await setup();
    component.loadWaveformForSpec(
      makeSpec({ waveformPeaks: [10, NaN, Infinity, 20, ...Array(100).fill(30)] }),
    );
    expect(component.waveformBars()).toHaveLength(64);
    expect(component.waveformBars().slice(0, 2)).toEqual([10, 20]);

    component.loadWaveformForSpec(makeSpec({ waveformPeaks: [NaN] }));
    const fallback = component.waveformBars();
    expect(fallback).toHaveLength(64);
    expect(fallback.every((v: number) => v >= 12 && v <= 94)).toBe(true);
    component.loadWaveformForSpec(makeSpec());
    expect(component.waveformBars()).toEqual(fallback);
    component.loadWaveformForSpec(undefined);
    expect(component.waveformBars()).toEqual([]);
  });

  describe('mobile art palette', () => {
    const defaults = { deep: '#0c0c0c', mid: '#2a2926', accent: '#f0e9d6' };

    it('uses default palette without an image url', async () => {
      const { component } = await setup(makeSpec({ imageUrl: undefined }));
      expect(component.mobileArtPalette()).toEqual(defaults);
      component.updateMobileArtPalette(undefined);
      expect(component.mobileArtPalette()).toEqual(defaults);
    });

    it('extracts palette from a fetched image', async () => {
      const revoke = vi.fn();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) }),
      );
      (URL as any).createObjectURL = vi.fn(() => 'blob:abc');
      (URL as any).revokeObjectURL = revoke;
      class FakeImage {
        crossOrigin = '';
        onload: any;
        onerror: any;
        set src(_v: string) {
          queueMicrotask(() => this.onload());
        }
      }
      vi.stubGlobal('Image', FakeImage);
      const data = new Uint8ClampedArray(36 * 36 * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 200;
        data[i + 1] = 50;
        data[i + 2] = 20;
        data[i + 3] = 255;
      }
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: vi.fn(),
        getImageData: () => ({ data }),
      } as any);

      const { component } = await setup();
      await vi.waitFor(() => expect(component.mobileArtPalette().accent).toMatch(/^rgb\(/));
      expect(component.mobileArtPalette().accent).toBe('rgb(218, 62, 31)');
      expect(component.mobileArtPalette().deep).toBe('rgb(44, 11, 4)');
      expect(revoke).toHaveBeenCalledWith('blob:abc');
    });

    it('falls back to default palette when canvas context is unavailable', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
      const { component } = await setup();
      expect(component.extractPalette({} as any)).toEqual(defaults);
    });

    it('skips applying palette when the spec changed meanwhile', async () => {
      const { component } = await setup();
      vi.spyOn(component, 'loadPaletteImage').mockResolvedValue({
        image: {},
        cleanup: vi.fn(),
      });
      const extract = vi.spyOn(component, 'extractPalette');
      component.updateMobileArtPalette(makeSpec({ imageUrl: 'other.jpg' }));
      await Promise.resolve();
      await Promise.resolve();
      expect(extract).not.toHaveBeenCalled();
    });

    it('keeps fallback when the image fails to load', async () => {
      const { component } = await setup();
      vi.spyOn(component, 'loadPaletteImage').mockRejectedValue(new Error('x'));
      component.mobileArtPalette.set({ deep: 'a', mid: 'b', accent: 'c' });
      component.updateMobileArtPalette(component.spec());
      await vi.waitFor(() => expect(component.mobileArtPalette()).toEqual(defaults));

      // rejected for a different spec: untouched
      component.updateMobileArtPalette(makeSpec({ imageUrl: 'zzz.jpg' }));
      component.mobileArtPalette.set({ deep: 'a', mid: 'b', accent: 'c' });
      await new Promise((r) => setTimeout(r, 0));
      expect(component.mobileArtPalette().deep).toBe('a');
    });

    it('loadPaletteImage falls back to element loading on fetch failures or data urls', async () => {
      const { component } = await setup();
      const loadEl = vi.spyOn(component, 'loadImageElement').mockResolvedValue({} as any);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
      let res = await component.loadPaletteImage('http://x/y.jpg');
      expect(loadEl).toHaveBeenLastCalledWith('http://x/y.jpg', true);
      expect(res.cleanup()).toBeUndefined();

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('cors')));
      await component.loadPaletteImage('http://x/z.jpg');
      expect(loadEl).toHaveBeenLastCalledWith('http://x/z.jpg', true);

      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      res = await component.loadPaletteImage('data:image/png;base64,AAAA');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(loadEl).toHaveBeenLastCalledWith('data:image/png;base64,AAAA', true);
    });

    it('loadImageElement resolves, rejects, and honours cors flag', async () => {
      const { component } = await setup();
      const instances: any[] = [];
      class FakeImage {
        crossOrigin = '';
        onload: any;
        onerror: any;
        src = '';
        constructor() {
          instances.push(this);
        }
      }
      vi.stubGlobal('Image', FakeImage);

      const p1 = component.loadImageElement('a.jpg', true);
      instances[0].onload();
      await expect(p1).resolves.toBe(instances[0]);
      expect(instances[0].crossOrigin).toBe('anonymous');

      const p2 = component.loadImageElement('b.jpg', false);
      instances[1].onerror();
      await expect(p2).rejects.toThrow('Failed to load image');
      expect(instances[1].crossOrigin).toBe('');
    });

    it('rgbString clamps channel values', async () => {
      const { component } = await setup();
      expect(component.rgbString(-10, 300, 127.6)).toBe('rgb(0, 255, 128)');
    });
  });
});
