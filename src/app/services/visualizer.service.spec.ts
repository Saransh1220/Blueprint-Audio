import { VisualizerService } from './visualizer.service';

describe('VisualizerService', () => {
  function createCtx() {
    return {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      globalAlpha: 1,
      textAlign: '',
      textBaseline: '',
      font: '',
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  }

  it('draws waveform bars with played/unplayed colors', () => {
    const service = new VisualizerService();
    const ctx = createCtx();
    const frequencyData = new Uint8Array(32).fill(255);

    service.drawWaveform(ctx, 320, 100, frequencyData, true, 0.5, '#ff0000');

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 320, 100);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('handles non-playing state and tiny dimensions for roundRect radius clamping', () => {
    const service = new VisualizerService();
    const ctx = createCtx();

    service.drawWaveform(ctx, 10, 2, null, false, 0, '#00ff00');

    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.arcTo).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
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

  it('draws export visualizer frames and optional title overlays', () => {
    const service = new VisualizerService();
    const ctx = createCtx();

    service.drawVisualizerFrame(
      ctx,
      1080,
      1080,
      {
        style: 'line-pulse',
        mode: 'static',
        format: '1:1',
        backgroundMode: 'gradient',
        backgroundColor: '#000000',
        gradientColor: '#220000',
        waveformColor: '#ffffff',
        accentColor: '#ff0000',
        grainAmount: 12,
        density: 24,
        intensity: 50,
        showTitle: true,
        title: 'Test Beat',
      },
      [0.1, 0.5, 1],
      0.25,
    );

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1080);
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 1080, 1080);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith('Test Beat', 540, 194.4, 842.4);
  });
});
