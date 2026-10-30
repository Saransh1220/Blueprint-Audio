import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  CommonVisualizerSettings,
  FluidGradientVisualizerSettings,
  TextLayer,
  TimelineWaveStyle,
  TimelineWaveVisualizerSettings,
  VinylVisualizerSettings,
  VisualizerFormat,
  VisualizerFrameData,
  VisualizerKind,
  VisualizerMode,
  VisualizerSettings,
  VisualizerStyle,
  WaveformVisualizerSettings,
} from '../../../services';
import { ToastService, VisualizerService } from '../../../services';
import {
  findVisualizerFont,
  loadVisualizerFont,
  nearestFontWeight,
  VISUALIZER_FONTS,
  type VisualizerFontCategory,
} from '../../../services/visualizer-fonts';

interface TextTemplate {
  id: string;
  label: string;
  build: (ctx: {
    title: string;
    count: number;
    waveformColor: string;
    accentColor: string;
  }) => Partial<TextLayer>;
}

interface LayerSlider {
  key: 'size' | 'letterSpacing' | 'opacity' | 'glow';
  label: string;
  min: number;
  max: number;
  step: number;
}

interface VisualizerPreset {
  style: VisualizerStyle;
  label: string;
  description: string;
}

interface VisualizerChoice {
  kind: VisualizerKind;
  index: string;
  label: string;
  short: string;
  kicker: string;
  description: string;
  formats: string[];
}

type InspectorTab = 'style' | 'color' | 'text' | 'output';

interface SliderControl {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
}

interface SliderSet {
  title: string;
  hint: string;
  controls: SliderControl[];
}

interface ColorSwatch {
  name: string;
  value: string;
}

interface GradientPreset {
  name: string;
  backgroundColor: string;
  gradientColor: string;
  waveformColor: string;
  accentColor: string;
}

@Component({
  selector: 'app-studio-visualizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './studio-visualizer.component.html',
  styleUrl: './studio-visualizer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioVisualizerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('previewCanvas') previewCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('trackWaveform') trackWaveform?: ElementRef<HTMLElement>;

  private visualizerService = inject(VisualizerService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  readonly visualizerChoices: VisualizerChoice[] = [
    {
      kind: 'waveform',
      index: '01',
      label: 'Waveform',
      short: 'Waveform',
      kicker: 'Graphic rhythm',
      description: 'Clean bars, mirrored motion, and line pulses for sharp social-ready visuals.',
      formats: ['Square', 'Story', 'Wide'],
    },
    {
      kind: 'fluid-gradient',
      index: '02',
      label: 'Fluid Gradient',
      short: 'Fluid',
      kicker: 'Dimensional colour',
      description:
        'A living gradient surface that folds, rotates, and blooms with every frequency band.',
      formats: ['WebGL', 'All formats'],
    },
    {
      kind: 'vinyl',
      index: '03',
      label: 'Vinyl Deck',
      short: 'Vinyl',
      kicker: 'Analog motion',
      description:
        'A rotating record, responsive grooves, and a bottom equalizer made for beat reveals.',
      formats: ['Square', 'Story', 'Wide'],
    },
    {
      kind: 'timeline-wave',
      index: '04',
      label: 'Timeline Wave',
      short: 'Timeline',
      kicker: 'Full-track scroll',
      description:
        'The whole song laid out as a waveform that glides past a fixed playhead over a grainy, filmic backdrop.',
      formats: ['Text layers', 'Square', 'Story', 'Wide'],
    },
  ];

  readonly sliderSets: Record<VisualizerKind, SliderSet> = {
    waveform: {
      title: 'Shape',
      hint: 'Bars & intensity',
      controls: [
        { key: 'density', label: 'Density', min: 24, max: 180, step: 4, suffix: '' },
        { key: 'intensity', label: 'Intensity', min: 20, max: 86, step: 2, suffix: '%' },
      ],
    },
    'fluid-gradient': {
      title: 'Surface motion',
      hint: '3D reactive',
      controls: [
        { key: 'deformation', label: 'Deformation', min: 10, max: 100, step: 2, suffix: '%' },
        { key: 'rotation', label: 'Rotation', min: 0, max: 100, step: 2, suffix: '%' },
        { key: 'responsiveness', label: 'Response', min: 10, max: 100, step: 2, suffix: '%' },
        { key: 'blendSoftness', label: 'Softness', min: 10, max: 100, step: 2, suffix: '%' },
      ],
    },
    vinyl: {
      title: 'Deck motion',
      hint: '33 rpm inspired',
      controls: [
        { key: 'speed', label: 'Record speed', min: 10, max: 100, step: 2, suffix: '%' },
        { key: 'grooveResponse', label: 'Groove response', min: 10, max: 100, step: 2, suffix: '%' },
        { key: 'density', label: 'Bar density', min: 24, max: 120, step: 4, suffix: '' },
        { key: 'intensity', label: 'Bar intensity', min: 20, max: 86, step: 2, suffix: '%' },
      ],
    },
    'timeline-wave': {
      title: 'Scroll',
      hint: 'Pre-loaded waveform',
      controls: [
        { key: 'windowSeconds', label: 'Seconds in view', min: 4, max: 40, step: 1, suffix: 's' },
        { key: 'density', label: 'Density', min: 32, max: 220, step: 4, suffix: '' },
        { key: 'intensity', label: 'Height', min: 20, max: 86, step: 2, suffix: '%' },
        { key: 'playhead', label: 'Playhead', min: 15, max: 85, step: 1, suffix: '%' },
        { key: 'glow', label: 'Glow', min: 0, max: 100, step: 2, suffix: '%' },
      ],
    },
  };

  readonly timelineStyles: Array<{ style: TimelineWaveStyle; label: string }> = [
    { style: 'bars', label: 'Bars' },
    { style: 'needles', label: 'Needles' },
    { style: 'smooth', label: 'Smooth' },
  ];

  readonly noiseSliders: SliderControl[] = [
    { key: 'noiseAmount', label: 'Noise', min: 0, max: 100, step: 1, suffix: '%' },
    { key: 'noiseSize', label: 'Noise size', min: 1, max: 5, step: 0.5, suffix: '×' },
    { key: 'vignette', label: 'Vignette', min: 0, max: 100, step: 1, suffix: '%' },
  ];

  // ── Text layers ──
  readonly fontCategories: Array<VisualizerFontCategory | 'All'> = [
    'All',
    'Display',
    'Serif',
    'Script',
    'Tech',
    'Retro',
  ];
  readonly fontCategory = signal<VisualizerFontCategory | 'All'>('All');
  readonly selectedLayerId = signal<string | null>(null);
  private fontsPrimed = false;

  readonly textTemplates: TextTemplate[] = [
    {
      id: 'title',
      label: 'Title',
      build: ({ title, waveformColor }) => ({
        text: title || 'Track Title',
        fontFamily: 'Bebas Neue',
        size: 12,
        letterSpacing: 6,
        color: waveformColor,
        y: 0.17,
      }),
    },
    {
      id: 'bpm',
      label: 'BPM',
      build: ({ accentColor }) => ({
        text: '128 BPM',
        fontFamily: 'Space Grotesk',
        weight: 700,
        size: 3.6,
        letterSpacing: 14,
        color: accentColor,
        x: 0.3,
        y: 0.84,
      }),
    },
    {
      id: 'key',
      label: 'Key',
      build: ({ accentColor }) => ({
        text: 'A MINOR',
        fontFamily: 'Space Grotesk',
        weight: 700,
        size: 3.6,
        letterSpacing: 14,
        color: accentColor,
        x: 0.7,
        y: 0.84,
      }),
    },
    {
      id: 'artist',
      label: 'Artist',
      build: ({ waveformColor }) => ({
        text: 'Prod. by Artist',
        fontFamily: 'Playfair Display',
        italic: true,
        size: 4.6,
        letterSpacing: 2,
        color: waveformColor,
        y: 0.25,
      }),
    },
    {
      id: 'custom',
      label: 'Custom',
      build: ({ count, waveformColor }) => ({
        text: 'Your text',
        fontFamily: 'Monoton',
        size: 7,
        letterSpacing: 4,
        color: waveformColor,
        y: Math.min(0.92, 0.45 + (count % 5) * 0.08),
      }),
    },
  ];

  readonly layerSliders: LayerSlider[] = [
    { key: 'size', label: 'Size', min: 1.5, max: 26, step: 0.5 },
    { key: 'letterSpacing', label: 'Spacing', min: -4, max: 60, step: 1 },
    { key: 'opacity', label: 'Opacity', min: 10, max: 100, step: 1 },
    { key: 'glow', label: 'Glow', min: 0, max: 100, step: 2 },
  ];

  readonly layerSwatches = [
    '#f0e9d6',
    '#ffffff',
    '#ff4d68',
    '#ffd455',
    '#ff7d2e',
    '#87ffb2',
    '#86d7ff',
    '#d4c5ff',
    '#d9f561',
    '#10100e',
  ];

  get visibleFonts() {
    const category = this.fontCategory();
    return VISUALIZER_FONTS.filter((font) => category === 'All' || font.category === category);
  }

  readonly grainControl: SliderControl = {
    key: 'grainAmount',
    label: 'Grain',
    min: 0,
    max: 14,
    step: 1,
    suffix: '',
  };

  private readonly allInspectorTabs: Array<{ id: InspectorTab; label: string }> = [
    { id: 'style', label: 'Style' },
    { id: 'color', label: 'Color' },
    { id: 'text', label: 'Text' },
    { id: 'output', label: 'Output' },
  ];

  /** Text layers are drawn on 2D canvases only, so the WebGL fluid visualizer has no Text tab. */
  get inspectorTabs() {
    return this.settings.kind === 'fluid-gradient'
      ? this.allInspectorTabs.filter((tab) => tab.id !== 'text')
      : this.allInspectorTabs;
  }

  readonly presets: VisualizerPreset[] = [
    {
      style: 'classic-bars',
      label: 'Classic Bar',
      description: 'Rounded bars with progress colour.',
    },
    { style: 'mirror-wave', label: 'Mirror Wave', description: 'Symmetric top and bottom motion.' },
    {
      style: 'line-pulse',
      label: 'Line Pulse',
      description: 'A smooth centerline for minimal reels.',
    },
    {
      style: 'stacked-bars',
      label: 'Stacked Thin Bars',
      description: 'Dense, quiet, and graphic.',
    },
  ];

  readonly formats: Array<{ value: VisualizerFormat; label: string; hint: string }> = [
    { value: '1:1', label: 'Square', hint: 'Feed post' },
    { value: '9:16', label: 'Story', hint: 'Reels · Shorts' },
    { value: '16:9', label: 'Wide', hint: 'YouTube' },
  ];

  readonly backgroundSwatches: ColorSwatch[] = [
    { name: 'Ink', value: '#10100e' },
    { name: 'Bone', value: '#f0e9d6' },
    { name: 'Cobalt', value: '#132a83' },
    { name: 'Graphite', value: '#202124' },
    { name: 'Cherry', value: '#3b0710' },
    { name: 'Moss', value: '#182116' },
    { name: 'Navy', value: '#08162e' },
    { name: 'Plum', value: '#25132d' },
    { name: 'Forest', value: '#0f2a1c' },
    { name: 'Clay', value: '#6f3324' },
    { name: 'Sand', value: '#d8c9a7' },
    { name: 'Smoke', value: '#5b5f66' },
  ];

  readonly gradientPresets: GradientPreset[] = [
    {
      name: 'Noir Rose',
      backgroundColor: '#10100e',
      gradientColor: '#3b0710',
      waveformColor: '#f0e9d6',
      accentColor: '#ff4d68',
    },
    {
      name: 'Deep Club',
      backgroundColor: '#10100e',
      gradientColor: '#132a83',
      waveformColor: '#d4c5ff',
      accentColor: '#86d7ff',
    },
    {
      name: 'Moss Fade',
      backgroundColor: '#10100e',
      gradientColor: '#182116',
      waveformColor: '#f0e9d6',
      accentColor: '#87ffb2',
    },
    {
      name: 'Warm Tape',
      backgroundColor: '#202124',
      gradientColor: '#3b0710',
      waveformColor: '#ffd455',
      accentColor: '#ff7d2e',
    },
    {
      name: 'Soft Bone',
      backgroundColor: '#f0e9d6',
      gradientColor: '#d8c9a7',
      waveformColor: '#10100e',
      accentColor: '#ff4d68',
    },
    {
      name: 'Blue Hour',
      backgroundColor: '#08162e',
      gradientColor: '#132a83',
      waveformColor: '#86d7ff',
      accentColor: '#d4c5ff',
    },
    {
      name: 'Plum Dust',
      backgroundColor: '#10100e',
      gradientColor: '#25132d',
      waveformColor: '#f0e9d6',
      accentColor: '#ff9ab5',
    },
    {
      name: 'Forest Air',
      backgroundColor: '#0f2a1c',
      gradientColor: '#182116',
      waveformColor: '#f0e9d6',
      accentColor: '#d9f561',
    },
    {
      name: 'Amber Room',
      backgroundColor: '#202124',
      gradientColor: '#6f3324',
      waveformColor: '#f0e9d6',
      accentColor: '#ffd455',
    },
    {
      name: 'Smoke Glass',
      backgroundColor: '#202124',
      gradientColor: '#5b5f66',
      waveformColor: '#ffffff',
      accentColor: '#86d7ff',
    },
  ];

  readonly waveformSwatches: ColorSwatch[] = [
    { name: 'Cream', value: '#f0e9d6' },
    { name: 'White', value: '#ffffff' },
    { name: 'Lime', value: '#d9f561' },
    { name: 'Lavender', value: '#d4c5ff' },
    { name: 'Sky', value: '#86d7ff' },
    { name: 'Ink', value: '#10100e' },
    { name: 'Gold', value: '#ffd455' },
    { name: 'Soft Rose', value: '#ff9ab5' },
    { name: 'Mint', value: '#87ffb2' },
  ];

  readonly accentSwatches: ColorSwatch[] = [
    { name: 'Hot', value: '#ff4d68' },
    { name: 'Sun', value: '#ffd455' },
    { name: 'Tangerine', value: '#ff7d2e' },
    { name: 'Cobalt', value: '#5b78ff' },
    { name: 'Mint', value: '#87ffb2' },
    { name: 'Rose', value: '#ff9ab5' },
    { name: 'Cream', value: '#f0e9d6' },
    { name: 'Sky', value: '#86d7ff' },
    { name: 'Lime', value: '#d9f561' },
  ];

  selectedKind = signal<VisualizerKind | null>(null);
  inspectorTab = signal<InspectorTab>('style');
  settings: VisualizerSettings = this.visualizerService.createDefaultSettings('waveform');

  audioFileName = signal('');
  isDecoding = signal(false);
  isPlaying = signal(false);
  isExporting = signal(false);
  exportProgress = signal(0);
  duration = signal(0);
  currentTime = signal(0);
  trimStart = signal(0);
  trimEnd = signal(0);
  statusMessage = signal('Choose a visual direction to begin.');
  peaks = signal<number[]>(this.visualizerService.createIdlePeaks(84));
  trimPeaks = signal<number[]>(this.visualizerService.createIdlePeaks(140));
  /** Whole-track peaks (~50/s) that the timeline wave scrolls through. */
  private timelinePeaks: number[] = [];

  hasAudio = computed(() => !!this.audioFileName());
  progress = computed(() => (this.duration() > 0 ? this.currentTime() / this.duration() : 0));
  trimStartPercent = computed(() => this.timeToPercent(this.trimStart()));
  trimEndPercent = computed(() => this.timeToPercent(this.trimEnd()));
  playheadPercent = computed(() => this.timeToPercent(this.currentTime()));
  clipDuration = computed(() => Math.max(0, this.trimEnd() - this.trimStart()));
  selectedChoice = computed(() =>
    this.visualizerChoices.find((choice) => choice.kind === this.selectedKind()),
  );

  private audio = new Audio();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private objectUrl: string | null = null;
  private frameId: number | null = null;
  private activeWaveformHandle: 'start' | 'end' | 'playhead' | null = null;
  private previousFrame: VisualizerFrameData | undefined;

  constructor() {
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio.duration || 0);
      this.cdr.markForCheck();
    });
    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio.currentTime || 0);
      if (this.isPlaying() && this.trimEnd() > 0 && this.audio.currentTime >= this.trimEnd()) {
        this.stopPlayback();
        this.audio.currentTime = this.trimStart();
        this.currentTime.set(this.trimStart());
      }
      // Playback has its own requestAnimationFrame loop. Rendering again from
      // the much slower media timeupdate event creates uneven frame pacing.
      if (!this.isPlaying()) this.renderPreview();
      this.cdr.markForCheck();
    });
    this.audio.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.stopAnimation();
      this.renderPreview();
      this.cdr.markForCheck();
    });
  }

  /** Slider group for the active visualizer (empty until one is chosen). */
  get sliderSet(): SliderSet {
    return this.sliderSets[this.settings.kind];
  }

  setInspectorTab(tab: InspectorTab) {
    this.inspectorTab.set(tab);
    if (tab === 'text') this.primeFonts();
  }

  sliderValue(key: string): number {
    return Number((this.settings as unknown as Record<string, unknown>)[key] ?? 0);
  }

  setSlider(key: string, value: number | string) {
    (this.settings as unknown as Record<string, unknown>)[key] = Number(value);
    this.updateSetting();
  }

  /** Filled share (0–100) of a slider track, used to paint its progress colour. */
  sliderFill(control: SliderControl): number {
    const span = control.max - control.min || 1;
    return Math.max(0, Math.min(100, ((this.sliderValue(control.key) - control.min) / span) * 100));
  }

  isPresetActive(preset: GradientPreset): boolean {
    return (
      this.settings.backgroundColor === preset.backgroundColor &&
      this.settings.gradientColor === preset.gradientColor
    );
  }

  get waveformSettings() {
    return this.settings as WaveformVisualizerSettings;
  }
  get fluidSettings() {
    return this.settings as FluidGradientVisualizerSettings;
  }
  get vinylSettings() {
    return this.settings as VinylVisualizerSettings;
  }
  get timelineSettings() {
    return this.settings as TimelineWaveVisualizerSettings;
  }

  setTimelineStyle(style: TimelineWaveStyle) {
    if (this.settings.kind !== 'timeline-wave') return;
    this.settings = { ...this.settings, style };
    this.renderPreview();
  }

  // ── Text layers ──

  get textLayers(): TextLayer[] {
    return this.settings.textLayers;
  }

  get selectedLayer(): TextLayer | undefined {
    const id = this.selectedLayerId();
    return this.settings.textLayers.find((layer) => layer.id === id);
  }

  get selectedFont() {
    const layer = this.selectedLayer;
    return layer ? findVisualizerFont(layer.fontFamily) : undefined;
  }

  addTextLayer(template: TextTemplate) {
    const layers = this.settings.textLayers;
    const fileTitle = this.audioFileName().replace(/\.[^/.]+$/, '');
    const layer = this.visualizerService.createTextLayer(
      template.build({
        title: (this.settings.title || fileTitle).trim(),
        count: layers.length,
        waveformColor: this.settings.waveformColor,
        accentColor: this.settings.accentColor,
      }),
    );
    const font = findVisualizerFont(layer.fontFamily);
    layer.weight = nearestFontWeight(font, layer.weight);
    this.settings = { ...this.settings, textLayers: [...layers, layer] } as VisualizerSettings;
    this.selectedLayerId.set(layer.id);
    void this.refreshAfterFont(layer);
    this.renderPreview();
  }

  selectLayer(id: string | null) {
    this.selectedLayerId.set(id);
  }

  removeLayer(id: string) {
    this.settings = {
      ...this.settings,
      textLayers: this.settings.textLayers.filter((layer) => layer.id !== id),
    } as VisualizerSettings;
    if (this.selectedLayerId() === id) this.selectedLayerId.set(null);
    this.renderPreview();
  }

  duplicateLayer(id: string) {
    const source = this.settings.textLayers.find((layer) => layer.id === id);
    if (!source) return;
    const copy: TextLayer = {
      ...source,
      id: this.visualizerService.createTextLayer().id,
      x: Math.min(0.95, source.x + 0.04),
      y: Math.min(0.95, source.y + 0.05),
    };
    this.settings = {
      ...this.settings,
      textLayers: [...this.settings.textLayers, copy],
    } as VisualizerSettings;
    this.selectedLayerId.set(copy.id);
    this.renderPreview();
  }

  updateLayer(id: string, patch: Partial<TextLayer>) {
    const textLayers = this.settings.textLayers.map((layer) =>
      layer.id === id ? { ...layer, ...patch } : layer,
    );
    this.settings = { ...this.settings, textLayers } as VisualizerSettings;
    const updated = textLayers.find((layer) => layer.id === id);
    if (updated && (patch.fontFamily || patch.weight !== undefined || patch.italic !== undefined))
      void this.refreshAfterFont(updated);
    this.renderPreview();
  }

  setLayerNumber(id: string, key: LayerSlider['key'], value: number | string) {
    this.updateLayer(id, { [key]: Number(value) });
  }

  setLayerFont(id: string, family: string) {
    const font = findVisualizerFont(family);
    const layer = this.settings.textLayers.find((l) => l.id === id);
    if (!font || !layer) return;
    this.updateLayer(id, {
      fontFamily: family,
      weight: nearestFontWeight(font, layer.weight),
      italic: font.italic ? layer.italic : false,
    });
  }

  layerSliderFill(slider: LayerSlider, value: number) {
    return Math.max(0, Math.min(100, ((value - slider.min) / (slider.max - slider.min)) * 100));
  }

  setFontCategory(category: VisualizerFontCategory | 'All') {
    this.fontCategory.set(category);
  }

  /** Percent-based box of a layer over the preview canvas, used as its drag handle. */
  layerBox(layer: TextLayer) {
    const { width, height } = this.visualizerService.getCanvasSize(this.settings.format, 720);
    const box = this.visualizerService.measureTextLayer(layer, width, height);
    return {
      left: layer.x * 100,
      top: layer.y * 100,
      width: box.width * 100,
      height: box.height * 100,
    };
  }

  beginLayerDrag(layer: TextLayer, event: PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedLayerId.set(layer.id);
    this.layerDrag = { id: layer.id, startX: event.clientX, startY: event.clientY, x: layer.x, y: layer.y };
  }

  nudgeLayer(layer: TextLayer, event: KeyboardEvent) {
    const step = event.shiftKey ? 0.05 : 0.01;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (move) {
      event.preventDefault();
      this.updateLayer(layer.id, {
        x: Math.max(0, Math.min(1, layer.x + move[0])),
        y: Math.max(0, Math.min(1, layer.y + move[1])),
      });
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      if ((event.target as HTMLElement).tagName === 'BUTTON') this.removeLayer(layer.id);
    }
  }

  /** Requests every catalogue font once so the picker can preview each face. */
  primeFonts() {
    if (this.fontsPrimed) return;
    this.fontsPrimed = true;
    for (const font of VISUALIZER_FONTS) void loadVisualizerFont(font.family, font.weights[0]);
  }

  private layerDrag: { id: string; startX: number; startY: number; x: number; y: number } | null =
    null;

  private async refreshAfterFont(layer: TextLayer) {
    await loadVisualizerFont(layer.fontFamily, layer.weight, layer.italic);
    this.renderPreview();
    this.cdr.markForCheck();
  }

  ngAfterViewInit() {
    this.prepareCanvas();
  }

  ngOnDestroy() {
    this.stopAnimation();
    this.audio.pause();
    this.visualizerService.disposeCanvas(this.previewCanvas?.nativeElement);
    this.releaseObjectUrl();
    if (this.audioContext?.state !== 'closed') void this.audioContext?.close();
  }

  selectVisualizer(kind: VisualizerKind) {
    const shared = this.commonSettings();
    this.visualizerService.disposeCanvas(this.previewCanvas?.nativeElement);
    this.settings = this.visualizerService.createDefaultSettings(kind, shared);
    this.selectedKind.set(kind);
    if (kind === 'fluid-gradient' && this.inspectorTab() === 'text') this.inspectorTab.set('style');
    this.previousFrame = undefined;
    this.statusMessage.set(
      this.hasAudio() ? 'Preview ready.' : 'Load an audio file to start shaping the visual.',
    );
    this.cdr.detectChanges();
    this.prepareCanvas();
  }

  changeVisualizer() {
    this.stopPlayback();
    this.visualizerService.disposeCanvas(this.previewCanvas?.nativeElement);
    this.selectedKind.set(null);
    this.statusMessage.set('Choose a visual direction. Your audio and clip are saved.');
  }

  async onAudioSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.isDecoding.set(true);
    this.statusMessage.set('Reading waveform peaks...');
    this.stopPlayback();
    this.releaseObjectUrl();
    this.resetAudioGraph();
    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    this.audioFileName.set(file.name);
    this.settings.title ||= file.name.replace(/\.[^/.]+$/, '');
    try {
      const audioBuffer = await this.visualizerService.decodeAudioData(await file.arrayBuffer());
      this.audioBuffer = audioBuffer;
      this.duration.set(audioBuffer.duration);
      this.trimStart.set(0);
      this.trimEnd.set(Math.min(audioBuffer.duration, 15));
      this.audio.currentTime = 0;
      this.currentTime.set(0);
      this.peaks.set(this.visualizerService.extractPeaks(audioBuffer, this.sampleCount()));
      this.trimPeaks.set(this.visualizerService.extractPeaks(audioBuffer, 140));
      this.timelinePeaks = this.visualizerService.extractPeaks(
        audioBuffer,
        Math.max(400, Math.min(20000, Math.round(audioBuffer.duration * 50))),
      );
      this.statusMessage.set('Preview ready.');
      this.renderPreview();
    } catch (err) {
      this.statusMessage.set('Could not decode this audio file.');
      this.toastService.error(err instanceof Error ? err.message : 'Could not decode audio.');
    } finally {
      this.isDecoding.set(false);
      input.value = '';
      this.cdr.markForCheck();
    }
  }

  selectStyle(style: VisualizerStyle) {
    if (this.settings.kind !== 'waveform') return;
    this.settings = { ...this.settings, style };
    this.renderPreview();
  }

  setMode(mode: VisualizerMode) {
    this.settings = { ...this.settings, mode } as VisualizerSettings;
    if (mode === 'static') this.stopAnimation();
    else if (this.isPlaying()) this.startAnimation();
    this.renderPreview();
  }

  setFormat(format: VisualizerFormat) {
    this.settings = { ...this.settings, format } as VisualizerSettings;
    this.prepareCanvas();
  }

  setBackgroundMode(backgroundMode: CommonVisualizerSettings['backgroundMode']) {
    this.settings = { ...this.settings, backgroundMode } as VisualizerSettings;
    this.updateSetting();
  }

  selectGradientPreset(preset: GradientPreset) {
    this.settings = {
      ...this.settings,
      backgroundMode: 'gradient',
      backgroundColor: preset.backgroundColor,
      gradientColor: preset.gradientColor,
      waveformColor: preset.waveformColor,
      accentColor: preset.accentColor,
    } as VisualizerSettings;
    this.updateSetting();
  }

  setColor(
    target: 'backgroundColor' | 'gradientColor' | 'waveformColor' | 'accentColor',
    value: string,
  ) {
    this.settings = { ...this.settings, [target]: value } as VisualizerSettings;
    this.updateSetting();
  }

  updateSetting() {
    const count = this.sampleCount();
    this.peaks.set(
      this.hasAudio()
        ? this.resampleValues(this.peaks(), count)
        : this.visualizerService.createIdlePeaks(count),
    );
    this.renderPreview();
  }

  async togglePlayback() {
    if (!this.hasAudio()) return;
    if (this.isPlaying()) {
      this.stopPlayback();
      return;
    }
    try {
      this.setupAudioGraph();
      if (this.audio.currentTime < this.trimStart() || this.audio.currentTime >= this.trimEnd()) {
        this.audio.currentTime = this.trimStart();
        this.currentTime.set(this.trimStart());
      }
      await this.audio.play();
      this.isPlaying.set(true);
      this.startAnimation();
      this.cdr.markForCheck();
    } catch {
      this.toastService.error('Playback could not start.');
    }
  }

  seekToStart() {
    this.audio.currentTime = this.trimStart();
    this.currentTime.set(this.trimStart());
    this.renderPreview();
  }

  updateTrimStart(value: string | number) {
    const next = Math.min(Number(value), this.trimEnd() - 0.25);
    const start = Math.max(0, Number.isFinite(next) ? next : 0);
    this.trimStart.set(start);
    if (this.currentTime() < start) {
      this.audio.currentTime = start;
      this.currentTime.set(start);
    }
    this.renderPreview();
  }

  updateTrimEnd(value: string | number) {
    const next = Math.max(Number(value), this.trimStart() + 0.25);
    const end = Math.min(this.duration(), Number.isFinite(next) ? next : this.duration());
    this.trimEnd.set(end);
    if (this.currentTime() > end) {
      this.audio.currentTime = this.trimStart();
      this.currentTime.set(this.trimStart());
    }
    this.renderPreview();
  }

  beginTrimDrag(handle: 'start' | 'end', event: PointerEvent) {
    if (!this.hasAudio()) return;
    event.preventDefault();
    event.stopPropagation();
    this.activeWaveformHandle = handle;
  }

  beginPlayheadDrag(event: PointerEvent) {
    if (!this.hasAudio()) return;
    event.preventDefault();
    event.stopPropagation();
    this.activeWaveformHandle = 'playhead';
  }

  seekFromWaveform(event: PointerEvent) {
    if (!this.hasAudio()) return;
    const nextTime = Math.max(
      this.trimStart(),
      Math.min(this.trimEnd(), this.pointerToTime(event)),
    );
    this.audio.currentTime = nextTime;
    this.currentTime.set(nextTime);
    this.renderPreview();
  }

  async exportPng() {
    if (!this.hasAudio()) return;
    // Only wait when text layers need their web fonts, so the common path stays synchronous.
    if (this.settings.textLayers.length) await this.visualizerService.prepareFonts(this.settings.textLayers);
    const canvas = this.createExportCanvas();
    const frame = this.createCurrentFrame();
    this.visualizerService.renderFrame(canvas, this.settings, frame);
    canvas.toBlob((blob) => {
      this.visualizerService.disposeCanvas(canvas);
      if (!blob) {
        this.toastService.error('Could not export PNG.');
        return;
      }
      this.downloadBlob(blob, this.exportName('png'));
      this.toastService.success('PNG exported.');
    }, 'image/png');
  }

  async exportWebm() {
    if (!this.hasAudio()) return;
    if (this.settings.textLayers.length) await this.visualizerService.prepareFonts(this.settings.textLayers);
    const canvas = this.createExportCanvas();
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      this.visualizerService.disposeCanvas(canvas);
      this.toastService.info('Video export is not supported in this browser. PNG export is ready.');
      return;
    }
    this.stopPlayback();
    this.isExporting.set(true);
    this.exportProgress.set(0);
    this.statusMessage.set('Exporting selected clip...');
    const stream = canvas.captureStream(30);
    const exportAudio = this.createExportAudioGraph();
    if (!exportAudio) {
      stream.getTracks().forEach((track) => track.stop());
      this.visualizerService.disposeCanvas(canvas);
      this.isExporting.set(false);
      this.toastService.error('Could not prepare background audio export.');
      return;
    }
    exportAudio.destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: this.pickWebmMimeType() });
    let exportFrameId: number | null = null;
    let stopTimer: number | null = null;
    let stopped = false;
    let previous: VisualizerFrameData | undefined;
    const clipDuration = this.clipDuration();
    const startedAt = performance.now();
    const stopRecording = () => {
      if (stopped) return;
      stopped = true;
      if (exportFrameId !== null) cancelAnimationFrame(exportFrameId);
      if (stopTimer !== null) window.clearTimeout(stopTimer);
      try {
        exportAudio.source.stop();
      } catch {
        /* source already ended */
      }
      if (recorder.state === 'recording') recorder.stop();
    };
    const renderExportTick = () => {
      const elapsed = Math.min(clipDuration, (performance.now() - startedAt) / 1000);
      const progress = clipDuration > 0 ? elapsed / clipDuration : 1;
      exportAudio.analyser.getByteFrequencyData(
        exportAudio.frequencyData as Uint8Array<ArrayBuffer>,
      );
      const frame = this.visualizerService.createFrameData(
        exportAudio.frequencyData,
        this.sampleCount(),
        progress,
        elapsed,
        undefined,
        previous,
      );
      previous = frame;
      const outFrame = this.withTimeline(frame, this.trimStart() + elapsed);
      this.visualizerService.renderFrame(canvas, this.settings, outFrame);
      this.renderFrame(outFrame);
      this.currentTime.set(this.trimStart() + elapsed);
      this.exportProgress.set(progress);
      this.cdr.markForCheck();
      if (progress >= 1) stopRecording();
      else if (!stopped) exportFrameId = requestAnimationFrame(renderExportTick);
    };
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      if (exportFrameId !== null) cancelAnimationFrame(exportFrameId);
      if (stopTimer !== null) window.clearTimeout(stopTimer);
      stream.getTracks().forEach((track) => track.stop());
      exportAudio.source.disconnect();
      exportAudio.analyser.disconnect();
      exportAudio.destination.disconnect();
      if (exportAudio.context.state !== 'closed') void exportAudio.context.close();
      this.visualizerService.disposeCanvas(canvas);
      this.downloadBlob(new Blob(chunks, { type: 'video/webm' }), this.exportName('webm'));
      this.isExporting.set(false);
      this.exportProgress.set(1);
      this.currentTime.set(this.trimStart());
      this.statusMessage.set('WebM exported.');
      this.toastService.success('WebM exported.');
      this.renderPreview();
      this.cdr.markForCheck();
    };
    try {
      recorder.start();
      const initial = this.visualizerService.createFrameData(
        null,
        this.sampleCount(),
        0,
        0,
        this.peaks(),
      );
      this.visualizerService.renderFrame(
        canvas,
        this.settings,
        this.withTimeline(initial, this.trimStart()),
      );
      exportAudio.source.start(0, this.trimStart(), clipDuration);
      exportFrameId = requestAnimationFrame(renderExportTick);
      stopTimer = window.setTimeout(stopRecording, Math.max(1000, clipDuration * 1000 + 500));
    } catch {
      stopRecording();
      this.visualizerService.disposeCanvas(canvas);
      this.isExporting.set(false);
      this.exportProgress.set(0);
      this.toastService.error('Could not start WebM export.');
    }
  }

  formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0')}`;
  }

  @HostListener('document:pointermove', ['$event'])
  onDocumentPointerMove(event: PointerEvent) {
    if (this.layerDrag) {
      const rect = this.previewCanvas?.nativeElement.getBoundingClientRect();
      if (!rect?.width || !rect.height) return;
      event.preventDefault();
      const { id, startX, startY, x, y } = this.layerDrag;
      this.updateLayer(id, {
        x: Math.max(0, Math.min(1, x + (event.clientX - startX) / rect.width)),
        y: Math.max(0, Math.min(1, y + (event.clientY - startY) / rect.height)),
      });
      this.cdr.markForCheck();
      return;
    }
    if (!this.activeWaveformHandle) return;
    event.preventDefault();
    this.updateWaveformHandleFromPointer(event);
  }

  @HostListener('document:pointerup')
  onDocumentPointerUp() {
    this.activeWaveformHandle = null;
    this.layerDrag = null;
  }

  private commonSettings(): Partial<CommonVisualizerSettings> {
    return {
      mode: this.settings.mode,
      format: this.settings.format,
      backgroundMode: this.settings.backgroundMode,
      backgroundColor: this.settings.backgroundColor,
      gradientColor: this.settings.gradientColor,
      waveformColor: this.settings.waveformColor,
      accentColor: this.settings.accentColor,
      grainAmount: this.settings.grainAmount,
      showTitle: this.settings.showTitle,
      title: this.settings.title,
      textLayers: this.settings.textLayers,
    };
  }

  private withTimeline(frame: VisualizerFrameData, time: number): VisualizerFrameData {
    if (this.settings.kind !== 'timeline-wave') return frame;
    return {
      ...frame,
      timeline: { peaks: this.timelinePeaks, time, duration: this.duration() },
    };
  }

  private sampleCount() {
    return this.settings.kind === 'waveform' || this.settings.kind === 'vinyl'
      ? this.settings.density
      : 96;
  }

  private prepareCanvas() {
    const canvas = this.previewCanvas?.nativeElement;
    if (!canvas) return;
    // The live canvas is sized for the on-screen preview. Export canvases remain
    // full 1080p, so reducing this buffer improves motion without lowering output quality.
    const { width, height } = this.visualizerService.getCanvasSize(this.settings.format, 720);
    canvas.width = width;
    canvas.height = height;
    this.renderPreview();
  }

  private createCurrentFrame() {
    const data =
      this.settings.mode === 'dynamic' && this.isPlaying() ? this.readFrequencyData() : null;
    const elapsed = this.isPlaying() ? this.audio.currentTime : this.currentTime();
    const progress = this.duration() > 0 ? elapsed / this.duration() : 0;
    return this.withTimeline(
      this.visualizerService.createFrameData(
        data,
        this.sampleCount(),
        progress,
        elapsed,
        this.peaks(),
        this.previousFrame,
      ),
      elapsed,
    );
  }

  private renderPreview() {
    if (!this.selectedKind()) return;
    const frame = this.createCurrentFrame();
    this.previousFrame = frame;
    this.renderFrame(frame);
  }

  private renderFrame(frame: VisualizerFrameData) {
    const canvas = this.previewCanvas?.nativeElement;
    if (canvas) this.visualizerService.renderFrame(canvas, this.settings, frame);
  }

  private createExportCanvas() {
    const canvas = document.createElement('canvas');
    const size = this.visualizerService.getCanvasSize(this.settings.format, 1080);
    canvas.width = size.width;
    canvas.height = size.height;
    return canvas;
  }

  private updateWaveformHandleFromPointer(event: PointerEvent) {
    const time = this.pointerToTime(event);
    if (this.activeWaveformHandle === 'start') this.updateTrimStart(time);
    else if (this.activeWaveformHandle === 'end') this.updateTrimEnd(time);
    else {
      const next = Math.max(this.trimStart(), Math.min(this.trimEnd(), time));
      this.audio.currentTime = next;
      this.currentTime.set(next);
      this.renderPreview();
    }
  }

  private pointerToTime(event: PointerEvent) {
    const element = this.trackWaveform?.nativeElement;
    if (!element || this.duration() <= 0) return 0;
    const rect = element.getBoundingClientRect();
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * this.duration();
  }

  private timeToPercent(time: number) {
    return !this.duration() || !Number.isFinite(time)
      ? 0
      : Math.max(0, Math.min(100, (time / this.duration()) * 100));
  }

  private setupAudioGraph() {
    if (this.audioContext && this.analyser && this.source) {
      if (this.audioContext.state === 'suspended') void this.audioContext.resume();
      return;
    }
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) throw new Error('Audio playback analysis is unavailable.');
    this.audioContext = new AudioContextCtor();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.source = this.audioContext.createMediaElementSource(this.audio);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  private readFrequencyData() {
    if (!this.analyser || !this.frequencyData) return null;
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    return this.frequencyData;
  }

  private startAnimation() {
    this.stopAnimation();
    const tick = () => {
      this.renderPreview();
      if (this.isPlaying()) this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private stopAnimation() {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  private stopPlayback() {
    this.audio.pause();
    this.isPlaying.set(false);
    this.stopAnimation();
    this.renderPreview();
  }

  private resetAudioGraph() {
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.frequencyData = null;
    this.source = null;
    this.analyser = null;
    if (this.audioContext?.state !== 'closed') void this.audioContext?.close();
    this.audioContext = null;
    this.audioBuffer = null;
  }

  private createExportAudioGraph() {
    if (!this.audioBuffer) return null;
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    const context = new AudioContextCtor();
    const source = context.createBufferSource();
    const analyser = context.createAnalyser();
    const destination = context.createMediaStreamDestination();
    source.buffer = this.audioBuffer;
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(destination);
    return {
      context,
      source,
      analyser,
      destination,
      frequencyData: new Uint8Array(analyser.frequencyBinCount),
    };
  }

  private releaseObjectUrl() {
    if (!this.objectUrl) return;
    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }

  private resampleValues(values: number[], count: number) {
    if (!values.length) return this.visualizerService.createIdlePeaks(count);
    return Array.from({ length: Math.max(8, Math.floor(count)) }, (_, index) => {
      const sourceIndex = Math.floor((index / Math.max(1, count - 1)) * (values.length - 1));
      return values[sourceIndex] ?? 0.1;
    });
  }

  private pickWebmMimeType() {
    const preferred = 'video/webm;codecs=vp9,opus';
    return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(preferred)
      ? preferred
      : 'video/webm';
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private exportName(extension: 'png' | 'webm') {
    const base = (this.settings.title || this.audioFileName() || 'waveyard-visualizer')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${base || 'waveyard-visualizer'}-${this.settings.format}.${extension}`;
  }
}
