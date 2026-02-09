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
      fillStyle: '',
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
});
