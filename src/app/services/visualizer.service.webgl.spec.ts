import { VisualizerService } from './visualizer.service';

const rendererInstances: Array<Record<string, ReturnType<typeof vi.fn>>> = [];

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class FakeRenderer {
    outputColorSpace = '';
    setSize = vi.fn();
    setClearColor = vi.fn();
    render = vi.fn();
    dispose = vi.fn();
    forceContextLoss = vi.fn();
    constructor() {
      rendererInstances.push(this as unknown as Record<string, ReturnType<typeof vi.fn>>);
    }
  }
  return { ...actual, WebGLRenderer: FakeRenderer };
});

describe('VisualizerService WebGL fluid renderer', () => {
  let titleCtx: Record<string, unknown>;
  let getContext: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rendererInstances.length = 0;
    titleCtx = { clearRect: vi.fn(), fillText: vi.fn() };
    getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      kind: string,
    ) => {
      if (kind === 'webgl2') return { getExtension: () => ({}) };
      if (kind === '2d') return titleCtx;
      return null;
    }) as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('creates one renderer per canvas, resizes, renders and disposes', () => {
    const service = new VisualizerService();
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const settings = service.createDefaultSettings('fluid-gradient', {
      showTitle: true,
      title: 'Glow',
    });
    const frame = service.createFrameData(null, 16, 0, 2);
    service.renderFrame(canvas, settings, frame);
    service.renderFrame(canvas, settings, frame);
    expect(rendererInstances).toHaveLength(1);
    const r = rendererInstances[0];
    expect(r['render']).toHaveBeenCalledTimes(2);
    expect(r['setSize']).toHaveBeenCalledTimes(1);
    expect(titleCtx['fillText']).toHaveBeenCalledTimes(1);

    canvas.width = 800;
    service.renderFrame(canvas, settings, frame);
    expect(r['setSize']).toHaveBeenCalledTimes(2);

    service.disposeCanvas(canvas);
    expect(r['dispose']).toHaveBeenCalled();
    expect(r['forceContextLoss']).toHaveBeenCalled();
  });

  it('hides the title when empty and tolerates a missing title context', () => {
    const service = new VisualizerService();
    const canvas = document.createElement('canvas');
    service.renderFrame(
      canvas,
      service.createDefaultSettings('fluid-gradient', { showTitle: true, title: '   ' }),
      service.createFrameData(null, 8),
    );
    expect(titleCtx['fillText']).not.toHaveBeenCalled();

    getContext.mockImplementation(((kind: string) =>
      kind === 'webgl2' ? { getExtension: () => ({}) } : null) as never);
    const s2 = service.createDefaultSettings('fluid-gradient', { showTitle: true, title: 'X' });
    expect(() =>
      service.renderFrame(document.createElement('canvas'), s2, service.createFrameData(null, 8)),
    ).not.toThrow();
  });

  it('ignores non-fluid settings passed straight to the renderer', () => {
    const service = new VisualizerService();
    const canvas = document.createElement('canvas');
    service.renderFrame(
      canvas,
      service.createDefaultSettings('fluid-gradient'),
      service.createFrameData(null, 8),
    );
    const internal = (
      service as unknown as {
        fluidRenderers: Map<unknown, { render: (s: unknown, f: unknown) => void }>;
      }
    ).fluidRenderers.get(canvas)!;
    internal.render(service.createDefaultSettings('vinyl'), service.createFrameData(null, 8));
    expect(rendererInstances[0]['render']).toHaveBeenCalledTimes(1);
  });
});
