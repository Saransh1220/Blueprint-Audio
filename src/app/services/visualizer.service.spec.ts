import { VisualizerService } from './visualizer.service';

describe('VisualizerService', () => {
  function createCtx() {
    const gradient = { addColorStop: vi.fn() };
    return {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      textAlign: '',
      textBaseline: '',
      font: '',
    } as unknown as CanvasRenderingContext2D;
  }

  afterEach(() => vi.restoreAllMocks());

  it('creates discriminated defaults for all visualizer kinds', () => {
    const service = new VisualizerService();
    expect(service.createDefaultSettings('waveform')).toMatchObject({
      kind: 'waveform',
      style: 'classic-bars',
    });
    expect(service.createDefaultSettings('fluid-gradient')).toMatchObject({
      kind: 'fluid-gradient',
      deformation: 64,
    });
    expect(service.createDefaultSettings('vinyl')).toMatchObject({ kind: 'vinyl', speed: 54 });
  });

  it('preserves supplied shared settings when changing visualizer kind', () => {
    const service = new VisualizerService();
    const settings = service.createDefaultSettings('vinyl', {
      format: '9:16',
      title: 'Night Run',
      accentColor: '#00ff00',
    });
    expect(settings.format).toBe('9:16');
    expect(settings.title).toBe('Night Run');
    expect(settings.accentColor).toBe('#00ff00');
  });

  it('extracts normalized peaks from audio buffers', () => {
    const service = new VisualizerService();
    const samples = new Float32Array([0, 0.2, -0.8, 0.4, 0.1, -0.5, 0.9, 0.3]);
    const buffer = {
      numberOfChannels: 1,
      length: samples.length,
      getChannelData: () => samples,
    } as unknown as AudioBuffer;
    const peaks = service.extractPeaks(buffer, 4);
    expect(peaks).toHaveLength(8);
    expect(peaks[2]).toBeCloseTo(0.8);
    expect(peaks[6]).toBeCloseTo(0.9);
  });

  it('derives smoothed bass, mid, high, energy, and spectrum frame data', () => {
    const service = new VisualizerService();
    const data = new Uint8Array(32).map((_, index) => (index < 6 ? 255 : index < 19 ? 128 : 64));
    const frame = service.createFrameData(data, 32, 0.4, 2.5);
    expect(frame.spectrum).toHaveLength(32);
    expect(frame.bass).toBeGreaterThan(frame.mids);
    expect(frame.mids).toBeGreaterThan(frame.highs);
    expect(frame.progress).toBe(0.4);
    expect(frame.elapsed).toBe(2.5);
    expect(frame.energy).toBeGreaterThan(0);
  });

  it('renders waveform and vinyl frames through the shared canvas contract', () => {
    const service = new VisualizerService();
    const ctx = createCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
      kind === '2d' ? ctx : null) as typeof HTMLCanvasElement.prototype.getContext);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const frame = service.createFrameData(null, 32, 0.3, 1, service.createIdlePeaks(32));
    const wave = service.createDefaultSettings('waveform');
    wave.showTitle = true;
    wave.title = 'Test Beat';
    service.renderFrame(canvas, wave, frame);
    service.renderFrame(canvas, service.createDefaultSettings('vinyl'), frame);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1080);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('uses the canvas gradient fallback when WebGL is unavailable', () => {
    const service = new VisualizerService();
    const ctx = createCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
      kind === '2d' ? ctx : null) as typeof HTMLCanvasElement.prototype.getContext);
    const canvas = document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 960;
    service.renderFrame(
      canvas,
      service.createDefaultSettings('fluid-gradient'),
      service.createFrameData(null, 24),
    );
    expect(ctx.createRadialGradient).toHaveBeenCalled();
    expect(ctx.save).toHaveBeenCalled();
    expect(() => service.disposeCanvas(canvas)).not.toThrow();
  });
});
