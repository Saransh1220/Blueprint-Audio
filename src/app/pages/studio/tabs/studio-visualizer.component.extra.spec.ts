import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService, VisualizerService } from '../../../services';
import { StudioVisualizerComponent } from './studio-visualizer.component';

type Internals = {
  audio: HTMLAudioElement;
  audioBuffer: unknown;
  audioContext: unknown;
  analyser: unknown;
  source: unknown;
  frameId: number | null;
  activeWaveformHandle: string | null;
  createExportAudioGraph: () => unknown;
  setupAudioGraph: () => void;
  readFrequencyData: () => unknown;
  resampleValues: (v: number[], n: number) => number[];
  pickWebmMimeType: () => string;
  exportName: (e: 'png' | 'webm') => string;
  pointerToTime: (e: PointerEvent) => number;
  timeToPercent: (t: number) => number;
  startAnimation: () => void;
  stopAnimation: () => void;
  objectUrl: string | null;
};

describe('StudioVisualizerComponent (extra coverage)', () => {
  let fixture: ComponentFixture<StudioVisualizerComponent>;
  let component: StudioVisualizerComponent;
  let internals: Internals;
  let toast: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const el = () => fixture.nativeElement as HTMLElement;
  const ptr = (clientX: number) =>
    ({ clientX, preventDefault: vi.fn(), stopPropagation: vi.fn() }) as unknown as PointerEvent;

  function select(kind: 'waveform' | 'fluid-gradient' | 'vinyl' = 'waveform') {
    component.selectVisualizer(kind);
    fixture.detectChanges();
  }

  function withAudio(duration = 20) {
    component.audioFileName.set('beat.wav');
    component.duration.set(duration);
    component.trimStart.set(2);
    component.trimEnd.set(Math.min(duration, 12));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    await TestBed.configureTestingModule({
      imports: [StudioVisualizerComponent],
      providers: [VisualizerService, { provide: ToastService, useValue: toast }],
    }).compileComponents();
    fixture = TestBed.createComponent(StudioVisualizerComponent);
    component = fixture.componentInstance;
    internals = component as unknown as Internals;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('template', () => {
    it('library shows continue banner when audio exists and selects via click', () => {
      component.audioFileName.set('a.wav');
      fixture.detectChanges();
      const choices = el().querySelectorAll<HTMLButtonElement>('.visualizer-choice');
      expect(choices).toHaveLength(3);
      choices[2].click();
      fixture.detectChanges();
      expect(component.selectedKind()).toBe('vinyl');
    });

    it('renders every inspector tab for every visualizer kind', () => {
      for (const kind of ['waveform', 'fluid-gradient', 'vinyl'] as const) {
        select(kind);
        for (const tab of ['style', 'color', 'output'] as const) {
          component.setInspectorTab(tab);
          fixture.detectChanges();
          expect(component.inspectorTab()).toBe(tab);
          expect(el().textContent).toBeTruthy();
        }
      }
    });

    it('style tab: presets, sliders, and mode toggles are interactive', () => {
      select('waveform');
      withAudio();
      const buttons = Array.from(el().querySelectorAll<HTMLButtonElement>('button'));
      const mirror = buttons.find((b) => b.textContent?.includes('Mirror Wave'));
      mirror?.click();
      expect(component.waveformSettings.style).toBe('mirror-wave');
      buttons.find((b) => b.textContent?.trim() === 'Still')?.click();
      expect(component.settings.mode).toBe('static');
      fixture.detectChanges();
      Array.from(el().querySelectorAll<HTMLButtonElement>('button'))
        .find((b) => b.textContent?.trim() === 'Live')
        ?.click();
      expect(component.settings.mode).toBe('dynamic');
      const slider = el().querySelector<HTMLInputElement>('input[type="range"]');
      expect(slider).toBeTruthy();
      slider!.value = '100';
      slider!.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.waveformSettings.density).toBe(100);
    });

    it('color tab: presets, background mode, colors and grain', () => {
      select('waveform');
      withAudio();
      component.setInspectorTab('color');
      fixture.detectChanges();
      const click = (label: string) =>
        Array.from(el().querySelectorAll<HTMLButtonElement>('button'))
          .find((b) => b.textContent?.trim() === label)
          ?.click();
      click('Gradient');
      expect(component.settings.backgroundMode).toBe('gradient');
      click('Solid');
      expect(component.settings.backgroundMode).toBe('solid');
      const preset = el().querySelector<HTMLButtonElement>('.preset-card, [class*="preset"] button');
      preset?.click();
      fixture.detectChanges();
      const colors = el().querySelectorAll<HTMLInputElement>('input[type="color"], input[type="text"]');
      colors.forEach((input) => {
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('change'));
      });
      const ranges = el().querySelectorAll<HTMLInputElement>('input[type="range"]');
      ranges.forEach((input) => {
        input.value = '5';
        input.dispatchEvent(new Event('input'));
      });
      expect(component.settings.grainAmount).toBe(5);

      select('fluid-gradient');
      component.setInspectorTab('color');
      fixture.detectChanges();
      expect(el().textContent).toBeTruthy();
    });

    it('output tab: formats, title toggle, title text and export buttons', () => {
      select('vinyl');
      withAudio();
      component.setInspectorTab('output');
      fixture.detectChanges();
      const buttons = Array.from(el().querySelectorAll<HTMLButtonElement>('button'));
      buttons.find((b) => b.textContent?.includes('Story'))?.click();
      expect(component.settings.format).toBe('9:16');
      const checkbox = el().querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        expect(component.settings.showTitle).toBe(true);
      }
      const text = el().querySelector<HTMLInputElement>('input[type="text"]');
      if (text) {
        text.value = 'Hello';
        text.dispatchEvent(new Event('input'));
        expect(component.settings.title).toBe('Hello');
      }
    });

    it('track controls: change visualizer, header switching, play and pointer handlers', () => {
      select('waveform');
      withAudio();
      const spy = vi.spyOn(component, 'togglePlayback').mockResolvedValue();
      const seek = vi.spyOn(component, 'seekToStart');
      const all = Array.from(el().querySelectorAll<HTMLButtonElement>('button'));
      all.find((b) => b.getAttribute('aria-label')?.toLowerCase().includes('play'))?.click();
      all.find((b) => b.getAttribute('aria-label')?.toLowerCase().includes('start'))?.click();
      expect(spy.mock.calls.length + seek.mock.calls.length).toBeGreaterThan(0);

      const wf = el().querySelector<HTMLElement>('.track-waveform')!;
      Object.defineProperty(wf, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 100 }),
      });
      const evt = (type: string, x: number) => {
        const e = new Event(type, { bubbles: true, cancelable: true }) as Event & {
          clientX: number;
        };
        e.clientX = x;
        return e;
      };
      wf.dispatchEvent(evt('pointerdown', 50));
      expect(component.currentTime()).toBeCloseTo(10);
      el()
        .querySelectorAll<HTMLElement>('.track-waveform *')
        .forEach((child) => child.dispatchEvent(evt('pointerdown', 20)));

      const picks = Array.from(el().querySelectorAll<HTMLButtonElement>('button')).filter((b) =>
        /Fluid|Vinyl/.test(b.textContent ?? ''),
      );
      picks[0]?.click();
      fixture.detectChanges();
      const changeBtn = Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.getAttribute('aria-label') === 'Change visualizer',
      );
      changeBtn?.click();
      fixture.detectChanges();
      expect(component.selectedKind()).toBeNull();
    });

    it('shows export progress while exporting', () => {
      select();
      withAudio();
      component.isExporting.set(true);
      component.exportProgress.set(0.5);
      fixture.detectChanges();
      expect(el().textContent).toMatch(/50|Exporting/);
    });
  });

  describe('helpers and setters', () => {
    it('sliderSet, sliderValue, setSlider and sliderFill', () => {
      select('fluid-gradient');
      expect(component.sliderSet.title).toBe('Surface motion');
      expect(component.sliderValue('deformation')).toBe(64);
      expect(component.sliderValue('missing')).toBe(0);
      component.setSlider('deformation', '10');
      expect(component.fluidSettings.deformation).toBe(10);
      const ctl = component.sliderSet.controls[0];
      expect(component.sliderFill(ctl)).toBe(0);
      component.setSlider('deformation', 1000);
      expect(component.sliderFill(ctl)).toBe(100);
      component.setSlider('deformation', 0);
      expect(component.sliderFill(ctl)).toBe(0);
      expect(component.sliderFill({ ...ctl, min: 5, max: 5 })).toBe(0);
    });

    it('isPresetActive compares background and gradient colors', () => {
      const preset = component.gradientPresets[1];
      expect(component.isPresetActive(preset)).toBe(false);
      component.selectGradientPreset(preset);
      expect(component.isPresetActive(preset)).toBe(true);
      expect(component.settings.backgroundMode).toBe('gradient');
      expect(component.settings.accentColor).toBe(preset.accentColor);
    });

    it('setColor, setBackgroundMode, setFormat update settings and canvas', () => {
      select('waveform');
      component.setColor('accentColor', '#123456');
      expect(component.settings.accentColor).toBe('#123456');
      component.setBackgroundMode('gradient');
      expect(component.settings.backgroundMode).toBe('gradient');
      component.setFormat('16:9');
      expect(component.previewCanvas!.nativeElement.width).toBe(720);
      expect(component.previewCanvas!.nativeElement.height).toBe(405);
    });

    it('selectStyle is a no-op for non-waveform kinds', () => {
      select('vinyl');
      const before = component.settings;
      component.selectStyle('line-pulse');
      expect(component.settings).toBe(before);
    });

    it('setMode toggles animation depending on playback', () => {
      select('waveform');
      const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(7);
      const caf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
      component.isPlaying.set(true);
      component.setMode('dynamic');
      expect(raf).toHaveBeenCalled();
      expect(internals.frameId).toBe(7);
      component.setMode('static');
      expect(caf).toHaveBeenCalledWith(7);
      expect(internals.frameId).toBeNull();
      component.isPlaying.set(false);
      component.setMode('dynamic');
      expect(component.settings.mode).toBe('dynamic');
    });

    it('updateSetting resamples peaks when audio exists and regenerates idle otherwise', () => {
      select('waveform');
      component.updateSetting();
      expect(component.peaks()).toHaveLength(84);
      component.audioFileName.set('a.wav');
      component.peaks.set([0.1, 0.5, 0.9]);
      component.waveformSettings.density = 24;
      component.updateSetting();
      expect(component.peaks()).toHaveLength(24);
      component.peaks.set([]);
      component.updateSetting();
      expect(component.peaks()).toHaveLength(24);
    });

    it('formatTime handles invalid and valid values', () => {
      expect(component.formatTime(NaN)).toBe('0:00');
      expect(component.formatTime(-3)).toBe('0:00');
      expect(component.formatTime(75.4)).toBe('1:15');
    });

    it('computed percentages and progress', () => {
      expect(component.trimStartPercent()).toBe(0);
      component.duration.set(100);
      component.trimStart.set(10);
      component.trimEnd.set(60);
      component.currentTime.set(25);
      expect(component.trimStartPercent()).toBe(10);
      expect(component.trimEndPercent()).toBe(60);
      expect(component.playheadPercent()).toBe(25);
      expect(component.progress()).toBe(0.25);
      expect(component.clipDuration()).toBe(50);
      expect(internals.timeToPercent(Infinity)).toBe(0);
      expect(component.selectedChoice()).toBeUndefined();
      select('vinyl');
      expect(component.selectedChoice()?.kind).toBe('vinyl');
    });

    it('resampleValues, mime picking and export names', () => {
      select();
      expect(internals.resampleValues([], 10)).toHaveLength(10);
      expect(internals.resampleValues([0.5, 1], 10)).toHaveLength(10);
      expect(internals.pickWebmMimeType()).toBe('video/webm');
      vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
      expect(internals.pickWebmMimeType()).toBe('video/webm;codecs=vp9,opus');
      vi.stubGlobal('MediaRecorder', { isTypeSupported: () => false });
      expect(internals.pickWebmMimeType()).toBe('video/webm');
      component.settings.title = '';
      component.audioFileName.set('My Song!.mp3');
      expect(internals.exportName('png')).toBe('my-song-mp3-1:1.png');
      component.audioFileName.set('');
      expect(internals.exportName('webm')).toBe('waveyard-visualizer-1:1.webm');
      component.settings.title = '***';
      expect(internals.exportName('webm')).toBe('waveyard-visualizer-1:1.webm');
    });

    it('pointerToTime returns zero without a waveform or duration', () => {
      expect(internals.pointerToTime(ptr(10))).toBe(0);
      select();
      expect(internals.pointerToTime(ptr(10))).toBe(0);
    });
  });

  describe('trim and pointer handling', () => {
    beforeEach(() => {
      select();
      withAudio();
      const wf = el().querySelector<HTMLElement>('.track-waveform')!;
      Object.defineProperty(wf, 'getBoundingClientRect', {
        value: () => ({ left: 0, width: 200 }),
      });
    });

    it('ignores drag and seek without audio', () => {
      component.audioFileName.set('');
      component.beginTrimDrag('start', ptr(0));
      component.beginPlayheadDrag(ptr(0));
      component.seekFromWaveform(ptr(100));
      expect(internals.activeWaveformHandle).toBeNull();
      component.onDocumentPointerMove(ptr(10));
    });

    it('drags the end handle and seeks within the trim range', () => {
      component.beginTrimDrag('end', ptr(0));
      component.onDocumentPointerMove(ptr(100));
      expect(component.trimEnd()).toBe(10);
      component.onDocumentPointerUp();
      expect(internals.activeWaveformHandle).toBeNull();
      component.seekFromWaveform(ptr(0));
      expect(component.currentTime()).toBe(component.trimStart());
      component.seekFromWaveform(ptr(200));
      expect(component.currentTime()).toBe(component.trimEnd());
    });

    it('updateTrimStart/End move playhead when it falls outside', () => {
      component.currentTime.set(1);
      component.updateTrimStart(5);
      expect(component.currentTime()).toBe(5);
      component.updateTrimStart('nope');
      expect(component.trimStart()).toBe(0);
      component.currentTime.set(11);
      component.updateTrimEnd(8);
      expect(component.trimEnd()).toBe(8);
      expect(component.currentTime()).toBe(component.trimStart());
      component.updateTrimEnd('bad');
      expect(component.trimEnd()).toBe(component.duration());
    });
  });

  describe('audio element events and file loading', () => {
    it('loadedmetadata sets duration', () => {
      Object.defineProperty(internals.audio, 'duration', { value: 33, configurable: true });
      internals.audio.dispatchEvent(new Event('loadedmetadata'));
      expect(component.duration()).toBe(33);
      Object.defineProperty(internals.audio, 'duration', { value: NaN, configurable: true });
      internals.audio.dispatchEvent(new Event('loadedmetadata'));
      expect(component.duration()).toBe(0);
    });

    it('timeupdate stops playback at trim end and renders when idle', () => {
      select();
      withAudio();
      component.isPlaying.set(true);
      internals.audio.currentTime = 12;
      internals.audio.dispatchEvent(new Event('timeupdate'));
      expect(component.isPlaying()).toBe(false);
      expect(component.currentTime()).toBe(2);
      internals.audio.currentTime = 3;
      internals.audio.dispatchEvent(new Event('timeupdate'));
      expect(component.currentTime()).toBe(3);
    });

    it('timeupdate while playing below trim end keeps playing', () => {
      select();
      withAudio();
      component.isPlaying.set(true);
      internals.audio.currentTime = 4;
      internals.audio.dispatchEvent(new Event('timeupdate'));
      expect(component.isPlaying()).toBe(true);
    });

    it('ended resets playing state', () => {
      select();
      component.isPlaying.set(true);
      internals.audio.dispatchEvent(new Event('ended'));
      expect(component.isPlaying()).toBe(false);
    });

    it('ignores empty file selections', async () => {
      const input = { files: [], value: 'x' };
      await component.onAudioSelected({ target: input } as unknown as Event);
      expect(component.hasAudio()).toBe(false);
      await component.onAudioSelected({ target: { files: null } } as unknown as Event);
      expect(component.isDecoding()).toBe(false);
    });

    it('caps trim end at 15 seconds, keeps an existing title and non-Error rejection message', async () => {
      select();
      component.settings.title = 'Mine';
      const service = TestBed.inject(VisualizerService);
      vi.spyOn(service, 'decodeAudioData').mockResolvedValueOnce({ duration: 60 } as AudioBuffer);
      vi.spyOn(service, 'extractPeaks').mockReturnValue([0.5]);
      const mk = () => ({
        files: [{ name: 'x.mp3', arrayBuffer: async () => new ArrayBuffer(1) }],
        value: 'v',
      });
      await component.onAudioSelected({ target: mk() } as unknown as Event);
      expect(component.trimEnd()).toBe(15);
      expect(component.settings.title).toBe('Mine');
      expect(internals.objectUrl).toBe('blob:x');

      vi.spyOn(service, 'decodeAudioData').mockRejectedValueOnce('boom');
      await component.onAudioSelected({ target: mk() } as unknown as Event);
      expect(toast.error).toHaveBeenCalledWith('Could not decode audio.');
    });
  });

  describe('audio graph and playback', () => {
    function stubAudioContext(state = 'running') {
      const analyser = {
        fftSize: 0,
        frequencyBinCount: 4,
        getByteFrequencyData: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const source = { connect: vi.fn(), disconnect: vi.fn() };
      const ctx = {
        state,
        destination: {},
        createAnalyser: vi.fn(() => analyser),
        createMediaElementSource: vi.fn(() => source),
        resume: vi.fn(),
        close: vi.fn(),
      };
      vi.stubGlobal(
        'AudioContext',
        vi.fn(function () {
          return ctx;
        }),
      );
      return { ctx, analyser, source };
    }

    it('togglePlayback is a no-op without audio', async () => {
      await component.togglePlayback();
      expect(component.isPlaying()).toBe(false);
    });

    it('reuses the graph, resumes a suspended context and plays inside the clip', async () => {
      select();
      withAudio();
      const { ctx } = stubAudioContext('suspended');
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
      internals.audio.currentTime = 5;
      await component.togglePlayback();
      expect(component.isPlaying()).toBe(true);
      await component.togglePlayback();
      await component.togglePlayback();
      expect(ctx.resume).toHaveBeenCalled();
      expect(ctx.createAnalyser).toHaveBeenCalledTimes(1);
      expect(internals.readFrequencyData()).toBeTruthy();
    });

    it('reports playback failures', async () => {
      select();
      withAudio();
      vi.stubGlobal('AudioContext', undefined);
      (window as unknown as Record<string, unknown>)['webkitAudioContext'] = undefined;
      await component.togglePlayback();
      expect(toast.error).toHaveBeenCalledWith('Playback could not start.');
    });

    it('animation loop renders until playback stops', () => {
      select();
      const callbacks: FrameRequestCallback[] = [];
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        callbacks.push(cb);
        return callbacks.length;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
      component.isPlaying.set(true);
      internals.startAnimation();
      callbacks[0](0);
      expect(callbacks).toHaveLength(2);
      component.isPlaying.set(false);
      callbacks[1](0);
      expect(callbacks).toHaveLength(2);
    });

    it('readFrequencyData is null without an analyser; destroy and reselect clean up', () => {
      select();
      expect(internals.readFrequencyData()).toBeNull();
      const { ctx, analyser, source } = stubAudioContext();
      internals.setupAudioGraph();
      expect(analyser.fftSize).toBe(256);
      const closeSpy = ctx.close;
      component.changeVisualizer();
      fixture.destroy();
      expect(closeSpy).toHaveBeenCalled();
      expect(source.connect).toHaveBeenCalled();
    });

    it('resets the existing graph when a new file loads', async () => {
      select();
      const { ctx, analyser, source } = stubAudioContext();
      internals.setupAudioGraph();
      const service = TestBed.inject(VisualizerService);
      vi.spyOn(service, 'decodeAudioData').mockResolvedValue({ duration: 5 } as AudioBuffer);
      await component.onAudioSelected({
        target: { files: [{ name: 'a.wav', arrayBuffer: async () => new ArrayBuffer(1) }], value: '' },
      } as unknown as Event);
      expect(source.disconnect).toHaveBeenCalled();
      expect(analyser.disconnect).toHaveBeenCalled();
      expect(ctx.close).toHaveBeenCalled();
      expect(internals.audioContext).toBeNull();
    });

    it('does not close an already closed context on destroy', () => {
      select();
      const { ctx } = stubAudioContext('closed');
      internals.setupAudioGraph();
      fixture.destroy();
      expect(ctx.close).not.toHaveBeenCalled();
    });
  });

  describe('exportPng', () => {
    it('does nothing without audio', () => {
      const spy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob');
      component.exportPng();
      expect(spy).not.toHaveBeenCalled();
    });

    it('uses dynamic frame data while playing and shows success toast', () => {
      select();
      withAudio();
      component.isPlaying.set(true);
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb: BlobCallback) =>
        cb(new Blob(['x'])),
      );
      component.exportPng();
      expect(toast.success).toHaveBeenCalledWith('PNG exported.');
    });
  });

  describe('exportWebm', () => {
    let rafCallbacks: FrameRequestCallback[];
    let timerFns: Array<() => void>;
    let now: number;
    let recorders: FakeRecorder[];
    let tracks: Array<{ stop: ReturnType<typeof vi.fn> }>;
    const ticks = () => rafCallbacks.filter((cb) => cb.name === 'renderExportTick');
    const stopTimers = () => timerFns.filter((fn) => fn.name === 'stopRecording');
    let exportCtx: ReturnType<typeof makeExportCtx>;

    class FakeRecorder {
      state = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      static throwOnStart = false;
      static isTypeSupported = () => true;
      constructor(
        public stream: unknown,
        public opts: unknown,
      ) {
        recorders.push(this);
      }
      start() {
        if (FakeRecorder.throwOnStart) throw new Error('nope');
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['chunk']) });
        this.ondataavailable?.({ data: new Blob([]) });
        this.onstop?.();
      }
    }

    function makeExportCtx() {
      const analyser = {
        fftSize: 0,
        frequencyBinCount: 8,
        getByteFrequencyData: vi.fn((d: Uint8Array) => d.fill(100)),
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const audioTrack = { stop: vi.fn() };
      const destination = {
        stream: { getAudioTracks: () => [audioTrack] },
        disconnect: vi.fn(),
      };
      const source = {
        buffer: null as unknown,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      const context = {
        state: 'running',
        createBufferSource: vi.fn(() => source),
        createAnalyser: vi.fn(() => analyser),
        createMediaStreamDestination: vi.fn(() => destination),
        close: vi.fn(),
      };
      return { context, source, analyser, destination };
    }

    beforeEach(() => {
      rafCallbacks = [];
      timerFns = [];
      now = 1000;
      recorders = [];
      FakeRecorder.throwOnStart = false;
      tracks = [{ stop: vi.fn() }];
      exportCtx = makeExportCtx();
      vi.stubGlobal('MediaRecorder', FakeRecorder);
      vi.stubGlobal(
        'AudioContext',
        vi.fn(function () {
          return exportCtx.context;
        }),
      );
      Object.defineProperty(HTMLCanvasElement.prototype, 'captureStream', {
        configurable: true,
        writable: true,
        value: vi.fn(() => ({
          getTracks: () => tracks,
          addTrack: vi.fn(),
        })),
      });
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
      vi.spyOn(window, 'setTimeout').mockImplementation(((fn: () => void) => {
        timerFns.push(fn);
        return timerFns.length;
      }) as unknown as typeof window.setTimeout);
      vi.spyOn(window, 'clearTimeout').mockImplementation(() => undefined);
      select('vinyl');
      withAudio();
      internals.audioBuffer = { duration: 20 };
      rafCallbacks.length = 0;
      timerFns.length = 0;
    });

    afterEach(() => {
      delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>)['captureStream'];
    });

    it('is a no-op without audio', async () => {
      component.audioFileName.set('');
      await component.exportWebm();
      expect(recorders).toHaveLength(0);
    });

    it('records the clip frame by frame and downloads on completion', async () => {
      await component.exportWebm();
      expect(component.isExporting()).toBe(true);
      expect(recorders).toHaveLength(1);
      expect(exportCtx.source.start).toHaveBeenCalledWith(0, 2, 10);
      expect(ticks()).toHaveLength(1);

      now += 5000;
      ticks()[0](0);
      expect(component.exportProgress()).toBeCloseTo(0.5);
      expect(component.currentTime()).toBeCloseTo(7);
      expect(ticks()).toHaveLength(2);

      now += 6000;
      ticks()[1](0);
      expect(exportCtx.source.stop).toHaveBeenCalled();
      expect(component.isExporting()).toBe(false);
      expect(component.exportProgress()).toBe(1);
      expect(component.currentTime()).toBe(2);
      expect(component.statusMessage()).toBe('WebM exported.');
      expect(toast.success).toHaveBeenCalledWith('WebM exported.');
      expect(exportCtx.context.close).toHaveBeenCalled();
      expect(exportCtx.analyser.disconnect).toHaveBeenCalled();
      expect(tracks[0].stop).toHaveBeenCalled();
      // stop timer firing afterwards is ignored
      stopTimers()[0]();
      expect(recorders[0].state).toBe('inactive');
    });

    it('stops via the fallback timer, tolerating a source that already ended', async () => {
      exportCtx.source.stop.mockImplementation(() => {
        throw new Error('already stopped');
      });
      exportCtx.context.state = 'closed';
      await component.exportWebm();
      stopTimers()[0]();
      expect(component.isExporting()).toBe(false);
      expect(exportCtx.context.close).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('WebM exported.');
    });

    it('finishes immediately for a zero-length clip', async () => {
      component.trimEnd.set(component.trimStart());
      await component.exportWebm();
      ticks()[0](0);
      expect(component.exportProgress()).toBe(1);
      expect(component.isExporting()).toBe(false);
    });

    it('ignores a late tick after the recording stopped', async () => {
      await component.exportWebm();
      stopTimers()[0]();
      const calls = ticks().length;
      now += 100;
      ticks()[0](0);
      expect(ticks().length).toBe(calls);
    });

    it('reports when background audio cannot be prepared', async () => {
      internals.audioBuffer = null;
      await component.exportWebm();
      expect(toast.error).toHaveBeenCalledWith('Could not prepare background audio export.');
      expect(component.isExporting()).toBe(false);
      expect(tracks[0].stop).toHaveBeenCalled();
    });

    it('reports when no AudioContext constructor exists', async () => {
      vi.stubGlobal('AudioContext', undefined);
      (window as unknown as Record<string, unknown>)['webkitAudioContext'] = undefined;
      await component.exportWebm();
      expect(toast.error).toHaveBeenCalledWith('Could not prepare background audio export.');
    });

    it('reports when the recorder fails to start', async () => {
      FakeRecorder.throwOnStart = true;
      await component.exportWebm();
      expect(toast.error).toHaveBeenCalledWith('Could not start WebM export.');
      expect(component.isExporting()).toBe(false);
      expect(component.exportProgress()).toBe(0);
    });

    it('falls back to PNG messaging when captureStream is missing', async () => {
      delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>)['captureStream'];
      await component.exportWebm();
      expect(toast.info).toHaveBeenCalled();
      expect(recorders).toHaveLength(0);
    });

    it('createExportAudioGraph wires source, analyser and destination', () => {
      const graph = internals.createExportAudioGraph() as {
        frequencyData: Uint8Array;
      };
      expect(graph.frequencyData).toHaveLength(8);
      expect(exportCtx.source.connect).toHaveBeenCalledWith(exportCtx.analyser);
      expect(exportCtx.analyser.connect).toHaveBeenCalledWith(exportCtx.destination);
    });
  });
});
