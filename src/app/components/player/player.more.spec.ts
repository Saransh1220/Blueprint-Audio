import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency.service';
import { LabService } from '../../services/lab';
import { ModalService } from '../../services/modal.service';
import { PlayerService } from '../../services/player.service';
import { ToastService } from '../../services/toast.service';
import { PlayerComponent } from './player';

function makeTrack(over: any = {}): any {
  return {
    id: 's1',
    producerId: 'p1',
    producerName: 'Blaze',
    title: 'Song',
    imageUrl: 'x.jpg',
    price: 10,
    genres: [],
    tags: ['a', 'b', 'c', 'd'],
    licenses: [],
    ...over,
  };
}

describe('PlayerComponent (extended)', () => {
  let ps: any;
  let lab: any;
  let toast: any;
  let rafCallbacks: Array<() => void>;

  async function setup(initial: any = makeTrack()) {
    ps = {
      isVisible: signal(true),
      isExpanded: signal(false),
      currentTrack: signal(initial),
      duration: signal(100),
      currentTime: signal(0),
      isPlaying: signal(false),
      queue: signal([]),
      queueIndex: signal(0),
      volume: signal(0.5),
      shuffleEnabled: signal(false),
      repeatEnabled: signal(false),
      playbackRate: signal(1),
      showPlayer: vi.fn(),
      hidePlayer: vi.fn(),
      togglePlay: vi.fn(),
      toggleMute: vi.fn(),
      toggleShuffle: vi.fn(),
      toggleRepeat: vi.fn(),
      playPrevious: vi.fn(),
      playNext: vi.fn(),
      playTrackAt: vi.fn(),
      clearQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      hasPrevious: vi.fn(() => true),
      hasNext: vi.fn(() => true),
      volumeIcon: vi.fn(() => 'fa-volume-high'),
      currentTimeFormatted: vi.fn(() => '0:50'),
      durationFormatted: vi.fn(() => '3:20'),
      seekTo: vi.fn(),
      setVolume: vi.fn(),
      setExpanded: vi.fn((v: boolean) => ps.isExpanded.set(v)),
      setPlaybackRate: vi.fn(),
      getWaveformData: vi.fn(() => new Uint8Array([0, 255])),
    };
    lab = { getSpecById: vi.fn(() => of(makeTrack({ title: 'Detailed' }))) };
    toast = { success: vi.fn(), info: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PlayerComponent],
      providers: [
        provideRouter([]),
        { provide: PlayerService, useValue: ps },
        { provide: AuthService, useValue: { requireAuth: (cb: any) => cb() } },
        { provide: ModalService, useValue: { open: vi.fn() } },
        { provide: ToastService, useValue: toast },
        { provide: LabService, useValue: lab },
        { provide: AnalyticsService, useValue: {} },
        {
          provide: CurrencyService,
          useValue: { formatMoney: (m: any, p: number) => `$${m ? m.amount_minor : p}` },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PlayerComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance as any };
  }

  function mockMatchMedia(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches }),
    });
  }

  function flushRaf() {
    for (let i = 0; i < 5; i++) {
      const cbs = rafCallbacks.splice(0);
      if (!cbs.length) break;
      cbs.forEach((cb) => cb());
    }
  }

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: () => void) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('activates the dock after two animation frames when first shown', async () => {
    const { component } = await setup();
    expect(component.displayTrack()).toEqual(ps.currentTrack());
    expect(component.isDockActive()).toBe(false);
    flushRaf();
    expect(component.isDockActive()).toBe(true);
  });

  it('does not activate the dock if hidden before frames elapse', async () => {
    const { component } = await setup();
    ps.isVisible.set(false);
    flushRaf();
    expect(component.isDockActive()).toBe(false);
  });

  it('keeps dock active when the track changes while visible', async () => {
    const { component, fixture } = await setup();
    ps.currentTrack.set(makeTrack({ id: 's2', title: 'Other' }));
    fixture.detectChanges();
    expect(component.displayTrack().id).toBe('s2');
    expect(component.isDockActive()).toBe(true);
  });

  it('clears the display track after hide delay and not if shown again', async () => {
    vi.useFakeTimers();
    const { component, fixture } = await setup();
    ps.isVisible.set(false);
    fixture.detectChanges();
    expect(component.isDockActive()).toBe(false);
    expect(component.displayTrack()).not.toBeNull();
    vi.advanceTimersByTime(320);
    expect(component.displayTrack()).toBeNull();
    expect(component.expandedTrackDetail()).toBeNull();

    // hide then show before timer fires: timer is cleared
    ps.isVisible.set(true);
    fixture.detectChanges();
    expect(component.displayTrack()).not.toBeNull();
    ps.isVisible.set(false);
    fixture.detectChanges();
    ps.isVisible.set(true);
    fixture.detectChanges();
    vi.advanceTimersByTime(500);
    expect(component.displayTrack()).not.toBeNull();
  });

  it('hide timer does not clear when visibility returned without the effect', async () => {
    vi.useFakeTimers();
    const { component, fixture } = await setup();
    ps.isVisible.set(false);
    fixture.detectChanges();
    // Flip back without effect flush
    ps.isVisible.set(true);
    vi.advanceTimersByTime(320);
    expect(component.displayTrack()).not.toBeNull();
  });

  it('loads detailed spec when expanded and falls back on error', async () => {
    const { component, fixture } = await setup();
    ps.isExpanded.set(true);
    fixture.detectChanges();
    expect(lab.getSpecById).toHaveBeenCalledWith('s1');
    expect(component.expandedTrackDetail().title).toBe('Detailed');

    lab.getSpecById.mockReturnValueOnce(of(null));
    ps.isExpanded.set(false);
    fixture.detectChanges();
    ps.isExpanded.set(true);
    fixture.detectChanges();
    expect(component.expandedTrackDetail().title).toBe('Song');

    lab.getSpecById.mockReturnValueOnce(throwError(() => new Error('x')));
    ps.isExpanded.set(false);
    fixture.detectChanges();
    ps.isExpanded.set(true);
    fixture.detectChanges();
    expect(component.expandedTrackDetail().title).toBe('Song');
  });

  it('does not fetch details when there is no track', async () => {
    const { fixture } = await setup(null);
    ps.isExpanded.set(true);
    fixture.detectChanges();
    expect(lab.getSpecById).not.toHaveBeenCalled();
  });

  it('unsubscribes a pending detail request on destroy', async () => {
    const { component, fixture } = await setup();
    const subj = new Subject<any>();
    lab.getSpecById.mockReturnValue(subj);
    ps.isExpanded.set(true);
    fixture.detectChanges();
    expect(subj.observed).toBe(true);
    fixture.destroy();
    expect(subj.observed).toBe(false);
    expect(component).toBeTruthy();
  });

  it('runs the waveform loop while playing and stops when paused', async () => {
    const { component, fixture } = await setup();
    rafCallbacks.length = 0;
    ps.isPlaying.set(true);
    fixture.detectChanges();
    expect(rafCallbacks.length).toBeGreaterThan(0);
    ps.getWaveformData.mockClear();
    const batch = rafCallbacks.splice(0);
    batch.forEach((cb) => cb());
    expect(ps.getWaveformData).toHaveBeenCalled();
    expect(component.waveformBars()).toHaveLength(60);
    expect(Math.max(...component.waveformBars())).toBe(100);
    expect(Math.min(...component.waveformBars())).toBeGreaterThanOrEqual(12);
    // loop reschedules itself while playing
    expect(rafCallbacks.length).toBeGreaterThan(0);

    ps.isPlaying.set(false);
    fixture.detectChanges();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    const callsBefore = ps.getWaveformData.mock.calls.length;
    ps.isVisible.set(false);
    fixture.detectChanges();
    expect(ps.getWaveformData.mock.calls.length).toBe(callsBefore);
  });

  it('uses idle waveform when no data or when player is hidden', async () => {
    const { component, fixture } = await setup();
    const idle = component.createIdleWaveform();
    expect(idle).toHaveLength(60);

    ps.getWaveformData.mockReturnValue(new Uint8Array());
    ps.isPlaying.set(true);
    fixture.detectChanges();
    expect(component.waveformBars()).toEqual(idle);

    ps.getWaveformData.mockReturnValue(null);
    component.tickWaveform();
    expect(component.waveformBars()).toEqual(idle);

    ps.getWaveformData.mockReturnValue(new Uint8Array([255]));
    component.tickWaveform();
    expect(component.waveformBars()).not.toEqual(idle);
    ps.isVisible.set(false);
    fixture.detectChanges();
    expect(component.waveformBars()).toEqual(idle);
  });

  it('computes limited tags, genres and prices from the track', async () => {
    const track = makeTrack({
      genres: [1, 2, 3, 4].map((n) => ({ id: `${n}`, name: `G${n}`, slug: `g${n}` })),
      freeMp3Enabled: false,
      licenses: [
        { id: 'a', price: 50, displayPriceMoney: { amount_minor: 5000, currency: 'USD' } },
        { id: 'b', price: 20, displayPriceMoney: { amount_minor: 2000, currency: 'USD' } },
        { id: 'c', price: 30 },
      ],
    });
    const { component, fixture } = await setup(track);
    expect(component.displayGenres()).toHaveLength(3);
    expect(component.detailTags()).toEqual(['a', 'b', 'c']);
    expect(component.minimumLicensePrice()).toBe(20);
    expect(component.minimumLicensePriceLabel()).toBe('$2000');

    ps.currentTrack.set(makeTrack({ displayPriceMoney: { amount_minor: 900 }, price: 9 }));
    fixture.detectChanges();
    expect(component.minimumLicensePrice()).toBe(9);
    expect(component.minimumLicensePriceLabel()).toBe('$900');

    component.expandedTrackDetail.set(
      makeTrack({ tags: undefined, genres: undefined, licenses: [{ id: 'x', price: 3 }] }),
    );
    expect(component.displayGenres()).toEqual([]);
    expect(component.detailTags()).toEqual([]);
    expect(component.minimumLicensePriceLabel()).toBe('$3');
    expect(component.queueItems()).toEqual([]);
  });

  it('builds a mini player link depending on viewport', async () => {
    const { component } = await setup();
    expect(component.miniPlayerLink(makeTrack({ shortCode: 'abc' }))).toEqual(['/', 'abc']);
    expect(component.miniPlayerLink(makeTrack({ id: '#q' }))).toEqual(['/', 'q']);
    mockMatchMedia(true);
    expect(component.miniPlayerLink(makeTrack())).toBeNull();
  });

  it('ignores mobile-only handlers on desktop', async () => {
    const { component } = await setup();
    component.openMobilePlayer({ target: document.createElement('div') } as any);
    expect(ps.setExpanded).not.toHaveBeenCalled();
    const e = { preventDefault: vi.fn(), stopPropagation: vi.fn(), clientY: 5 };
    component.onMobileHandlePointerDown(e as any);
    expect(component.isMobileSheetDragging()).toBe(false);
    expect(e.preventDefault).not.toHaveBeenCalled();
    component.handleMobileSheetPointerMove({ clientY: 100, preventDefault: vi.fn() } as any);
    expect(component.mobileSheetOffset()).toBe(0);
    component.handleMobileSheetPointerUp();
    expect(component.isMobileSheetClosing()).toBe(false);
  });

  it('openMobilePlayer ignores interactive targets and prevents anchor navigation', async () => {
    mockMatchMedia(true);
    const { component } = await setup();
    const btn = document.createElement('button');
    const inner = document.createElement('span');
    btn.appendChild(inner);
    component.openMobilePlayer({ target: inner } as any);
    expect(ps.setExpanded).not.toHaveBeenCalled();

    const a = document.createElement('a');
    const span = document.createElement('span');
    a.appendChild(span);
    const preventDefault = vi.fn();
    component.isMobileSheetClosing.set(true);
    component.openMobilePlayer({ target: span, preventDefault } as any);
    expect(preventDefault).toHaveBeenCalled();
    expect(ps.setExpanded).toHaveBeenCalledWith(true);
    expect(component.isMobileSheetClosing()).toBe(false);

    component.openMobilePlayer({ target: null } as any);
    expect(ps.setExpanded).toHaveBeenCalledTimes(2);
  });

  it('closeExpandedPlayer animates on mobile when expanded, otherwise collapses directly', async () => {
    vi.useFakeTimers();
    const { component } = await setup();
    const stop = vi.fn();
    component.closeExpandedPlayer({ stopPropagation: stop } as any);
    expect(stop).toHaveBeenCalled();
    expect(ps.setExpanded).toHaveBeenCalledWith(false);

    ps.setExpanded.mockClear();
    mockMatchMedia(true);
    ps.isExpanded.set(true);
    component.closeExpandedPlayer();
    expect(component.isMobileSheetClosing()).toBe(true);
    expect(ps.setExpanded).not.toHaveBeenCalled();
    vi.advanceTimersByTime(340);
    expect(ps.setExpanded).toHaveBeenCalledWith(false);
    expect(component.isMobileSheetClosing()).toBe(false);

    ps.isExpanded.set(false);
    ps.setExpanded.mockClear();
    component.closeExpandedPlayer();
    expect(ps.setExpanded).toHaveBeenCalledWith(false);
  });

  it('mobile sheet drag: small drag snaps back and small moves do not preventDefault', async () => {
    mockMatchMedia(true);
    const { component } = await setup();
    const prevent = vi.fn();
    component.onMobileHandlePointerDown({
      clientY: 100,
      preventDefault: prevent,
      stopPropagation: vi.fn(),
    } as any);
    expect(component.isMobileSheetDragging()).toBe(true);
    prevent.mockClear();

    component.handleMobileSheetPointerMove({ clientY: 105, preventDefault: prevent } as any);
    expect(prevent).not.toHaveBeenCalled();
    component.handleMobileSheetPointerMove({ clientY: 50, preventDefault: prevent } as any);
    expect(component.mobileSheetOffset()).toBe(0);
    component.handleMobileSheetPointerMove({ clientY: 150, preventDefault: prevent } as any);
    expect(prevent).toHaveBeenCalled();

    component.handleMobileSheetPointerUp();
    expect(component.isMobileSheetDragging()).toBe(false);
    expect(component.mobileSheetOffset()).toBe(0);
    expect(component.isMobileSheetClosing()).toBe(false);
  });

  it('onSeek and onSeekSlider fall back to duration of 1 and clamp percentage', async () => {
    const { component } = await setup();
    component.onSeek({ clientX: 0, currentTarget: null } as any);
    expect(ps.seekTo).not.toHaveBeenCalled();

    const rail = { getBoundingClientRect: () => ({ left: 0, width: 100 }) } as any;
    component.onSeek({ clientX: 999, currentTarget: rail } as any);
    expect(ps.seekTo).toHaveBeenLastCalledWith(100);
    component.onSeek({ clientX: -50, currentTarget: rail } as any);
    expect(ps.seekTo).toHaveBeenLastCalledWith(0);

    ps.duration.set(0);
    component.onSeek({ clientX: 50, currentTarget: rail } as any);
    expect(ps.seekTo).toHaveBeenLastCalledWith(0.5);
    component.onSeekSlider({ target: { value: '0.5' } } as any);
    expect(ps.seekTo).toHaveBeenLastCalledWith(0.5);
  });

  it('addToCart prefers the expanded track detail for the license modal', async () => {
    const { component } = await setup();
    const modal = TestBed.inject(ModalService) as any;
    const detail = makeTrack({ title: 'Detailed' });
    component.expandedTrackDetail.set(detail);
    component.addToCart({ stopPropagation: vi.fn() } as any);
    expect(modal.open).toHaveBeenCalledWith(expect.anything(), 'Select License', {
      spec: detail,
    });
    component.expandedTrackDetail.set(null);
    component.addToCart({ stopPropagation: vi.fn() } as any);
    expect(modal.open).toHaveBeenLastCalledWith(expect.anything(), 'Select License', {
      spec: ps.currentTrack(),
    });
  });

  it('opens producer profile with a sanitized handle and guards on missing producer', async () => {
    const { component } = await setup(makeTrack({ producerName: '  Dj  Éclair!! ' }));
    const nav = vi.spyOn(component.router, 'navigate').mockResolvedValue(true);
    component.openProducerProfile();
    expect(nav).toHaveBeenCalledWith(['/@', 'dj-clair'], { queryParams: { id: 'p1' } });

    ps.currentTrack.set(makeTrack({ producerName: '' }));
    component.openProducerProfile();
    expect(nav).toHaveBeenLastCalledWith(['/@', 'producer'], { queryParams: { id: 'p1' } });

    nav.mockClear();
    ps.currentTrack.set(makeTrack({ producerId: '' }));
    component.openProducerProfile();
    expect(nav).not.toHaveBeenCalled();
  });

  it('openBeatPage falls back to the id without hash', async () => {
    const { component } = await setup(makeTrack({ id: '#abc' }));
    const nav = vi.spyOn(component.router, 'navigate').mockResolvedValue(true);
    component.openBeatPage();
    expect(nav).toHaveBeenCalledWith(['/', 'abc']);
  });

  it('copyBeatLink/shareBeat use id fallback when shortCode is absent', async () => {
    const { component } = await setup(makeTrack({ id: '#abc' }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clip = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const share = Object.getOwnPropertyDescriptor(navigator, 'share');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    component.isMenuOpen.set(true);
    await component.shareBeat();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/abc`);
    expect(component.isMenuOpen()).toBe(false);
    if (clip) Object.defineProperty(navigator, 'clipboard', clip);
    else delete (navigator as any).clipboard;
    if (share) Object.defineProperty(navigator, 'share', share);
    else delete (navigator as any).share;
  });

  it('formatPanelKey handles every key shape', async () => {
    const { component } = await setup();
    expect(component.formatPanelKey('c   MIN')).toEqual({ root: 'C', mode: 'min' });
    expect(component.formatPanelKey('Gb maj')).toEqual({ root: 'GB', mode: 'maj' });
    expect(component.formatPanelKey('D m')).toEqual({ root: 'D', mode: 'min' });
    expect(component.formatPanelKey('E Minor Pentatonic')).toEqual({ root: 'E', mode: 'min' });
    expect(component.formatPanelKey('E Major Blues')).toEqual({ root: 'E', mode: 'maj' });
    expect(component.formatPanelKey('Bb Dorian')).toEqual({ root: 'BB', mode: 'dor' });
    expect(component.formatPanelKey('X-Ray')).toEqual({ root: 'X-RAY', mode: '' });
    expect(component.formatPanelKey('F xm')).toEqual({ root: 'F', mode: 'xm' });
  });

  it('formatPanelKey: leading m token is minor', async () => {
    const { component } = await setup();
    // "A xm" -> not 'm'; "A  m" handled by compactMinor. Direct: root only.
    expect(component.formatPanelKey('Am')).toEqual({ root: 'A', mode: 'min' });
  });

  describe('palette', () => {
    it('uses default palette when the track has no image', async () => {
      const { component } = await setup(makeTrack({ imageUrl: '' }));
      expect(component.mobilePalette()).toEqual({
        deep: '#0c0c0c',
        mid: '#2a2926',
        accent: '#f0e9d6',
      });
    });

    it('extracts a palette from a fetched image and revokes the object url', async () => {
      const revoke = vi.fn();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) }),
      );
      (URL as any).createObjectURL = vi.fn(() => 'blob:p');
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
      await vi.waitFor(() => expect(component.mobilePalette().accent).toMatch(/^rgb\(/));
      expect(component.mobilePalette().accent).toBe('rgb(228, 66, 34)');
      expect(component.mobilePalette().deep).toBe('rgb(48, 12, 5)');
      expect(revoke).toHaveBeenCalledWith('blob:p');
    });

    it('returns the default palette when no 2d context is available', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
      const { component } = await setup();
      expect(component.extractPalette({} as any)).toEqual(component.defaultMobilePalette());
    });

    it('discards palette results for a stale track and keeps fallback on failure', async () => {
      const { component } = await setup();
      const extract = vi.spyOn(component, 'extractPalette');
      vi.spyOn(component, 'loadPaletteImage').mockResolvedValue({
        image: {},
        cleanup: vi.fn(),
      });
      component.updateMobilePalette(makeTrack({ imageUrl: 'stale.jpg' }));
      await new Promise((r) => setTimeout(r, 0));
      expect(extract).not.toHaveBeenCalled();

      vi.spyOn(component, 'loadPaletteImage').mockRejectedValue(new Error('x'));
      component.mobilePalette.set({ deep: 'a', mid: 'b', accent: 'c' });
      component.updateMobilePalette(ps.currentTrack());
      await vi.waitFor(() =>
        expect(component.mobilePalette()).toEqual(component.defaultMobilePalette()),
      );

      component.updateMobilePalette(makeTrack({ imageUrl: 'stale2.jpg' }));
      component.mobilePalette.set({ deep: 'a', mid: 'b', accent: 'c' });
      await new Promise((r) => setTimeout(r, 0));
      expect(component.mobilePalette().deep).toBe('a');
    });

    it('loadPaletteImage falls back to element loading', async () => {
      const { component } = await setup();
      const loadEl = vi.spyOn(component, 'loadImageElement').mockResolvedValue({} as any);

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
      const res = await component.loadPaletteImage('http://x/a.jpg');
      expect(loadEl).toHaveBeenLastCalledWith('http://x/a.jpg', true);
      expect(res.cleanup()).toBeUndefined();

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('cors')));
      await component.loadPaletteImage('http://x/b.jpg');
      expect(loadEl).toHaveBeenLastCalledWith('http://x/b.jpg', true);

      const f = vi.fn();
      vi.stubGlobal('fetch', f);
      await component.loadPaletteImage('blob:xyz');
      expect(f).not.toHaveBeenCalled();
    });

    it('loadImageElement resolves, rejects and honours cors flag', async () => {
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
      const byRequest = (src: string) => instances.find((i) => i.src === src);
      const p1 = component.loadImageElement('a.jpg', true);
      const first = byRequest('a.jpg');
      first.onload();
      await expect(p1).resolves.toBe(first);
      expect(first.crossOrigin).toBe('anonymous');
      const p2 = component.loadImageElement('b.jpg', false);
      const second = byRequest('b.jpg');
      second.onerror();
      await expect(p2).rejects.toThrow('Failed to load image');
      expect(second.crossOrigin).toBe('');
    });

    it('rgbString clamps values', async () => {
      const { component } = await setup();
      expect(component.rgbString(-5, 999, 10.4)).toBe('rgb(0, 255, 10)');
    });
  });

  it('clears timers on destroy', async () => {
    vi.useFakeTimers();
    const { component, fixture } = await setup();
    mockMatchMedia(true);
    ps.isExpanded.set(true);
    component.closeExpandedPlayer();
    expect(component.mobileCloseTimer).not.toBeNull();
    fixture.destroy();
    expect(component.mobileCloseTimer).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(ps.setExpanded).not.toHaveBeenCalledWith(false);
  });
});
