import { VisualizerService } from './visualizer.service';

describe('VisualizerService (extra)', () => {
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
    } as unknown as CanvasRenderingContext2D;
  }

  const win = window as unknown as Record<string, unknown>;
  let origAudio: unknown;
  let origWebkit: unknown;

  beforeEach(() => {
    origAudio = win['AudioContext'];
    origWebkit = win['webkitAudioContext'];
  });

  afterEach(() => {
    win['AudioContext'] = origAudio;
    win['webkitAudioContext'] = origWebkit;
    vi.restoreAllMocks();
  });

  function canvasWith(ctx: CanvasRenderingContext2D, w = 1080, h = 1080) {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
      kind === '2d' ? ctx : null) as typeof HTMLCanvasElement.prototype.getContext);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  it('computes canvas sizes per format', () => {
    const service = new VisualizerService();
    expect(service.getCanvasSize('9:16')).toEqual({ width: 608, height: 1080 });
    expect(service.getCanvasSize('16:9', 1920)).toEqual({ width: 1920, height: 1080 });
    expect(service.getCanvasSize('1:1', 500)).toEqual({ width: 500, height: 500 });
  });

  it('draws the legacy waveform for playing and idle states', () => {
    const service = new VisualizerService();
    const ctx = createCtx();
    service.drawWaveform(ctx, 400, 100, new Uint8Array(32).fill(200), true, 0.5, '#f00');
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 400, 100);
    expect(ctx.arcTo).toHaveBeenCalled();
    const fill = ctx.fill as unknown as ReturnType<typeof vi.fn>;
    const before = fill.mock.calls.length;
    service.drawWaveform(ctx, 400, 100, null, false, 0, '#f00');
    expect(fill.mock.calls.length - before).toBe(32);
    service.drawWaveform(ctx, 400, 100, new Uint8Array(4), true, 1, '#f00');
  });

  it('decodes audio data and closes the context', async () => {
    const service = new VisualizerService();
    const close = vi.fn();
    const decoded = { duration: 1 };
    class FakeCtx {
      state = 'running';
      decodeAudioData = vi.fn(async () => decoded);
      close = close;
    }
    win['AudioContext'] = FakeCtx;
    await expect(service.decodeAudioData(new ArrayBuffer(8))).resolves.toBe(decoded);
    expect(close).toHaveBeenCalled();

    class ClosedCtx extends FakeCtx {
      override state = 'closed';
      override decodeAudioData = vi.fn(async () => {
        throw new Error('bad');
      });
    }
    win['AudioContext'] = ClosedCtx;
    close.mockClear();
    await expect(service.decodeAudioData(new ArrayBuffer(8))).rejects.toThrow('bad');
    expect(close).not.toHaveBeenCalled();
  });

  it('falls back to webkitAudioContext and throws when none exist', async () => {
    const service = new VisualizerService();
    win['AudioContext'] = undefined;
    win['webkitAudioContext'] = undefined;
    await expect(service.decodeAudioData(new ArrayBuffer(1))).rejects.toThrow(/unavailable/);
    class Webkit {
      state = 'running';
      decodeAudioData = async () => ({ ok: true });
      close = vi.fn();
    }
    win['webkitAudioContext'] = Webkit;
    await expect(service.decodeAudioData(new ArrayBuffer(1))).resolves.toEqual({ ok: true });
  });

  it('extracts peaks across channels with floor values', () => {
    const service = new VisualizerService();
    const a = new Float32Array(4);
    const b = new Float32Array([0, 2, 0, 0]);
    const buffer = {
      numberOfChannels: 2,
      length: 4,
      getChannelData: (c: number) => (c === 0 ? a : b),
    } as unknown as AudioBuffer;
    const peaks = service.extractPeaks(buffer, 2);
    expect(peaks).toHaveLength(8);
    expect(Math.max(...peaks)).toBe(1);
    const zero = { numberOfChannels: 0, length: 0, getChannelData: () => new Float32Array(0) };
    expect(service.extractPeaks(zero as unknown as AudioBuffer, 8).every((p) => p === 0.04)).toBe(
      true,
    );
  });

  it('normalizes frequency data and falls back to idle peaks', () => {
    const service = new VisualizerService();
    expect(service.normalizeFrequencyData(null, 10)).toEqual(service.createIdlePeaks(10));
    expect(service.normalizeFrequencyData(new Uint8Array(0), 3)).toHaveLength(8);
    const out = service.normalizeFrequencyData(new Uint8Array([0, 255]), 8);
    expect(out[0]).toBe(0.05);
    expect(out[7]).toBe(1);
  });

  it('createFrameData uses fallback, idle peaks and smoothing', () => {
    const service = new VisualizerService();
    const withFallback = service.createFrameData(null, 8, 2, 0, [0.1, 0.9, 0.5]);
    expect(withFallback.spectrum).toHaveLength(8);
    expect(withFallback.progress).toBe(1);
    const idle = service.createFrameData(new Uint8Array(0), 8, -1);
    expect(idle.progress).toBe(0);
    const prev = { ...idle, bass: 1, mids: 1, highs: 1 };
    const smoothed = service.createFrameData(null, 8, 0, 0, undefined, prev);
    expect(smoothed.bass).toBeGreaterThan(idle.bass);
    expect(smoothed.bass).toBeLessThan(1);
  });

  it('renders every waveform style, background mode and title', () => {
    const service = new VisualizerService();
    const ctx = createCtx();
    const canvas = canvasWith(ctx, 540, 960);
    const frame = service.createFrameData(null, 16, 0.5, 1);
    for (const style of ['classic-bars', 'stacked-bars', 'mirror-wave', 'line-pulse'] as const) {
      const s = service.createDefaultSettings('waveform', {
        backgroundMode: 'gradient',
        showTitle: true,
        title: ' Hi ',
      });
      if (s.kind === 'waveform') s.style = style;
      vi.mocked(ctx.stroke).mockClear();
      service.renderFrame(canvas, s, frame);
      if (style === 'line-pulse') expect(ctx.stroke).toHaveBeenCalled();
    }
    expect(ctx.createLinearGradient).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith('Hi', 270, 960 * 0.18, 540 * 0.78);
    vi.mocked(ctx.createLinearGradient).mockClear();
    service.renderFrame(canvas, service.createDefaultSettings('waveform', { grainAmount: 0 }), frame);
    expect(ctx.createLinearGradient).not.toHaveBeenCalled();
  });

  it('renders vinyl in portrait and landscape with custom and default labels', () => {
    const service = new VisualizerService();
    const ctx = createCtx();
    const frame = service.createFrameData(null, 16, 0.5, 1);
    service.renderFrame(
      canvasWith(ctx, 540, 960),
      service.createDefaultSettings('vinyl', { title: 'abc' }),
      frame,
    );
    expect(ctx.fillText).toHaveBeenCalledWith('ABC', 0, expect.any(Number), expect.any(Number));
    service.renderFrame(canvasWith(ctx, 960, 540), service.createDefaultSettings('vinyl'), frame);
    expect(ctx.fillText).toHaveBeenCalledWith(
      'WAVEYARD',
      0,
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('skips drawing when no 2d context is available', () => {
    const service = new VisualizerService();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const canvas = document.createElement('canvas');
    expect(() =>
      service.renderFrame(
        canvas,
        service.createDefaultSettings('vinyl'),
        service.createFrameData(null, 8),
      ),
    ).not.toThrow();
    expect(() => service.disposeCanvas()).not.toThrow();
  });

  it('caches a failed WebGL probe and uses the 2d fallback', () => {
    const service = new VisualizerService();
    const ctx = createCtx();
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) => {
      if (kind === '2d') return ctx;
      throw new Error('no gl');
    }) as never);
    const canvas = document.createElement('canvas');
    const settings = service.createDefaultSettings('fluid-gradient');
    const frame = service.createFrameData(null, 8);
    service.renderFrame(canvas, settings, frame);
    spy.mockImplementation(((kind: string) => (kind === '2d' ? ctx : null)) as never);
    service.renderFrame(canvas, settings, frame);
    expect(ctx.createRadialGradient).toHaveBeenCalled();
    expect((service as unknown as { webglAvailable: boolean }).webglAvailable).toBe(false);
  });
});
