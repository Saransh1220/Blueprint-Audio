import { Injectable } from '@angular/core';
import * as THREE from 'three';

export type VisualizerKind = 'waveform' | 'fluid-gradient' | 'vinyl';
export type VisualizerStyle = 'classic-bars' | 'mirror-wave' | 'line-pulse' | 'stacked-bars';
export type VisualizerMode = 'static' | 'dynamic';
export type VisualizerFormat = '1:1' | '9:16' | '16:9';
export type VisualizerBackgroundMode = 'solid' | 'gradient';

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

export type VisualizerSettings =
  | WaveformVisualizerSettings
  | FluidGradientVisualizerSettings
  | VinylVisualizerSettings;

export interface VisualizerFrameData {
  spectrum: number[];
  bass: number;
  mids: number;
  highs: number;
  energy: number;
  progress: number;
  elapsed: number;
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
    return { ...common, kind, style: 'classic-bars', density: 84, intensity: 54 };
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
    this.drawOverlays(ctx, width, height, settings);
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
  ) {
    if (title && settings.showTitle && settings.title.trim()) {
      ctx.fillStyle = settings.accentColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.max(24, Math.round(width * 0.045))}px sans-serif`;
      ctx.fillText(settings.title.trim(), width / 2, height * 0.18, width * 0.78);
    }
    this.drawFilmGrain(ctx, width, height, settings.grainAmount);
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
