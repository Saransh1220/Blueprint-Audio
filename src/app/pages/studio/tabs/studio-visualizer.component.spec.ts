import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService, VisualizerService } from '../../../services';
import { StudioVisualizerComponent } from './studio-visualizer.component';

describe('StudioVisualizerComponent', () => {
  let fixture: ComponentFixture<StudioVisualizerComponent>;
  let component: StudioVisualizerComponent;
  let toast: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };
  let visualizer: {
    createIdlePeaks: ReturnType<typeof vi.fn>;
    getCanvasSize: ReturnType<typeof vi.fn>;
    drawVisualizerFrame: ReturnType<typeof vi.fn>;
    decodeAudioData: ReturnType<typeof vi.fn>;
    extractPeaks: ReturnType<typeof vi.fn>;
    normalizeFrequencyData: ReturnType<typeof vi.fn>;
  };
  const canvasContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
  };

  function makePointer(clientX: number) {
    return {
      clientX,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as PointerEvent;
  }

  beforeEach(async () => {
    toast = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    visualizer = {
      createIdlePeaks: vi.fn((count: number) => Array.from({ length: count }, () => 0.2)),
      getCanvasSize: vi.fn(() => ({ width: 1080, height: 1080 })),
      drawVisualizerFrame: vi.fn(),
      decodeAudioData: vi.fn(async () => ({ duration: 12 })),
      extractPeaks: vi.fn(() => [0.1, 0.4, 0.8, 0.2]),
      normalizeFrequencyData: vi.fn(() => [0.2, 0.6]),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContext as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audio');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [StudioVisualizerComponent],
      providers: [
        { provide: ToastService, useValue: toast },
        { provide: VisualizerService, useValue: visualizer },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudioVisualizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  it('disables preview and export actions until audio is loaded', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.actions-row button, .export-row button'),
    ) as HTMLButtonElement[];

    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(component.settings.mode).toBe('dynamic');
  });

  it('loads a local audio file and enables controls', async () => {
    const file = {
      name: 'midnight-loop.wav',
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
    };

    await component.onAudioSelected({
      target: { files: [file], value: 'selected' },
    } as unknown as Event);
    fixture.detectChanges();

    expect(component.audioFileName()).toBe('midnight-loop.wav');
    expect(component.settings.title).toBe('midnight-loop');
    expect(component.hasAudio()).toBe(true);
    expect(component.trimStart()).toBe(0);
    expect(component.trimEnd()).toBe(12);
    expect(component.clipDuration()).toBe(12);
    expect(visualizer.decodeAudioData).toHaveBeenCalled();
    expect(visualizer.extractPeaks).toHaveBeenCalled();
    expect(visualizer.extractPeaks).toHaveBeenCalledWith({ duration: 12 }, 140);

    const exportButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.export-row button'),
    ) as HTMLButtonElement[];
    expect(exportButtons.every((button) => button.disabled)).toBe(false);
  });

  it('shows a decode error and resets the file input when audio decoding fails', async () => {
    visualizer.decodeAudioData.mockRejectedValueOnce(new Error('bad audio'));
    const file = {
      name: 'broken.wav',
      arrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
    };
    const input = { files: [file], value: 'selected' };

    await component.onAudioSelected({ target: input } as unknown as Event);

    expect(component.statusMessage()).toBe('Could not decode this audio file.');
    expect(component.isDecoding()).toBe(false);
    expect(input.value).toBe('');
    expect(toast.error).toHaveBeenCalledWith('bad audio');
  });

  it('clamps trim handles and seeks to the selected clip start', () => {
    component.duration.set(20);
    component.trimStart.set(4);
    component.trimEnd.set(12);

    component.updateTrimStart(13);
    expect(component.trimStart()).toBe(11.75);

    component.updateTrimEnd(6);
    expect(component.trimEnd()).toBe(12);

    component.seekToStart();
    expect(component.currentTime()).toBe(11.75);
  });

  it('drags the playhead within the selected clip range', () => {
    component.audioFileName.set('beat.wav');
    component.duration.set(20);
    component.trimStart.set(4);
    component.trimEnd.set(12);
    const waveform = fixture.nativeElement.querySelector('.track-waveform') as HTMLElement;
    Object.defineProperty(waveform, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 200 }),
    });

    component.beginPlayheadDrag({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as PointerEvent);
    component.onDocumentPointerMove({
      preventDefault: vi.fn(),
      clientX: 180,
    } as unknown as PointerEvent);
    component.onDocumentPointerUp();

    expect(component.currentTime()).toBe(12);
  });

  it('drags start and end handles directly on the trim waveform', () => {
    component.audioFileName.set('beat.wav');
    component.duration.set(20);
    component.trimStart.set(2);
    component.trimEnd.set(16);
    const waveform = fixture.nativeElement.querySelector('.track-waveform') as HTMLElement;
    Object.defineProperty(waveform, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 200 }),
    });

    component.beginTrimDrag('start', makePointer(0));
    component.onDocumentPointerMove(makePointer(80));
    component.onDocumentPointerUp();
    expect(component.trimStart()).toBe(8);

    component.beginTrimDrag('end', makePointer(0));
    component.onDocumentPointerMove(makePointer(140));
    component.onDocumentPointerUp();
    expect(component.trimEnd()).toBe(14);
  });

  it('keeps trim waveform independent from visualizer density changes', () => {
    component.audioFileName.set('beat.wav');
    component.trimPeaks.set([0.1, 0.5, 0.9]);
    component.settings.density = 180;

    component.updateSetting();

    expect(component.trimPeaks()).toEqual([0.1, 0.5, 0.9]);
  });

  it('updates style, mode, and format settings', () => {
    component.selectStyle('mirror-wave');
    component.setMode('dynamic');
    component.setFormat('9:16');

    expect(component.settings.style).toBe('mirror-wave');
    expect(component.settings.mode).toBe('dynamic');
    expect(component.settings.format).toBe('9:16');
    expect(visualizer.getCanvasSize).toHaveBeenCalledWith('9:16', 1080);
    expect(visualizer.drawVisualizerFrame).toHaveBeenCalled();
  });

  it('exports PNG files and reports a blank canvas failure', () => {
    component.audioFileName.set('beat.wav');
    component.settings.title = 'Late Night Loop';
    const downloadClick = vi.fn();
    const anchor = document.createElement('a');
    vi.spyOn(anchor, 'click').mockImplementation(downloadClick);
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['png'], { type: 'image/png' }));
    });

    component.exportPng();

    expect(anchor.download).toBe('late-night-loop-1:1.png');
    expect(downloadClick).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('PNG exported.');

    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementationOnce(
      (callback: BlobCallback) => {
        callback(null);
      },
    );
    component.exportPng();

    expect(toast.error).toHaveBeenCalledWith('Could not export PNG.');
  });

  it('starts and stops playback with analyser-driven dynamic preview values', async () => {
    const analyser = {
      fftSize: 0,
      frequencyBinCount: 4,
      getByteFrequencyData: vi.fn((data: Uint8Array) => data.fill(128)),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const audioContext = {
      state: 'running',
      destination: {},
      createAnalyser: vi.fn(() => analyser),
      createMediaElementSource: vi.fn(() => source),
      resume: vi.fn(),
      close: vi.fn(),
    };
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return audioContext;
      }),
    );
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    component.audioFileName.set('beat.wav');
    component.duration.set(20);
    component.trimStart.set(4);
    component.trimEnd.set(10);
    component.currentTime.set(12);

    await component.togglePlayback();

    expect(component.isPlaying()).toBe(true);
    expect(component.currentTime()).toBe(4);
    expect(source.connect).toHaveBeenCalledWith(analyser);

    await component.togglePlayback();

    expect(component.isPlaying()).toBe(false);
  });

  it('reports playback startup failures', async () => {
    vi.stubGlobal('AudioContext', undefined);
    component.audioFileName.set('beat.wav');

    await component.togglePlayback();

    expect(toast.error).toHaveBeenCalledWith('Playback could not start.');
    expect(component.isPlaying()).toBe(false);
  });

  it('updates gradient background and film grain settings', () => {
    component.selectGradientPreset(component.gradientPresets[1]);
    component.settings.grainAmount = 10;
    component.updateSetting();

    expect(component.settings.backgroundMode).toBe('gradient');
    expect(component.settings.backgroundColor).toBe('#10100e');
    expect(component.settings.gradientColor).toBe('#132a83');
    expect(component.settings.waveformColor).toBe('#d4c5ff');
    expect(component.settings.accentColor).toBe('#86d7ff');
    expect(component.settings.grainAmount).toBe(10);
    expect(visualizer.drawVisualizerFrame).toHaveBeenCalled();
  });

  it('falls back cleanly when WebM export is unsupported', async () => {
    component.audioFileName.set('beat.wav');

    await component.exportWebm();

    expect(toast.info).toHaveBeenCalledWith(
      'Video export is not supported in this browser. PNG export is ready.',
    );
  });
});
