import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService, VisualizerService } from '../../../services';
import { StudioVisualizerComponent } from './studio-visualizer.component';

describe('StudioVisualizerComponent timeline wave and text layers', () => {
  let fixture: ComponentFixture<StudioVisualizerComponent>;
  let component: StudioVisualizerComponent;

  beforeEach(async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    await TestBed.configureTestingModule({
      imports: [StudioVisualizerComponent],
      providers: [
        VisualizerService,
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), info: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(StudioVisualizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.selectVisualizer('timeline-wave');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  it('opens the timeline editor with scroll controls and a Text tab', () => {
    expect(component.settings.kind).toBe('timeline-wave');
    expect(component.sliderSet.controls.map((c) => c.key)).toContain('windowSeconds');
    expect(component.inspectorTabs.map((t) => t.id)).toContain('text');
    component.setTimelineStyle('smooth');
    expect(component.timelineSettings.style).toBe('smooth');
  });

  it('hides the Text tab for the WebGL fluid visualizer', () => {
    component.setInspectorTab('text');
    component.selectVisualizer('fluid-gradient');
    expect(component.inspectorTab()).toBe('style');
    expect(component.inspectorTabs.map((t) => t.id)).not.toContain('text');
  });

  it('adds, edits, duplicates and removes text layers', () => {
    const bpm = component.textTemplates.find((t) => t.id === 'bpm');
    if (!bpm) throw new Error('missing BPM template');
    component.addTextLayer(bpm);
    expect(component.textLayers).toHaveLength(1);
    const layer = component.selectedLayer;
    expect(layer?.text).toBe('128 BPM');

    component.updateLayer(layer?.id ?? '', { text: '140 BPM', size: 6 });
    expect(component.selectedLayer).toMatchObject({ text: '140 BPM', size: 6 });

    component.setLayerFont(layer?.id ?? '', 'Playfair Display');
    expect(component.selectedLayer?.fontFamily).toBe('Playfair Display');

    component.duplicateLayer(layer?.id ?? '');
    expect(component.textLayers).toHaveLength(2);
    expect(new Set(component.textLayers.map((l) => l.id)).size).toBe(2);

    component.removeLayer(layer?.id ?? '');
    expect(component.textLayers).toHaveLength(1);
  });

  it('drags a layer within the canvas bounds', () => {
    const title = component.textTemplates[0];
    component.addTextLayer(title);
    const layer = component.selectedLayer;
    if (!layer) throw new Error('layer missing');
    vi.spyOn(
      component.previewCanvas?.nativeElement as HTMLCanvasElement,
      'getBoundingClientRect',
    ).mockReturnValue({ width: 400, height: 400 } as DOMRect);

    component.beginLayerDrag(layer, {
      clientX: 100,
      clientY: 100,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as PointerEvent);
    component.onDocumentPointerMove({
      clientX: 140,
      clientY: 1000,
      preventDefault: vi.fn(),
    } as unknown as PointerEvent);
    expect(component.selectedLayer?.x).toBeCloseTo(0.6);
    expect(component.selectedLayer?.y).toBe(1);

    component.onDocumentPointerUp();
    component.onDocumentPointerMove({
      clientX: 0,
      clientY: 0,
      preventDefault: vi.fn(),
    } as unknown as PointerEvent);
    expect(component.selectedLayer?.x).toBeCloseTo(0.6);
  });

  it('keeps text layers when switching visualizers', () => {
    component.addTextLayer(component.textTemplates[0]);
    component.selectVisualizer('vinyl');
    expect(component.settings.textLayers).toHaveLength(1);
  });
});
