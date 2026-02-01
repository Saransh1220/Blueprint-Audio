import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VisualizerService {
  constructor() {}

  drawWaveform(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frequencyData: Uint8Array | null,
    isPlaying: boolean,
    progressPercent: number,
    brandColor: string,
  ): void {
    ctx.clearRect(0, 0, width, height);

    // Bar Configuration
    const barCount = 32; // Matches fftSize/2 roughly
    const barGap = 4 * window.devicePixelRatio;
    const totalGapSpace = barGap * (barCount - 1);
    const barWidth = (width - totalGapSpace) / barCount;

    for (let i = 0; i < barCount; i++) {
      let value = 0.2; // Default quiescent height

      if (isPlaying && frequencyData) {
        // Frequency data is 0-255. Normalize to 0-1.
        const index = i;
        if (frequencyData[index] !== undefined) {
          value = Math.max(0.2, frequencyData[index] / 255);
        }
      }

      const x = i * (barWidth + barGap);
      const barHeight = value * height * 0.8; // Scale to 80% max height
      const y = (height - barHeight) / 2;

      const barProgress = i / barCount;

      // Color logic: Played vs Unplayed
      ctx.fillStyle = barProgress < progressPercent ? brandColor : 'rgba(255, 255, 255, 0.3)';

      this.roundRect(ctx, x, y, barWidth, barHeight, barWidth / 2);
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }
}
