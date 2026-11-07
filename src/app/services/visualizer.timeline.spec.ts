import { VisualizerService } from './visualizer.service';

describe('VisualizerService timeline wave', () => {
  function createCtx() {
    const gradient = { addColorStop: vi.fn() };
    return {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arcTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 120 })),
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
      createPattern: vi.fn(() => ({})),
      fillStyle: '',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      font: '',
    } as unknown as CanvasRenderingContext2D;
  }

  function canvasWith(ctx: CanvasRenderingContext2D) {
    return { width: 800, height: 450, getContext: () => ctx } as unknown as HTMLCanvasElement;
  }

  const peaks = Array.from({ length: 1000 }, (_, i) => 0.2 + (i % 10) / 14);

  it('creates defaults and carries text layers across kinds', () => {
    const service = new VisualizerService();
    const layer = service.createTextLayer({ text: '128 BPM' });
    const settings = service.createDefaultSettings('timeline-wave', { textLayers: [layer] });
    expect(settings).toMatchObject({ kind: 'timeline-wave', mode: 'dynamic', style: 'bars' });
    expect(settings.textLayers).toEqual([layer]);
    expect(service.createDefaultSettings('waveform').textLayers).toEqual([]);
  });

  it.each(['bars', 'needles', 'smooth'] as const)('renders the %s style with and without audio', (style) => {
    const service = new VisualizerService();
    const settings = { ...service.createDefaultSettings('timeline-wave'), style };
    const frame = service.createFrameData(null, 16);

    const demo = createCtx();
    service.renderFrame(canvasWith(demo), settings, frame);
    expect(demo.fillRect).toHaveBeenCalled();

    const real = createCtx();
    service.renderFrame(canvasWith(real), settings, {
      ...frame,
      timeline: { peaks, time: 42, duration: 90 },
    });
    expect(real.clearRect).toHaveBeenCalledWith(0, 0, 800, 450);
  });

  it('scrolls: bars shift left as time advances', () => {
    const service = new VisualizerService();
    const settings = service.createDefaultSettings('timeline-wave');
    const xs = [10, 10.04].map((time) => {
      const ctx = createCtx();
      const rects: number[] = [];
      (ctx.moveTo as ReturnType<typeof vi.fn>).mockImplementation((x: number) => rects.push(x));
      service.renderFrame(canvasWith(ctx), settings, {
        ...service.createFrameData(null, 16),
        timeline: { peaks, time, duration: 90 },
      });
      return rects[0];
    });
    expect(xs[0]).not.toBe(xs[1]);
  });

  it('draws text layers, uppercasing and skipping empty ones', () => {
    const service = new VisualizerService();
    const settings = service.createDefaultSettings('timeline-wave', {
      textLayers: [
        service.createTextLayer({ text: 'a minor', uppercase: true, x: 0.25, y: 0.5 }),
        service.createTextLayer({ text: '   ' }),
      ],
    });
    const ctx = createCtx();
    service.renderFrame(canvasWith(ctx), settings, service.createFrameData(null, 16));
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).toHaveBeenCalledWith('A MINOR', 200, 225, 800 * 0.94);
  });

  it('measures a layer as canvas fractions', () => {
    const service = new VisualizerService();
    const box = service.measureTextLayer(service.createTextLayer({ text: 'Hello', size: 10 }), 1000, 500);
    expect(box.width).toBeGreaterThan(0);
    expect(box.width).toBeLessThanOrEqual(0.94);
    expect(box.height).toBeCloseTo((100 * 1.2) / 500);
  });
});
