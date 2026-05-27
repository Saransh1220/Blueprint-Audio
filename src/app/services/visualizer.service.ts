import { Injectable } from '@angular/core';

export type VisualizerStyle = 'classic-bars' | 'mirror-wave' | 'line-pulse' | 'stacked-bars';
export type VisualizerMode = 'static' | 'dynamic';
export type VisualizerFormat = '1:1' | '9:16' | '16:9';
export type VisualizerBackgroundMode = 'solid' | 'gradient';

export interface VisualizerSettings {
  style: VisualizerStyle;
  mode: VisualizerMode;
  format: VisualizerFormat;
  backgroundMode: VisualizerBackgroundMode;
  backgroundColor: string;
  gradientColor: string;
  waveformColor: string;
  accentColor: string;
  grainAmount: number;
  density: number;
  intensity: number;
  showTitle: boolean;
  title: string;
}

@Injectable({
  providedIn: 'root',
})
export class VisualizerService {
  private grainFrame = 0;

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

  getCanvasSize(format: VisualizerFormat, longEdge = 1080) {
    if (format === '9:16') return { width: Math.round((longEdge * 9) / 16), height: longEdge };
    if (format === '16:9') return { width: longEdge, height: Math.round((longEdge * 9) / 16) };
    return { width: longEdge, height: longEdge };
  }

  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error('Audio decoding is unavailable in this browser.');
    }

    const audioContext = new AudioContextCtor();
    try {
      return await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      if (audioContext.state !== 'closed') {
        void audioContext.close();
      }
    }
  }

  extractPeaks(audioBuffer: AudioBuffer, sampleCount: number): number[] {
    const count = Math.max(8, Math.floor(sampleCount));
    const channels = Math.max(1, audioBuffer.numberOfChannels);
    const channelData = Array.from({ length: channels }, (_, channel) =>
      audioBuffer.getChannelData(channel),
    );
    const samplesPerPeak = Math.max(1, Math.floor(audioBuffer.length / count));

    return Array.from({ length: count }, (_, peakIndex) => {
      const start = peakIndex * samplesPerPeak;
      const end = Math.min(audioBuffer.length, start + samplesPerPeak);
      let max = 0;

      for (let i = start; i < end; i++) {
        for (const data of channelData) {
          max = Math.max(max, Math.abs(data[i] ?? 0));
        }
      }

      return Math.max(0.04, Math.min(1, max));
    });
  }

  normalizeFrequencyData(data: Uint8Array | null, sampleCount: number): number[] {
    const count = Math.max(8, Math.floor(sampleCount));
    if (!data?.length) return this.createIdlePeaks(count);

    return Array.from({ length: count }, (_, index) => {
      const sourceIndex = Math.floor((index / count) * data.length);
      const value = data[sourceIndex] ?? 0;
      return Math.max(0.05, Math.min(1, value / 255));
    });
  }

  createIdlePeaks(sampleCount: number): number[] {
    const count = Math.max(8, Math.floor(sampleCount));
    return Array.from({ length: count }, (_, index) => 0.18 + ((index * 17) % 29) / 100);
  }

  drawVisualizerFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: VisualizerSettings,
    values: number[],
    progress = 0,
  ) {
    const safeValues = values.length ? values : this.createIdlePeaks(settings.density);
    const clippedProgress = Math.max(0, Math.min(1, progress));

    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height, settings);

    const padX = width * 0.1;
    const centerY = height * 0.5;
    const visualHeight = height * Math.max(0.18, Math.min(0.72, settings.intensity / 100));
    const usableWidth = width - padX * 2;

    if (settings.style === 'line-pulse') {
      this.drawLinePulse(ctx, safeValues, padX, centerY, usableWidth, visualHeight, settings);
    } else if (settings.style === 'mirror-wave') {
      this.drawMirrorWave(ctx, safeValues, padX, centerY, usableWidth, visualHeight, settings);
    } else {
      this.drawBars(
        ctx,
        safeValues,
        padX,
        centerY,
        usableWidth,
        visualHeight,
        settings,
        clippedProgress,
      );
    }

    if (settings.showTitle && settings.title.trim()) {
      this.drawTitle(ctx, width, height, settings);
    }

    this.drawFilmGrain(ctx, width, height, settings.grainAmount);
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: VisualizerSettings,
  ) {
    if (settings.backgroundMode === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, settings.backgroundColor);
      gradient.addColorStop(1, settings.gradientColor);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = settings.backgroundColor;
    }
    ctx.fillRect(0, 0, width, height);
  }

  private drawFilmGrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    amount: number,
  ) {
    const alpha = Math.max(0, Math.min(0.075, amount / 160));
    if (alpha <= 0) return;

    const frameSeed = this.grainFrame++ % 997;
    const dotSize = Math.max(1, Math.round(Math.min(width, height) / 900));
    const spacing = dotSize * 7;
    const columns = Math.ceil(width / spacing);
    const rows = Math.ceil(height / spacing);

    ctx.save();
    ctx.globalAlpha = alpha;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const seed = (x * 928371 + y * 364479 + frameSeed * 101 + 17) % 997;
        const bright = seed % 2 === 0;
        ctx.fillStyle = bright ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
        ctx.fillRect(
          x * spacing + ((seed * 7) % spacing),
          y * spacing + ((seed * 11) % spacing),
          dotSize,
          dotSize,
        );
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawBars(
    ctx: CanvasRenderingContext2D,
    values: number[],
    x: number,
    centerY: number,
    width: number,
    height: number,
    settings: VisualizerSettings,
    progress: number,
  ) {
    const gapRatio = settings.style === 'stacked-bars' ? 0.55 : 0.35;
    const gap = Math.max(2, Math.min(10, width / values.length) * gapRatio);
    const barWidth = Math.max(2, (width - gap * (values.length - 1)) / values.length);

    values.forEach((value, index) => {
      const barHeight = Math.max(3, value * height);
      const barX = x + index * (barWidth + gap);
      const barY = centerY - barHeight / 2;
      const barProgress = values.length <= 1 ? 1 : index / (values.length - 1);
      ctx.fillStyle = barProgress <= progress ? settings.accentColor : settings.waveformColor;
      this.roundRect(ctx, barX, barY, barWidth, barHeight, Math.min(barWidth / 2, 10));
    });
  }

  private drawMirrorWave(
    ctx: CanvasRenderingContext2D,
    values: number[],
    x: number,
    centerY: number,
    width: number,
    height: number,
    settings: VisualizerSettings,
  ) {
    const gap = Math.max(2, Math.min(8, width / values.length) * 0.3);
    const barWidth = Math.max(2, (width - gap * (values.length - 1)) / values.length);
    ctx.fillStyle = settings.waveformColor;

    values.forEach((value, index) => {
      const halfHeight = Math.max(2, (value * height) / 2);
      const barX = x + index * (barWidth + gap);
      this.roundRect(ctx, barX, centerY - halfHeight, barWidth, halfHeight, barWidth / 2);
      this.roundRect(ctx, barX, centerY, barWidth, halfHeight, barWidth / 2);
    });
  }

  private drawLinePulse(
    ctx: CanvasRenderingContext2D,
    values: number[],
    x: number,
    centerY: number,
    width: number,
    height: number,
    settings: VisualizerSettings,
  ) {
    ctx.strokeStyle = settings.waveformColor;
    ctx.lineWidth = Math.max(3, width / 220);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    values.forEach((value, index) => {
      const pointX = x + (index / Math.max(1, values.length - 1)) * width;
      const direction = index % 2 === 0 ? -1 : 1;
      const pointY = centerY + direction * value * height * 0.42;
      if (index === 0) {
        ctx.moveTo(pointX, pointY);
      } else {
        ctx.lineTo(pointX, pointY);
      }
    });

    ctx.stroke();

    ctx.strokeStyle = settings.accentColor;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x + width, centerY);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawTitle(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: VisualizerSettings,
  ) {
    ctx.fillStyle = settings.accentColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(24, Math.round(width * 0.045))}px sans-serif`;
    ctx.fillText(settings.title.trim(), width / 2, height * 0.18, width * 0.78);
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
