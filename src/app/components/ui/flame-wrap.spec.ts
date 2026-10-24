import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFlameWrap, supportsHtmlInCanvas } from './flame-wrap';

function makeGl(opts: { lost?: boolean; compileOk?: boolean } = {}) {
  const calls: Record<string, ReturnType<typeof vi.fn>> = {};
  const overrides: Record<string, unknown> = {
    isContextLost: () => opts.lost ?? false,
    getShaderParameter: () => opts.compileOk ?? true,
    getShaderInfoLog: () => 'bad shader',
    getProgramParameter: () => 4,
    getActiveUniform: (_p: unknown, i: number) => ({ name: ['uTime', 'uContent', 'uRectCenter', 'uRectHalf'][i] }),
    getUniformLocation: (_p: unknown, name: string) => ({ name }),
    createShader: () => ({}),
    createProgram: () => ({}),
    createBuffer: () => ({}),
    createTexture: () => ({}),
    createFramebuffer: () => ({}),
  };
  return new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop in overrides) {
        calls[prop] ??= vi.fn(overrides[prop] as (...a: unknown[]) => unknown);
        return calls[prop];
      }
      if (/^[A-Z0-9_]+$/.test(prop)) return 1;
      calls[prop] ??= vi.fn();
      return calls[prop];
    },
  }) as any;
}

class FakeRO {
  static instances: FakeRO[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(public cb: () => void) {
    FakeRO.instances.push(this);
  }
}
class FakeIO {
  static instances: FakeIO[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(public cb: (e: { isIntersecting: boolean }[]) => void) {
    FakeIO.instances.push(this);
  }
}

describe('flame-wrap', () => {
  let rafQueue: Map<number, FrameRequestCallback>;
  let rafId: number;
  let motion: { matches: boolean; addEventListener: any; removeEventListener: any };

  const runFrame = (t = 16) => {
    const q = [...rafQueue.entries()];
    rafQueue.clear();
    q.forEach(([, cb]) => cb(t));
  };

  function setup(opts: { html?: boolean; gl?: unknown; reduced?: boolean; dims?: boolean } = {}) {
    const gl = opts.gl === undefined ? makeGl() : (opts.gl as any);
    motion.matches = !!opts.reduced;
    const output = document.createElement('canvas');
    const source = document.createElement('canvas') as any;
    const content = document.createElement('div');
    output.getContext = vi.fn(() => gl) as any;
    const ctx2d: any = { drawElementImage: vi.fn(), reset: vi.fn(), clearRect: vi.fn() };
    if (opts.html) {
      source.getContext = vi.fn(() => ctx2d);
      source.requestPaint = vi.fn();
    } else {
      source.getContext = vi.fn(() => null);
    }
    if (opts.dims !== false) {
      Object.defineProperty(output, 'clientWidth', { value: 400, configurable: true });
      Object.defineProperty(output, 'clientHeight', { value: 200, configurable: true });
      Object.defineProperty(content, 'clientWidth', { value: 200, configurable: true });
      Object.defineProperty(source, 'clientWidth', { value: 400, configurable: true });
      Object.defineProperty(source, 'clientHeight', { value: 200, configurable: true });
    }
    return { gl, output, source, content, ctx2d };
  }

  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    rafQueue = new Map();
    rafId = 0;
    FakeRO.instances = [];
    FakeIO.instances = [];
    motion = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    (window as any).matchMedia = vi.fn(() => motion);
    vi.stubGlobal('ResizeObserver', FakeRO);
    vi.stubGlobal('IntersectionObserver', FakeIO);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        rafQueue.set(++rafId, cb);
        return rafId;
      }),
    );
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => rafQueue.delete(id)),
    );
  });

  afterEach(() => {
    (window as any).matchMedia = originalMatchMedia;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('supportsHtmlInCanvas is false in jsdom', () => {
    expect(supportsHtmlInCanvas()).toBe(false);
  });

  it('supportsHtmlInCanvas detects drawElementImage + requestPaint', () => {
    const fake: any = { getContext: () => ({ drawElementImage: () => {} }), requestPaint: () => {} };
    vi.spyOn(document, 'createElement').mockReturnValue(fake);
    expect(supportsHtmlInCanvas()).toBe(true);
    fake.requestPaint = undefined;
    expect(supportsHtmlInCanvas()).toBe(false);
  });

  it('returns null without a context or when the context is lost', () => {
    expect(createFlameWrap(setup({ gl: null }), {})).toBeNull();
    expect(createFlameWrap(setup({ gl: makeGl({ lost: true }) }))).toBeNull();
  });

  it('renders frames and computes the rect from bounding boxes', () => {
    const env = setup();
    const inst = createFlameWrap(env)!;
    expect(env.output.width).toBe(400);
    runFrame(16);
    expect(env.gl.drawArrays).toHaveBeenCalledTimes(1);
    expect(env.gl.uniform2f).toHaveBeenCalledWith({ name: 'uRectCenter' }, 0, 0);
    expect(rafQueue.size).toBe(1);
    runFrame(32);
    expect(env.gl.drawArrays).toHaveBeenCalledTimes(2);
    inst.destroy();
  });

  it('logs shader compile errors', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const env = setup({ gl: makeGl({ compileOk: false }) });
    createFlameWrap(env);
    expect(err).toHaveBeenCalledWith('FlameWrap shader error:', 'bad shader');
  });

  it('handles html-in-canvas paint, upload and onpaint failure', () => {
    const env = setup({ html: true });
    const inst = createFlameWrap(env)!;
    expect(env.source.requestPaint).toHaveBeenCalled();
    expect(env.source.width).toBeGreaterThan(0);
    env.source.onpaint();
    expect(env.ctx2d.reset).toHaveBeenCalled();
    expect(env.ctx2d.drawElementImage).toHaveBeenCalledWith(env.content, 0, 0);
    runFrame();
    expect(env.gl.texImage2D).toHaveBeenCalledWith(1, 0, 1, 1, 1, env.source);
    env.ctx2d.drawElementImage.mockImplementation(() => {
      throw new Error('x');
    });
    expect(() => env.source.onpaint()).not.toThrow();
    inst.destroy();
    expect(env.source.onpaint).toBeNull();
  });

  it('reduced motion stops the loop until woken by motion change or paint', () => {
    const env = setup({ html: true, reduced: true });
    const inst = createFlameWrap(env)!;
    runFrame();
    expect(rafQueue.size).toBe(0);
    env.source.onpaint();
    expect(rafQueue.size).toBe(1);
    runFrame();
    expect(rafQueue.size).toBe(0);
    const handler = motion.addEventListener.mock.calls[0][1];
    motion.matches = false;
    handler();
    expect(rafQueue.size).toBe(1);
    inst.destroy();
    expect(motion.removeEventListener).toHaveBeenCalledWith('change', handler);
  });

  it('pauses when not visible and resumes when intersecting', () => {
    const env = setup();
    createFlameWrap(env);
    const io = FakeIO.instances[0];
    io.cb([{ isIntersecting: false }]);
    runFrame();
    expect(rafQueue.size).toBe(0);
    io.cb([{ isIntersecting: true }]);
    expect(rafQueue.size).toBe(1);
    runFrame();
    io.cb([]);
    expect(rafQueue.size).toBe(1);
  });

  it('resizes via ResizeObserver and resize()', () => {
    const env = setup();
    const inst = createFlameWrap(env)!;
    expect(FakeRO.instances[0].observe).toHaveBeenCalledWith(env.output);
    expect(FakeRO.instances[0].observe).toHaveBeenCalledWith(env.content);
    Object.defineProperty(env.output, 'clientWidth', { value: 800, configurable: true });
    FakeRO.instances[0].cb();
    expect(env.output.width).toBe(800);
    Object.defineProperty(env.output, 'clientHeight', { value: 100, configurable: true });
    inst.resize();
    expect(env.output.height).toBe(100);
  });

  it('uses 1px fallback sizes when dimensions are zero', () => {
    const env = setup({ dims: false });
    createFlameWrap(env);
    expect(env.output.width).toBe(1);
  });

  it('setOptions detects scalar and array changes', () => {
    const env = setup({ reduced: true });
    const inst = createFlameWrap(env, { speed: 2, color: [1, 0, 0] })!;
    runFrame();
    expect(rafQueue.size).toBe(0);
    inst.setOptions({ speed: 2, color: [1, 0, 0] });
    expect(rafQueue.size).toBe(0);
    inst.setOptions({ color: [1, 0, 1] });
    expect(rafQueue.size).toBe(1);
    runFrame();
    expect(rafQueue.size).toBe(0);
    inst.setOptions({ color: [1, 0] as any });
    expect(rafQueue.size).toBe(1);
    runFrame();
    inst.setOptions({ speed: 3 });
    expect(rafQueue.size).toBe(1);
  });

  it('uses bounding rects of the source when html-in-canvas is on', () => {
    const env = setup({ html: true });
    env.output.getBoundingClientRect = () =>
      ({ left: 0, right: 400, top: 0, bottom: 300, width: 400, height: 300 }) as DOMRect;
    env.source.getBoundingClientRect = () =>
      ({ left: 100, right: 300, top: 100, bottom: 200, width: 200, height: 100 }) as DOMRect;
    createFlameWrap(env);
    runFrame();
    expect(env.gl.uniform2f).toHaveBeenCalledWith({ name: 'uRectCenter' }, 200, 150);
    expect(env.gl.uniform2f).toHaveBeenCalledWith({ name: 'uRectHalf' }, 100, 50);
  });

  it('clears the source after uploading content', () => {
    const env = setup({ html: true });
    createFlameWrap(env);
    env.source.onpaint();
    runFrame();
    expect(env.ctx2d.clearRect).toHaveBeenCalled();
  });

  it('destroy is idempotent and releases resources', () => {
    const env = setup();
    const inst = createFlameWrap(env)!;
    runFrame();
    inst.destroy();
    inst.destroy();
    expect(FakeRO.instances[0].disconnect).toHaveBeenCalled();
    expect(FakeIO.instances[0].disconnect).toHaveBeenCalled();
    expect(env.gl.deleteProgram).toHaveBeenCalledTimes(2);
    rafQueue.clear();
    inst.setOptions({ speed: 5 });
    inst.resize();
    expect(rafQueue.size).toBe(0);
  });

  it('frame callback after destroy is a no-op', () => {
    const env = setup();
    const inst = createFlameWrap(env)!;
    const pending = [...rafQueue.values()];
    inst.destroy();
    pending.forEach((cb) => cb(10));
    expect(env.gl.drawArrays).not.toHaveBeenCalled();
  });
});
