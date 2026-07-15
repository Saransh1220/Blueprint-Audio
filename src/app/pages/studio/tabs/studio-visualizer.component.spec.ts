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

  function select(kind: 'waveform' | 'fluid-gradient' | 'vinyl' = 'waveform') {
    component.selectVisualizer(kind);
    fixture.detectChanges();
  }

  function makePointer(clientX: number) {
    return {
      clientX,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as PointerEvent;
  }

  beforeEach(async () => {
    toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audio');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [StudioVisualizerComponent],
      providers: [VisualizerService, { provide: ToastService, useValue: toast }],
    }).compileComponents();
    fixture = TestBed.createComponent(StudioVisualizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  it('opens on the three-option visualizer library', () => {
    expect(component.selectedKind()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.visualizer-choice')).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Audio visualizer');
  });

  it('opens each renderer-specific editor with disabled export controls', () => {
    select('fluid-gradient');
    expect(component.settings.kind).toBe('fluid-gradient');
    expect(fixture.nativeElement.textContent).toContain('Surface motion');
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.export-panel button'),
    ) as HTMLButtonElement[];
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it('preserves shared project state while resetting renderer-specific controls', () => {
    select('waveform');
    component.settings.title = 'Late Night';
    component.setFormat('9:16');
    component.audioFileName.set('beat.wav');
    component.duration.set(20);
    component.trimStart.set(4);
    component.trimEnd.set(12);
    component.currentTime.set(7);
    component.changeVisualizer();
    component.selectVisualizer('vinyl');
    expect(component.settings).toMatchObject({
      kind: 'vinyl',
      title: 'Late Night',
      format: '9:16',
      speed: 54,
    });
    expect(component.audioFileName()).toBe('beat.wav');
    expect(component.trimStart()).toBe(4);
    expect(component.trimEnd()).toBe(12);
    expect(component.currentTime()).toBe(7);
  });

  it('loads a local audio file and enables export controls', async () => {
    select();
    const service = TestBed.inject(VisualizerService);
    vi.spyOn(service, 'decodeAudioData').mockResolvedValue({ duration: 12 } as AudioBuffer);
    vi.spyOn(service, 'extractPeaks').mockReturnValue([0.1, 0.4, 0.8, 0.2]);
    const file = { name: 'midnight-loop.wav', arrayBuffer: vi.fn(async () => new ArrayBuffer(8)) };
    await component.onAudioSelected({
      target: { files: [file], value: 'selected' },
    } as unknown as Event);
    fixture.detectChanges();
    expect(component.audioFileName()).toBe('midnight-loop.wav');
    expect(component.settings.title).toBe('midnight-loop');
    expect(component.trimEnd()).toBe(12);
    const exportButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.export-panel button'),
    ) as HTMLButtonElement[];
    expect(exportButtons.every((button) => button.disabled)).toBe(false);
  });

  it('shows a decode error and resets the file input', async () => {
    select();
    vi.spyOn(TestBed.inject(VisualizerService), 'decodeAudioData').mockRejectedValueOnce(
      new Error('bad audio'),
    );
    const input = {
      files: [{ name: 'broken.wav', arrayBuffer: async () => new ArrayBuffer(8) }],
      value: 'selected',
    };
    await component.onAudioSelected({ target: input } as unknown as Event);
    expect(component.statusMessage()).toBe('Could not decode this audio file.');
    expect(input.value).toBe('');
    expect(toast.error).toHaveBeenCalledWith('bad audio');
  });

  it('clamps trim handles and seeks to the selected clip start', () => {
    select();
    component.duration.set(20);
    component.trimStart.set(4);
    component.trimEnd.set(12);
    component.updateTrimStart(13);
    component.updateTrimEnd(6);
    component.seekToStart();
    expect(component.trimStart()).toBe(11.75);
    expect(component.trimEnd()).toBe(12);
    expect(component.currentTime()).toBe(11.75);
  });

  it('drags playhead and trim handles within the waveform bounds', () => {
    select();
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
    component.beginPlayheadDrag(makePointer(0));
    component.onDocumentPointerMove(makePointer(180));
    component.onDocumentPointerUp();
    expect(component.currentTime()).toBe(16);
  });

  it('updates waveform, fluid, and vinyl-specific settings', () => {
    select('waveform');
    component.selectStyle('mirror-wave');
    expect(component.waveformSettings.style).toBe('mirror-wave');
    component.changeVisualizer();
    component.selectVisualizer('fluid-gradient');
    component.fluidSettings.deformation = 88;
    component.updateSetting();
    expect(component.fluidSettings.deformation).toBe(88);
    component.changeVisualizer();
    component.selectVisualizer('vinyl');
    component.vinylSettings.speed = 70;
    component.updateSetting();
    expect(component.vinylSettings.speed).toBe(70);
  });

  it('exports PNG files and reports blank canvas failures', () => {
    select();
    component.audioFileName.set('beat.wav');
    component.settings.title = 'Late Night Loop';
    const click = vi.fn();
    const anchor = document.createElement('a');
    vi.spyOn(anchor, 'click').mockImplementation(click);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
      tag === 'a'
        ? anchor
        : document.createElementNS(
            'http://www.w3.org/1999/xhtml',
            tag,
          )) as typeof document.createElement);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) =>
      callback(new Blob(['png'], { type: 'image/png' })),
    );
    component.exportPng();
    expect(anchor.download).toBe('late-night-loop-1:1.png');
    expect(click).toHaveBeenCalled();
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementationOnce((callback: BlobCallback) =>
      callback(null),
    );
    component.exportPng();
    expect(toast.error).toHaveBeenCalledWith('Could not export PNG.');
  });

  it('starts and stops analyser-driven playback', async () => {
    select();
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
    await component.togglePlayback();
    expect(component.isPlaying()).toBe(false);
  });

  it('uses the live audio clock for animation frames while playing', () => {
    select('vinyl');
    component.audioFileName.set('beat.wav');
    component.duration.set(20);
    component.isPlaying.set(true);
    const audio = (component as unknown as { audio: HTMLAudioElement }).audio;
    audio.currentTime = 7.25;

    const frame = (
      component as unknown as { createCurrentFrame: () => { elapsed: number; progress: number } }
    ).createCurrentFrame();

    expect(frame.elapsed).toBe(7.25);
    expect(frame.progress).toBeCloseTo(7.25 / 20);
  });

  it('falls back cleanly when WebM export is unsupported', async () => {
    select('vinyl');
    component.audioFileName.set('beat.wav');
    await component.exportWebm();
    expect(toast.info).toHaveBeenCalledWith(
      'Video export is not supported in this browser. PNG export is ready.',
    );
  });
});
