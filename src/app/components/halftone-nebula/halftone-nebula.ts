import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  NgZone,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import {
  driftPos,
  FRAG,
  FRAG_FIELD,
  hexToRgb,
  layoutSparkles,
  MAX_RIPPLES,
  MAX_SPARKS,
  NEBULA_DEFAULTS,
  NEBULA_PRESETS,
  type NebulaParams,
  pushSparkle,
  UNIFORMS,
  uName,
  VERT,
} from './halftone-nebula.shader';

export * from './halftone-nebula.shader';

/**
 * Raw WebGL2, no textures or assets. The canvas sizes itself from its own box rather than the
 * window and releases every GL object on teardown. Content projected into it sits above the sky;
 * pointer events pass through the overlay unless a child opts back in with `pointer-events: auto`.
 */
@Component({
  selector: 'app-halftone-nebula',
  templateUrl: './halftone-nebula.html',
  styleUrl: './halftone-nebula.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HalftoneNebulaComponent {
  /** Explicit height. The canvas fills this box, so it must be a definite length. */
  readonly height = input('100svh');
  /** A named palette + layout, layered over the defaults. */
  readonly preset = input<keyof typeof NEBULA_PRESETS>('crimson');
  /** Overrides layered over the preset. Pass a stable object. */
  readonly params = input<Partial<NebulaParams>>();
  /** Pointer lights the gas and parallaxes the sky; click drops a sparkle. */
  readonly interactive = input(true);
  /** "scroll" keeps page scrolling on touch; "draw" takes the gesture. */
  readonly touch = input<'scroll' | 'draw'>('scroll');
  /** Device-pixel-ratio cap. The shader is per-pixel, so 2 is plenty. */
  readonly maxDpr = input(2);

  readonly failed = signal(false);

  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reduced = signal(false);
  /** Bumped when the GL context is restored, so the setup effect runs again. */
  private readonly generation = signal(0);

  /** Defaults < preset < explicit params. The loop reads this live, so tuning never restarts GL. */
  private readonly P = computed<NebulaParams>(() => ({
    ...NEBULA_DEFAULTS,
    ...(NEBULA_PRESETS[this.preset()] ?? {}),
    ...(this.params() ?? {}),
  }));

  private teardown: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const sync = () => this.reduced.set(mq.matches);
      sync();
      mq.addEventListener('change', sync);
      this.destroyRef.onDestroy(() => mq.removeEventListener('change', sync));
    }

    effect(() => {
      const root = this.root()?.nativeElement;
      const canvas = this.canvas()?.nativeElement;
      const interactive = this.interactive();
      const maxDpr = this.maxDpr();
      const reduced = this.reduced();
      this.generation();
      if (!root || !canvas) return;
      untracked(() => {
        this.teardown?.();
        try {
          this.teardown = this.zone.runOutsideAngular(() =>
            this.start(root, canvas, interactive, maxDpr, reduced),
          );
        } catch (error) {
          // Any GL failure leaves the still sky rather than a thrown error and a black box.
          console.error('halftone-nebula:', error);
          this.teardown = null;
          this.failed.set(true);
        }
      });
    });

    this.destroyRef.onDestroy(() => this.teardown?.());
  }

  private start(
    root: HTMLElement,
    canvas: HTMLCanvasElement,
    interactive: boolean,
    maxDpr: number,
    reduced: boolean,
  ): (() => void) | null {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      this.failed.set(true);
      return null;
    }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('halftone-nebula:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const link = (fragSrc: string) => {
      const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
      const program = vs && fs ? gl.createProgram() : null;
      if (!program || !vs || !fs) return null;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('halftone-nebula:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      const loc = (n: string) => gl.getUniformLocation(program, n);
      return {
        program,
        tuned: UNIFORMS.map(([k, kind]) => [loc(uName(k)), k, kind] as const),
        U: {
          res: loc('uRes'),
          dpr: loc('uDpr'),
          time: loc('uTime'),
          pointer: loc('uPointer'),
          pointerOn: loc('uPointerOn'),
          look: loc('uLook'),
          sparkCount: loc('uSparkCount'),
          spark: loc('uSpark'),
          sparkB: loc('uSparkB'),
          ripple: loc('uRipple'),
          planet: loc('uPlanet'),
          field: loc('uField'),
          fieldSize: loc('uFieldSize'),
        },
      };
    };
    // Pass 1 computes the gas once per pixel cell; pass 2 prints it at full resolution.
    const fieldPass = link(FRAG_FIELD);
    const drawPass = link(FRAG);
    if (vs) gl.deleteShader(vs);
    if (!fieldPass || !drawPass) {
      if (fieldPass) gl.deleteProgram(fieldPass.program);
      if (drawPass) gl.deleteProgram(drawPass.program);
      this.failed.set(true);
      return null;
    }

    const vao = gl.createVertexArray();
    const fieldTex = gl.createTexture();
    const fieldFbo = gl.createFramebuffer();
    let fieldW = 0;
    let fieldH = 0;
    const ensureField = (w: number, h: number) => {
      if (w === fieldW && h === fieldH) return;
      fieldW = w;
      fieldH = h;
      gl.bindTexture(gl.TEXTURE_2D, fieldTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTex, 0);
    };
    const params = () => this.P();

    // ---- sizing, from the element rather than the window --------------------
    let cssW = 1;
    let cssH = 1;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, Math.max(maxDpr, 0.5));
      cssW = Math.max(canvas.clientWidth, 1);
      cssH = Math.max(canvas.clientHeight, 1);
      const w = Math.floor(cssW * dpr);
      const h = Math.floor(cssH * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (reduced) paint();
    };

    // ---- the sky ------------------------------------------------------------
    let sparks = layoutSparkles(params().seed, params().sparkles);
    let laidOut = params().seed + ':' + params().sparkles;
    const flare = new Float32Array(MAX_SPARKS);
    const sparkA = new Float32Array(MAX_SPARKS * 4);
    const sparkB = new Float32Array(MAX_SPARKS * 4);
    const ripples = new Float32Array(MAX_RIPPLES * 4);
    let rippleNext = 0;

    // Reduced motion freezes the clock on a frame that is already lit.
    const FROZEN = 14;
    const t0 = performance.now();
    const clock = () => (reduced ? FROZEN : ((performance.now() - t0) / 1000) * params().speed);
    let lastClock = 0;

    // ---- the pointer --------------------------------------------------------
    let targetX = 0.5;
    let targetY = 0.5;
    let lampX = 0.5;
    let lampY = 0.5;
    let lookX = 0;
    let lookY = 0;
    let lampOn = 0;
    let inside = false;
    let lastTouched = -1e9;

    const toUv = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [
        Math.min(Math.max((e.clientX - r.left) / Math.max(r.width, 1), 0), 1),
        Math.min(Math.max(1 - (e.clientY - r.top) / Math.max(r.height, 1), 0), 1),
      ];
    };
    const onMove = (e: PointerEvent) => {
      if (!interactive) return;
      [targetX, targetY] = toUv(e);
      inside = true;
      lastTouched = performance.now() / 1000;
    };
    const onLeave = () => {
      inside = false;
    };
    const onDown = (e: PointerEvent) => {
      if (!interactive || e.button > 0) return;
      // Let buttons and links in the overlay keep their clicks.
      if (
        (e.target as HTMLElement | null)?.closest(
          'a,button,input,textarea,select,label,[role=button]',
        )
      )
        return;
      const [x, y] = toUv(e);
      targetX = x;
      targetY = y;
      inside = true;
      lastTouched = performance.now() / 1000;
      const now = clock();
      const rand = Math.random();
      sparks = pushSparkle(sparks, {
        x,
        y,
        reach: 0.045 + 0.08 * rand,
        core: 0.006 + 0.008 * rand,
        tint: Math.random() < 0.2 ? 1 : 0,
        phase: Math.random() * 6.283,
        born: reduced ? now - 10 : now,
        user: true,
      });
      ripples.set([x * cssW, y * cssH, now, reduced ? 0 : 1], rippleNext * 4);
      rippleNext = (rippleNext + 1) % MAX_RIPPLES;
      if (reduced) paint();
    };

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointercancel', onLeave);

    let raf = 0;
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onRestored = () => this.generation.update((g) => g + 1);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    // ---- one frame ----------------------------------------------------------
    const paint = () => {
      const p = params();
      const key = p.seed + ':' + p.sparkles;
      if (key !== laidOut) {
        sparks = [...layoutSparkles(p.seed, p.sparkles), ...sparks.filter((s) => s.user)].slice(
          0,
          MAX_SPARKS,
        );
        laidOut = key;
      }
      const t = clock();
      const dt = Math.min(Math.max(t - lastClock, 0), 0.1);
      lastClock = t;

      // With no hand on it, the lamp wanders on its own so the sky never sits dead, and a still
      // capture of it still shows the lens.
      const idle = !inside || performance.now() / 1000 - lastTouched > 6;
      const [gx, gy] = driftPos(t * 0.6);
      const wantX = idle ? gx : targetX;
      const wantY = idle ? gy : targetY;
      const k = reduced ? 1 : 1 - Math.exp(-dt * (idle ? 1.5 : 7));
      lampX += (wantX - lampX) * k;
      lampY += (wantY - lampY) * k;
      lookX += ((wantX - 0.5) * 2 - lookX) * k;
      lookY += ((wantY - 0.5) * 2 - lookY) * k;
      const onTarget = interactive && !reduced ? (idle ? 0.55 : 1) : 0;
      lampOn += (onTarget - lampOn) * (reduced ? 1 : 1 - Math.exp(-dt * 3));

      const minSide = Math.min(cssW, cssH);
      const n = Math.min(sparks.length, MAX_SPARKS);
      for (let i = 0; i < n; i++) {
        const s = sparks[i];
        const reach = s.reach * minSide;
        const d = Math.hypot(s.x * cssW - lampX * cssW, s.y * cssH - lampY * cssH);
        const want =
          interactive && !reduced ? Math.exp(-(d * d) / Math.max(reach * reach * 0.6, 400)) : 0;
        flare[i] += (want - flare[i]) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
        sparkA.set([s.x * cssW, s.y * cssH, reach, s.born], i * 4);
        sparkB.set([s.tint, s.phase, flare[i], Math.max(s.core * minSide, 1.5)], i * 4);
      }

      const setUniforms = (pass: NonNullable<ReturnType<typeof link>>) => {
        const { tuned, U } = pass;
        for (const [l, name, kind] of tuned) {
          const v = p[name];
          if (kind === 'c') gl.uniform3fv(l, hexToRgb(v as string));
          else if (kind === 'i' || kind === 'b') gl.uniform1i(l, Number(v) | 0);
          else gl.uniform1f(l, v as number);
        }
        gl.uniform2f(U.res, canvas.width, canvas.height);
        gl.uniform1f(U.dpr, canvas.width / cssW);
        gl.uniform1f(U.time, t);
        gl.uniform2f(U.pointer, lampX * cssW, lampY * cssH);
        gl.uniform1f(U.pointerOn, lampOn);
        gl.uniform2f(U.look, lookX, lookY);
        gl.uniform1i(U.sparkCount, n);
        gl.uniform4fv(U.spark, sparkA);
        gl.uniform4fv(U.sparkB, sparkB);
        gl.uniform4fv(U.ripple, ripples);
        gl.uniform4f(
          U.planet,
          p.planetX * cssW,
          p.planetY * cssH,
          p.planetRadius * minSide,
          p.planet ? 1 : 0,
        );
      };

      // One texel per pixel cell; the +1 covers a partial cell at the right and top edges.
      const cell = Math.max(p.pixel, 1);
      const fw = Math.ceil(cssW / cell) + 1;
      const fh = Math.ceil(cssH / cell) + 1;
      gl.bindVertexArray(vao);
      ensureField(fw, fh);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFbo);
      gl.viewport(0, 0, fw, fh);
      gl.useProgram(fieldPass.program);
      setUniforms(fieldPass);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(drawPass.program);
      setUniforms(drawPass);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTex);
      gl.uniform1i(drawPass.U.field, 0);
      gl.uniform2i(drawPass.U.fieldSize, fw, fh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // ---- loop, paused whenever nobody can see it -----------------------------
    let visible = true;
    const frame = () => {
      raf = 0;
      paint();
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!reduced && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      wake();
    });
    io.observe(root);
    document.addEventListener('visibilitychange', wake);

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Paint before the first rAF so nothing ever flashes an empty canvas.
    paint();
    wake();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', wake);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointercancel', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(fieldTex);
      gl.deleteFramebuffer(fieldFbo);
      gl.deleteProgram(fieldPass.program);
      gl.deleteProgram(drawPass.program);
    };
  }
}
