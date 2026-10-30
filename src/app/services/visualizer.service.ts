import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { DEFAULT_VISUALIZER_FONT, loadVisualizerFont } from './visualizer-fonts';

export type VisualizerKind = 'waveform' | 'fluid-gradient' | 'vinyl' | 'timeline-wave';
export type TimelineWaveStyle = 'bars' | 'needles' | 'smooth';
export type VisualizerStyle = 'classic-bars' | 'mirror-wave' | 'line-pulse' | 'stacked-bars';
export type VisualizerMode = 'static' | 'dynamic';
export type VisualizerFormat = '1:1' | '9:16' | '16:9';
export type VisualizerBackgroundMode = 'solid' | 'gradient';

export interface TextLayer {
  id: string;
  text: string;
  fontFamily: string;
  weight: number;
  italic: boolean;
  /** Font size as a percentage of the canvas width. */
  size: number;
  color: string;
  /** 0-100. */
  opacity: number;
  /** Letter spacing in hundredths of an em. */
  letterSpacing: number;
  uppercase: boolean;
  /** 0-100 soft glow around the glyphs. */
  glow: number;
  /** Centre of the text as a 0-1 fraction of the canvas. */
  x: number;
  y: number;
}

export interface CommonVisualizerSettings {
  kind: VisualizerKind;
  mode: VisualizerMode;
  format: VisualizerFormat;
  backgroundMode: VisualizerBackgroundMode;
  backgroundColor: string;
  gradientColor: string;
  waveformColor: string;
  accentColor: string;
  grainAmount: number;
  showTitle: boolean;
  title: string;
  textLayers: TextLayer[];
}

export interface WaveformVisualizerSettings extends CommonVisualizerSettings {
  kind: 'waveform';
  style: VisualizerStyle;
  density: number;
  intensity: number;
}

export interface FluidGradientVisualizerSettings extends CommonVisualizerSettings {
  kind: 'fluid-gradient';
  deformation: number;
  rotation: number;
  responsiveness: number;
  blendSoftness: number;
}

export interface VinylVisualizerSettings extends CommonVisualizerSettings {
  kind: 'vinyl';
  speed: number;
  grooveResponse: number;
  density: number;
  intensity: number;
}

export interface TimelineWaveVisualizerSettings extends CommonVisualizerSettings {
  kind: 'timeline-wave';
  style: TimelineWaveStyle;
  /** Bars visible across the canvas. */
  density: number;
  /** Seconds of audio visible across the canvas. */
  windowSeconds: number;
  /** Horizontal playhead position, 0-100 % of the canvas width. */
  playhead: number;
  intensity: number;
  noiseAmount: number;
  noiseSize: number;
  vignette: number;
  glow: number;
}

export type VisualizerSettings =
  | WaveformVisualizerSettings
  | FluidGradientVisualizerSettings
  | VinylVisualizerSettings
  | TimelineWaveVisualizerSettings;

export interface VisualizerFrameData {
  spectrum: number[];
  bass: number;
  mids: number;
  highs: number;
  energy: number;
  progress: number;
  elapsed: number;
  /** Whole-track peaks plus the absolute playback time, for scrolling waveforms. */
  timeline?: { peaks: number[]; time: number; duration: number };
}

export interface VisualizerRenderer {
  render(settings: VisualizerSettings, frame: VisualizerFrameData): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

const DEFAULT_FRAME: VisualizerFrameData = {
  spectrum: [],
  bass: 0.2,
  mids: 0.16,
  highs: 0.12,
  energy: 0.16,
  progress: 0,
  elapsed: 0,
};

class ThreeFluidRenderer implements VisualizerRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
  private geometry = new THREE.PlaneGeometry(3.5, 3.5, 72, 72);
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private titleCanvas = document.createElement('canvas');
  private titleTexture!: THREE.CanvasTexture;
  private titleMaterial!: THREE.SpriteMaterial;
  private titleSprite!: THREE.Sprite;
  private titleKey = '';
  private renderWidth = 0;
  private renderHeight = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera.position.z = 2.7;

    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0.2 },
        uMids: { value: 0.16 },
        uHighs: { value: 0.12 },
        uDeform: { value: 0.55 },
        uSoftness: { value: 0.6 },
        uGrain: { value: 0.04 },
        uColorA: { value: new THREE.Color('#10100e') },
        uColorB: { value: new THREE.Color('#3b0710') },
        uColorC: { value: new THREE.Color('#ff4d68') },
        uColorD: { value: new THREE.Color('#d4c5ff') },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMids;
        uniform float uDeform;
        varying vec2 vUv;
        varying float vLift;
        void main() {
          vUv = uv;
          vec3 p = position;
          float waveA = sin(p.x * 3.2 + uTime * 0.75) * cos(p.y * 2.4 - uTime * 0.55);
          float waveB = sin((p.x + p.y) * 5.0 - uTime * 0.9) * 0.34;
          float lift = (waveA + waveB) * uDeform * (0.12 + uBass * 0.28 + uMids * 0.12);
          p.z += lift;
          vLift = lift;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBass;
        uniform float uMids;
        uniform float uHighs;
        uniform float uSoftness;
        uniform float uGrain;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;
        uniform vec3 uColorD;
        varying vec2 vUv;
        varying float vLift;
        void main() {
          vec2 uv = vUv;
          float drift = sin(uTime * 0.28) * 0.09;
          float a = smoothstep(0.05, 0.95, uv.x + drift + sin(uv.y * 4.0 + uTime * 0.35) * 0.12);
          float b = smoothstep(0.02, 0.98, uv.y - drift + cos(uv.x * 3.2 - uTime * 0.3) * 0.14);
          vec3 base = mix(uColorA, uColorB, a);
          vec3 glow = mix(uColorC, uColorD, b);
          float pulse = clamp((uBass * 0.62 + uMids * 0.28 + uHighs * 0.1), 0.0, 1.0);
          float bloom = smoothstep(0.12 + uSoftness * 0.2, 0.94, b + vLift * 1.8 + pulse * 0.22);
          vec3 color = mix(base, glow, bloom * (0.42 + pulse * 0.5));
          color += vec3(1.0, 0.92, 0.84) * max(vLift, 0.0) * (0.13 + uHighs * 0.2);
          float noise = fract(sin(dot(uv * (820.0 + uTime), vec2(12.9898, 78.233))) * 43758.5453);
          color += (noise - 0.5) * uGrain;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
    this.titleCanvas.width = 1024;
    this.titleCanvas.height = 160;
    this.titleTexture = new THREE.CanvasTexture(this.titleCanvas);
    this.titleTexture.colorSpace = THREE.SRGBColorSpace;
    this.titleMaterial = new THREE.SpriteMaterial({
      map: this.titleTexture,
      transparent: true,
      depthTest: false,
    });
    this.titleSprite = new THREE.Sprite(this.titleMaterial);
    this.titleSprite.position.set(0, 0.86, 0.55);
    this.titleSprite.scale.set(2.1, 0.33, 1);
    this.titleSprite.visible = false;
    this.scene.add(this.titleSprite);
    this.resize(canvas.width, canvas.height);
  }

  render(settings: VisualizerSettings, frame: VisualizerFrameData) {
    if (settings.kind !== 'fluid-gradient') return;
    const response = settings.responsiveness / 100;
    this.material.uniforms['uTime'].value = frame.elapsed * (0.35 + response * 1.1);
    this.material.uniforms['uBass'].value = frame.bass * (0.6 + response * 0.9);
    this.material.uniforms['uMids'].value = frame.mids * (0.6 + response * 0.9);
    this.material.uniforms['uHighs'].value = frame.highs * (0.6 + response * 0.9);
    this.material.uniforms['uDeform'].value = settings.deformation / 100;
    this.material.uniforms['uSoftness'].value = settings.blendSoftness / 100;
    this.material.uniforms['uGrain'].value = settings.grainAmount / 180;
    this.material.uniforms['uColorA'].value.set(settings.backgroundColor);
    this.material.uniforms['uColorB'].value.set(settings.gradientColor);
    this.material.uniforms['uColorC'].value.set(settings.accentColor);
    this.material.uniforms['uColorD'].value.set(settings.waveformColor);
    this.mesh.rotation.z = frame.elapsed * (settings.rotation / 100) * 0.16;
    this.mesh.rotation.x = Math.sin(frame.elapsed * 0.23) * 0.08 + frame.bass * 0.05;
    this.mesh.rotation.y = Math.cos(frame.elapsed * 0.19) * 0.07 + frame.mids * 0.04;
    this.updateTitle(settings);
    this.renderer.setClearColor(settings.backgroundColor, 1);
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number) {
    if (width === this.renderWidth && height === this.renderHeight) return;
    this.renderWidth = width;
    this.renderHeight = height;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  destroy() {
    this.geometry.dispose();
    this.material.dispose();
    this.titleTexture.dispose();
    this.titleMaterial.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private updateTitle(settings: FluidGradientVisualizerSettings) {
    const key = `${settings.showTitle}|${settings.title}|${settings.accentColor}`;
    this.titleSprite.visible = settings.showTitle && !!settings.title.trim();
    if (!this.titleSprite.visible || key === this.titleKey) return;
    this.titleKey = key;
    const ctx = this.titleCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.titleCanvas.width, this.titleCanvas.height);
    ctx.fillStyle = settings.accentColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 72px sans-serif';
    ctx.fillText(
      settings.title.trim(),
      this.titleCanvas.width / 2,
      this.titleCanvas.height / 2,
      900,
    );
    this.titleTexture.needsUpdate = true;
  }
}

@Injectable({ providedIn: 'root' })
export class VisualizerService {
  private grainFrame = 0;
  private fluidRenderers = new Map<HTMLCanvasElement, ThreeFluidRenderer>();
  private webglAvailable: boolean | undefined;

  createDefaultSettings(
    kind: VisualizerKind,
    shared?: Partial<CommonVisualizerSettings>,
  ): VisualizerSettings {
    const common: CommonVisualizerSettings = {
      kind,
      mode: shared?.mode ?? 'dynamic',
      format: shared?.format ?? '1:1',
      backgroundMode: shared?.backgroundMode ?? (kind === 'waveform' ? 'solid' : 'gradient'),
      backgroundColor: shared?.backgroundColor ?? '#10100e',
      gradientColor: shared?.gradientColor ?? '#3b0710',
      waveformColor: shared?.waveformColor ?? '#f0e9d6',
      accentColor: shared?.accentColor ?? '#ff4d68',
      grainAmount: shared?.grainAmount ?? 6,
      showTitle: shared?.showTitle ?? false,
      title: shared?.title ?? '',
      textLayers: shared?.textLayers ?? [],
    };
    if (kind === 'fluid-gradient') {
      return {
        ...common,
        kind,
        deformation: 64,
        rotation: 46,
        responsiveness: 72,
        blendSoftness: 62,
      };
    }
    if (kind === 'vinyl') {
      return { ...common, kind, speed: 54, grooveResponse: 68, density: 64, intensity: 48 };
    }
    if (kind === 'timeline-wave') {
      return {
        ...common,
        kind,
        mode: 'dynamic',
        backgroundMode: shared?.backgroundMode ?? 'gradient',
        style: 'bars',
        density: 96,
        windowSeconds: 12,
        playhead: 50,
        intensity: 46,
        noiseAmount: 42,
        noiseSize: 2,
        vignette: 55,
        glow: 40,
      };
    }
    return { ...common, kind, style: 'classic-bars', density: 84, intensity: 54 };
  }

  createTextLayer(preset: Partial<TextLayer> = {}): TextLayer {
    return {
      id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      text: 'Title',
      fontFamily: DEFAULT_VISUALIZER_FONT,
      weight: 400,
      italic: false,
      size: 9,
      color: '#f0e9d6',
      opacity: 100,
      letterSpacing: 4,
      uppercase: false,
      glow: 0,
      x: 0.5,
      y: 0.2,
      ...preset,
    };
  }

  /** Size of a layer as 0-1 fractions of the canvas (for drag hit-boxes). */
  measureTextLayer(layer: TextLayer, width: number, height: number) {
    const px = (width * layer.size) / 100;
    const text = this.layerText(layer);
    const ctx = this.measureContext();
    let measured = text.length * px * 0.55;
    if (ctx && typeof ctx.measureText === 'function') {
      this.applyTextFont(ctx, layer, px);
      measured = ctx.measureText(text).width;
    }
    const w = Math.min(measured, width * 0.94);
    return { width: w / width, height: (px * 1.2) / height };
  }

  async prepareFonts(layers: TextLayer[]): Promise<void> {
    await Promise.all(layers.map((l) => loadVisualizerFont(l.fontFamily, l.weight, l.italic)));
  }

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
    const barCount = 32;
    const ratio = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
    const barGap = 4 * ratio;
    const barWidth = (width - barGap * (barCount - 1)) / barCount;
    for (let i = 0; i < barCount; i++) {
      const value = isPlaying && frequencyData ? Math.max(0.2, (frequencyData[i] ?? 0) / 255) : 0.2;
      const x = i * (barWidth + barGap);
      const barHeight = value * height * 0.8;
      ctx.fillStyle = i / barCount < progressPercent ? brandColor : 'rgba(255,255,255,.3)';
      this.roundRect(ctx, x, (height - barHeight) / 2, barWidth, barHeight, barWidth / 2);
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
    if (!AudioContextCtor) throw new Error('Audio decoding is unavailable in this browser.');
    const audioContext = new AudioContextCtor();
    try {
      return await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      if (audioContext.state !== 'closed') void audioContext.close();
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
        for (const data of channelData) max = Math.max(max, Math.abs(data[i] ?? 0));
      }
      return Math.max(0.04, Math.min(1, max));
    });
  }

  normalizeFrequencyData(data: Uint8Array | null, sampleCount: number): number[] {
    const count = Math.max(8, Math.floor(sampleCount));
    if (!data?.length) return this.createIdlePeaks(count);
    return Array.from({ length: count }, (_, index) => {
      const sourceIndex = Math.floor((index / count) * data.length);
      return Math.max(0.05, Math.min(1, (data[sourceIndex] ?? 0) / 255));
    });
  }

  createFrameData(
    data: Uint8Array | null,
    sampleCount: number,
    progress = 0,
    elapsed = 0,
    fallback?: number[],
    previous?: VisualizerFrameData,
  ): VisualizerFrameData {
    const spectrum = data?.length
      ? this.normalizeFrequencyData(data, sampleCount)
      : this.resample(fallback?.length ? fallback : this.createIdlePeaks(sampleCount), sampleCount);
    const average = (start: number, end: number) => {
      const slice = spectrum.slice(start, Math.max(start + 1, end));
      return slice.reduce((sum, value) => sum + value, 0) / Math.max(1, slice.length);
    };
    const bassEnd = Math.max(1, Math.floor(spectrum.length * 0.18));
    const midEnd = Math.max(bassEnd + 1, Math.floor(spectrum.length * 0.58));
    const raw = {
      bass: average(0, bassEnd),
      mids: average(bassEnd, midEnd),
      highs: average(midEnd, spectrum.length),
    };
    const smooth = (next: number, prior: number) => prior * 0.68 + next * 0.32;
    const bass = previous ? smooth(raw.bass, previous.bass) : raw.bass;
    const mids = previous ? smooth(raw.mids, previous.mids) : raw.mids;
    const highs = previous ? smooth(raw.highs, previous.highs) : raw.highs;
    return {
      spectrum,
      bass,
      mids,
      highs,
      energy: bass * 0.46 + mids * 0.36 + highs * 0.18,
      progress: Math.max(0, Math.min(1, progress)),
      elapsed,
    };
  }

  createIdlePeaks(sampleCount: number): number[] {
    const count = Math.max(8, Math.floor(sampleCount));
    return Array.from({ length: count }, (_, index) => 0.18 + ((index * 17) % 29) / 100);
  }

  renderFrame(canvas: HTMLCanvasElement, settings: VisualizerSettings, frame: VisualizerFrameData) {
    if (settings.kind === 'fluid-gradient' && this.supportsWebGL()) {
      let renderer = this.fluidRenderers.get(canvas);
      if (!renderer) {
        renderer = new ThreeFluidRenderer(canvas);
        this.fluidRenderers.set(canvas, renderer);
      }
      renderer.resize(canvas.width, canvas.height);
      renderer.render(settings, frame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (settings.kind === 'fluid-gradient')
      this.drawFluidFallback(ctx, canvas.width, canvas.height, settings, frame);
    else if (settings.kind === 'vinyl')
      this.drawVinyl(ctx, canvas.width, canvas.height, settings, frame);
    else if (settings.kind === 'timeline-wave')
      this.drawTimelineWave(ctx, canvas.width, canvas.height, settings, frame);
    else this.drawWaveformFrame(ctx, canvas.width, canvas.height, settings, frame);
  }

  disposeCanvas(canvas?: HTMLCanvasElement) {
    if (!canvas) return;
    this.fluidRenderers.get(canvas)?.destroy();
    this.fluidRenderers.delete(canvas);
  }

  private supportsWebGL() {
    if (this.webglAvailable !== undefined) return this.webglAvailable;
    if (typeof document === 'undefined') return false;
    try {
      const probe = document.createElement('canvas');
      const context = probe.getContext('webgl2') || probe.getContext('webgl');
      this.webglAvailable = !!context && typeof context.getExtension === 'function';
    } catch {
      this.webglAvailable = false;
    }
    return this.webglAvailable;
  }

  private drawWaveformFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: WaveformVisualizerSettings,
    frame: VisualizerFrameData,
  ) {
    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height, settings);
    const padX = width * 0.1;
    const centerY = height * 0.5;
    const visualHeight = height * Math.max(0.18, Math.min(0.72, settings.intensity / 100));
    const usableWidth = width - padX * 2;
    if (settings.style === 'line-pulse')
      this.drawLinePulse(ctx, frame.spectrum, padX, centerY, usableWidth, visualHeight, settings);
    else if (settings.style === 'mirror-wave')
      this.drawMirrorWave(ctx, frame.spectrum, padX, centerY, usableWidth, visualHeight, settings);
    else
      this.drawBars(
        ctx,
        frame.spectrum,
        padX,
        centerY,
        usableWidth,
        visualHeight,
        settings,
        frame.progress,
      );
    this.drawOverlays(ctx, width, height, settings);
  }

  private drawFluidFallback(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: FluidGradientVisualizerSettings,
    frame: VisualizerFrameData,
  ) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    const blobs = [
      [settings.gradientColor, 0.24 + frame.bass * 0.18, 0.32, 0.34],
      [settings.accentColor, 0.72, 0.33 + frame.mids * 0.18, 0.3],
      [settings.waveformColor, 0.48 + Math.sin(frame.elapsed * 0.4) * 0.12, 0.75, 0.24],
    ] as const;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const [color, x, y, radius] of blobs) {
      const gradient = ctx.createRadialGradient(
        width * x,
        height * y,
        0,
        width * x,
        height * y,
        Math.max(width, height) * radius,
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.48 + frame.energy * 0.28;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
    this.drawOverlays(ctx, width, height, settings, true, false);
  }

  private drawVinyl(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: VinylVisualizerSettings,
    frame: VisualizerFrameData,
  ) {
    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height, settings);
    const min = Math.min(width, height);
    const cx = width / 2;
    const cy = height * (height > width ? 0.43 : 0.44);
    const radius =
      min * (height > width ? 0.34 : 0.31) * (1 + (frame.bass * settings.grooveResponse) / 1400);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(frame.elapsed * (0.35 + settings.speed / 52));
    const disc = ctx.createRadialGradient(
      -radius * 0.22,
      -radius * 0.2,
      radius * 0.05,
      0,
      0,
      radius,
    );
    disc.addColorStop(0, '#4c4b49');
    disc.addColorStop(0.34, '#161514');
    disc.addColorStop(1, '#030303');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,233,214,.16)';
    ctx.lineWidth = Math.max(1, min * 0.0014);
    for (let i = 1; i <= 18; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * (0.34 + i * 0.035), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = settings.accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.27, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = settings.backgroundColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = settings.waveformColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(12, radius * 0.085)}px sans-serif`;
    const label = (settings.title.trim() || 'WAVEYARD').toUpperCase().slice(0, 22);
    ctx.fillText(label, 0, -radius * 0.08, radius * 0.42);
    ctx.font = `500 ${Math.max(8, radius * 0.045)}px monospace`;
    ctx.fillText('SIDE A  •  33 RPM', 0, radius * 0.09, radius * 0.42);
    ctx.restore();

    const barAreaY = Math.min(height * 0.82, cy + radius + min * 0.08);
    const x = width * 0.12;
    const available = width * 0.76;
    const gap = Math.max(2, (available / settings.density) * 0.35);
    const barWidth = Math.max(
      2,
      (available - gap * (frame.spectrum.length - 1)) / frame.spectrum.length,
    );
    frame.spectrum.forEach((value, index) => {
      const h = Math.max(3, (value * height * settings.intensity) / 520);
      ctx.fillStyle =
        index / frame.spectrum.length <= frame.progress
          ? settings.accentColor
          : settings.waveformColor;
      this.roundRect(
        ctx,
        x + index * (barWidth + gap),
        barAreaY - h / 2,
        barWidth,
        h,
        barWidth / 2,
      );
    });
    this.drawOverlays(ctx, width, height, settings, false);
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
    } else ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  private drawOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: VisualizerSettings,
    title = true,
    layers = true,
  ) {
    if (title && settings.showTitle && settings.title.trim()) {
      ctx.fillStyle = settings.accentColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.max(24, Math.round(width * 0.045))}px sans-serif`;
      ctx.fillText(settings.title.trim(), width / 2, height * 0.18, width * 0.78);
    }
    if (layers) this.drawTextLayers(ctx, width, height, settings.textLayers);
    // The timeline wave paints its own noise texture instead of sparse grain.
    if (settings.kind !== 'timeline-wave')
      this.drawFilmGrain(ctx, width, height, settings.grainAmount);
  }

  private layerText(layer: TextLayer) {
    const text = layer.text.trim();
    return layer.uppercase ? text.toUpperCase() : text;
  }

  private applyTextFont(ctx: CanvasRenderingContext2D, layer: TextLayer, px: number) {
    ctx.font = `${layer.italic ? 'italic ' : ''}${layer.weight} ${px}px "${layer.fontFamily}", sans-serif`;
    if ('letterSpacing' in ctx)
      (ctx as unknown as { letterSpacing: string }).letterSpacing =
        `${(px * layer.letterSpacing) / 100}px`;
  }

  private measureCtx: CanvasRenderingContext2D | null | undefined;
  private measureContext() {
    if (this.measureCtx !== undefined) return this.measureCtx;
    try {
      this.measureCtx =
        typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    } catch {
      this.measureCtx = null;
    }
    return this.measureCtx;
  }

  private drawTextLayers(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    layers: TextLayer[] | undefined,
  ) {
    if (!layers?.length) return;
    for (const layer of layers) {
      const text = this.layerText(layer);
      if (!text) continue;
      const px = (width * layer.size) / 100;
      ctx.save();
      this.applyTextFont(ctx, layer, px);
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100));
      ctx.fillStyle = layer.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (layer.glow > 0) {
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = (px * layer.glow) / 120;
      }
      ctx.fillText(text, width * layer.x, height * layer.y, width * 0.94);
      ctx.restore();
    }
  }

  private noiseTile: HTMLCanvasElement | null | undefined;
  private getNoiseTile() {
    if (this.noiseTile !== undefined) return this.noiseTile;
    this.noiseTile = null;
    if (typeof document === 'undefined') return null;
    try {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 256;
      const tctx = tile.getContext('2d');
      if (!tctx?.createImageData) return null;
      const image = tctx.createImageData(256, 256);
      let seed = 1337;
      for (let i = 0; i < image.data.length; i += 4) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const v = seed >>> 24;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
        image.data[i + 3] = 255;
      }
      tctx.putImageData(image, 0, 0);
      this.noiseTile = tile;
    } catch {
      this.noiseTile = null;
    }
    return this.noiseTile;
  }

  private drawNoise(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: TimelineWaveVisualizerSettings,
    time: number,
  ) {
    const tile = this.getNoiseTile();
    if (!tile || settings.noiseAmount <= 0 || !ctx.createPattern) return;
    const pattern = ctx.createPattern(tile, 'repeat');
    if (!pattern) return;
    const scale = Math.max(1, settings.noiseSize) * Math.max(1, Math.min(width, height) / 720);
    // Jitter the tile ~16x/s so the texture shimmers like film while playing but stays
    // stable when paused (it is derived from playback time, not wall-clock time).
    const step = Math.floor(time * 16);
    const ox = ((step * 97) % 256) * scale;
    const oy = ((step * 53) % 256) * scale;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(1, (settings.noiseAmount / 100) * 0.55);
    ctx.translate(-ox, -oy);
    ctx.scale(scale, scale);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, (width + ox) / scale + 256, (height + oy) / scale + 256);
    ctx.restore();
  }

  private demoPeaksCache: number[] | undefined;
  private demoPeaks() {
    this.demoPeaksCache ??= Array.from({ length: 3000 }, (_, i) => {
      const t = i / 50;
      const envelope = 0.5 + 0.35 * Math.sin(t * 0.55) * Math.sin(t * 0.13 + 1);
      const hit = Math.pow(Math.abs(Math.sin(t * Math.PI * 2 * 1.9)), 3) * 0.45;
      const jitter = ((i * 2654435761) % 1000) / 1000;
      return Math.max(0.06, Math.min(1, envelope * 0.55 + hit + jitter * 0.16));
    });
    return this.demoPeaksCache;
  }

  private withAlpha(color: string, alpha: number) {
    const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
    if (!hex) return color;
    const n = parseInt(hex[1], 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  private drawTimelineWave(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    settings: TimelineWaveVisualizerSettings,
    frame: VisualizerFrameData,
  ) {
    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height, settings);

    const peaks = frame.timeline?.peaks?.length ? frame.timeline.peaks : this.demoPeaks();
    const duration = frame.timeline?.duration || 60;
    const time = frame.timeline?.time ?? 0;
    const playheadX = (width * settings.playhead) / 100;
    const centerY = height / 2;
    const maxHeight = height * Math.max(0.18, Math.min(0.78, settings.intensity / 100));
    const pxPerSecond = width / settings.windowSeconds;
    const interval = settings.windowSeconds / settings.density;
    const peaksPerSecond = peaks.length / duration;
    const slot = width / settings.density;

    const peakAt = (index: number) => {
      const t0 = index * interval;
      if (t0 + interval < 0 || t0 > duration) return 0;
      const from = Math.max(0, Math.floor(t0 * peaksPerSecond));
      const to = Math.min(
        peaks.length,
        Math.max(from + 1, Math.ceil((t0 + interval) * peaksPerSecond)),
      );
      let max = 0;
      for (let i = from; i < to; i++) max = Math.max(max, peaks[i]);
      return Math.pow(max, 0.8);
    };
    const xOf = (index: number) => playheadX + ((index + 0.5) * interval - time) * pxPerSecond;
    const first = Math.floor((time - playheadX / pxPerSecond) / interval) - 1;
    const last = Math.ceil((time + (width - playheadX) / pxPerSecond) / interval) + 1;
    const fadeZone = width * 0.18;
    const edge = (x: number) => Math.max(0, Math.min(1, Math.min(x, width - x) / fadeZone));

    // Soft light pooling behind the playhead.
    const pool = ctx.createRadialGradient(playheadX, centerY, 0, playheadX, centerY, width * 0.55);
    pool.addColorStop(0, this.withAlpha(settings.accentColor, 0.16 * (settings.glow / 100) + 0.04));
    pool.addColorStop(1, this.withAlpha(settings.accentColor, 0));
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, width, height);

    const playedColor = settings.accentColor;
    const upcomingColor = settings.waveformColor;
    const glowBlur = (Math.min(width, height) * settings.glow) / 1400;

    if (settings.style === 'smooth') {
      const points: Array<{ x: number; h: number }> = [];
      for (let i = first; i <= last; i++)
        points.push({ x: xOf(i), h: Math.max(1.5, peakAt(i) * maxHeight * 0.5) });
      const fill = (color: string, from: number, to: number, alpha: number) => {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, this.withAlpha(color, 0));
        gradient.addColorStop(0.18, this.withAlpha(color, alpha));
        gradient.addColorStop(0.82, this.withAlpha(color, alpha));
        gradient.addColorStop(1, this.withAlpha(color, 0));
        ctx.save();
        ctx.beginPath();
        ctx.rect(from, 0, to - from, height);
        ctx.clip();
        ctx.beginPath();
        // Top edge left -> right, then bottom edge right -> left, each smoothed through midpoints.
        ctx.moveTo(points[0].x, centerY - points[0].h);
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const p = points[i];
          ctx.quadraticCurveTo(prev.x, centerY - prev.h, (prev.x + p.x) / 2, centerY - (prev.h + p.h) / 2);
        }
        const tail = points[points.length - 1];
        ctx.lineTo(tail.x, centerY + tail.h);
        for (let i = points.length - 2; i >= 0; i--) {
          const next = points[i + 1];
          const p = points[i];
          ctx.quadraticCurveTo(next.x, centerY + next.h, (next.x + p.x) / 2, centerY + (next.h + p.h) / 2);
        }
        ctx.closePath();
        ctx.fillStyle = gradient;
        if (color === playedColor && glowBlur > 0) {
          ctx.shadowColor = playedColor;
          ctx.shadowBlur = glowBlur * 2;
        }
        ctx.fill();
        ctx.restore();
      };
      fill(upcomingColor, playheadX, width, 0.5);
      fill(playedColor, 0, playheadX, 1);
    } else {
      const needle = settings.style === 'needles';
      const barWidth = Math.max(needle ? 1.5 : 2, slot * (needle ? 0.22 : 0.58));
      for (let i = first; i <= last; i++) {
        const x = xOf(i);
        const fade = edge(x);
        if (fade <= 0) continue;
        const barHeight = Math.max(needle ? 4 : barWidth, peakAt(i) * maxHeight);
        const played = x <= playheadX;
        ctx.save();
        ctx.globalAlpha = fade * (played ? 1 : 0.5);
        ctx.fillStyle = played ? playedColor : upcomingColor;
        if (played && glowBlur > 0 && playheadX - x < width * 0.3) {
          ctx.shadowColor = playedColor;
          ctx.shadowBlur = glowBlur * (1 - (playheadX - x) / (width * 0.3));
        }
        this.roundRect(ctx, x - barWidth / 2, centerY - barHeight / 2, barWidth, barHeight, barWidth / 2);
        ctx.restore();
      }
    }

    // Playhead needle.
    const line = ctx.createLinearGradient(0, height * 0.14, 0, height * 0.86);
    line.addColorStop(0, this.withAlpha(playedColor, 0));
    line.addColorStop(0.5, this.withAlpha(playedColor, 0.95));
    line.addColorStop(1, this.withAlpha(playedColor, 0));
    ctx.fillStyle = line;
    const lineWidth = Math.max(1.5, width / 520);
    ctx.fillRect(playheadX - lineWidth / 2, height * 0.14, lineWidth, height * 0.72);

    if (settings.vignette > 0) {
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.3,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, `rgba(0,0,0,${(settings.vignette / 100) * 0.7})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }
    this.drawNoise(ctx, width, height, settings, time);
    this.drawOverlays(ctx, width, height, settings);
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
    // Sparse procedural grain keeps the texture visible without issuing tens of
    // thousands of tiny canvas draw calls on every animation frame.
    const spacing = dotSize * 18;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let y = 0; y < Math.ceil(height / spacing); y++) {
      for (let x = 0; x < Math.ceil(width / spacing); x++) {
        const seed = (x * 928371 + y * 364479 + frameSeed * 101 + 17) % 997;
        ctx.fillStyle = seed % 2 === 0 ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.6)';
        ctx.fillRect(
          x * spacing + ((seed * 7) % spacing),
          y * spacing + ((seed * 11) % spacing),
          dotSize,
          dotSize,
        );
      }
    }
    ctx.restore();
  }

  private drawBars(
    ctx: CanvasRenderingContext2D,
    values: number[],
    x: number,
    centerY: number,
    width: number,
    height: number,
    settings: WaveformVisualizerSettings,
    progress: number,
  ) {
    const gapRatio = settings.style === 'stacked-bars' ? 0.55 : 0.35;
    const gap = Math.max(2, Math.min(10, width / values.length) * gapRatio);
    const barWidth = Math.max(2, (width - gap * (values.length - 1)) / values.length);
    values.forEach((value, index) => {
      const barHeight = Math.max(3, value * height);
      ctx.fillStyle =
        index / Math.max(1, values.length - 1) <= progress
          ? settings.accentColor
          : settings.waveformColor;
      this.roundRect(
        ctx,
        x + index * (barWidth + gap),
        centerY - barHeight / 2,
        barWidth,
        barHeight,
        Math.min(barWidth / 2, 10),
      );
    });
  }

  private drawMirrorWave(
    ctx: CanvasRenderingContext2D,
    values: number[],
    x: number,
    centerY: number,
    width: number,
    height: number,
    settings: WaveformVisualizerSettings,
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
    settings: WaveformVisualizerSettings,
  ) {
    ctx.strokeStyle = settings.waveformColor;
    ctx.lineWidth = Math.max(3, width / 220);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    values.forEach((value, index) => {
      const pointX = x + (index / Math.max(1, values.length - 1)) * width;
      const pointY = centerY + (index % 2 === 0 ? -1 : 1) * value * height * 0.42;
      index === 0 ? ctx.moveTo(pointX, pointY) : ctx.lineTo(pointX, pointY);
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

  private resample(values: number[], count: number) {
    return Array.from({ length: Math.max(8, Math.floor(count)) }, (_, index) => {
      const sourceIndex = Math.floor((index / Math.max(1, count - 1)) * (values.length - 1));
      return values[sourceIndex] ?? DEFAULT_FRAME.energy;
    });
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
