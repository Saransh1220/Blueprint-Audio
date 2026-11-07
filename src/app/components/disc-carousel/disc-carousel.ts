import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  NgZone,
  type OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';

import {
  fitSize,
  indexAt,
  inkFor,
  offsetOf,
  type PoseConfig,
  poseOf,
  releaseTarget,
  rubber,
  springOf,
  springStep,
  targetFor,
  textWidth,
  wrapIndex,
} from './disc-motion';

export interface DiscCredit {
  label: string;
  value: string;
}

export interface DiscStat {
  label: string;
  value: string;
}

export interface DiscItem {
  id: string;
  title: string;
  imageUrl?: string;
  alt?: string;
  credits: DiscCredit[];
  stats?: DiscStat[];
}

/** Label colours for discs without cover art: background, figure, accent. */
const PALETTES: readonly [string, string, string][] = [
  ['#1b1d1f', '#3f6b3a', '#c9d6c4'],
  ['#f2e3c6', '#d2452b', '#2a5d8f'],
  ['#141414', '#e9e4da', '#c8a24a'],
  ['#f0c94c', '#e8572b', '#2b2622'],
  ['#2d3f7a', '#e8b4c8', '#f4efe6'],
  ['#d9e3df', '#16443f', '#f08a5d'],
];

const POSE: PoseConfig = { spacing: 1.02, rise: 0.24, depth: 0.42, yaw: 22, fan: -10, roll: 110 };
const TILT = -6;
const BOUNCE = 0.22;
const DURATION = 0.9;

interface DragState {
  id: number;
  x0: number;
  pos0: number;
  moved: boolean;
  samples: { t: number; x: number }[];
}

let nextUid = 0;

/**
 * A catalogue told in discs: each item is a printed disc on a slanted line that climbs out of the
 * page toward you. The chosen one sits in the middle, the ones before it shrink away to the left,
 * the next looms large at the top right. Drag, flick, sideways swipes, arrow keys and the buttons
 * all move one target; frames are written straight to the DOM and stop when the springs settle.
 */
@Component({
  selector: 'app-disc-carousel',
  templateUrl: './disc-carousel.html',
  styleUrl: './disc-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
})
export class DiscCarouselComponent implements OnDestroy {
  private readonly zone = inject(NgZone);

  readonly items = input.required<readonly DiscItem[]>();
  readonly ariaLabel = input('Featured beats');
  /** The chosen disc turns like a record while this is true. */
  readonly spinning = input(false);
  readonly hint = input('Drag to browse');

  readonly activeChange = output<number>();
  /** Clicking (or Enter on) the disc that is already chosen. */
  readonly selected = output<number>();

  readonly uid = `dcc${nextUid++}`;
  readonly active = signal(0);
  readonly dragging = signal(false);
  readonly current = computed(() => this.items()[this.active()]);
  /** A one-item list keyed by id, so the credits block re-creates (and re-animates) per disc. */
  readonly currentList = computed(() => {
    const item = this.current();
    return item ? [item] : [];
  });
  readonly count = computed(() => String(this.items().length).padStart(2, '0'));
  readonly position = computed(() => String(this.active() + 1).padStart(2, '0'));

  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly slides = viewChildren<ElementRef<HTMLElement>>('slide');

  // Everything the frame loop reads, kept off signals so a frame costs no change detection.
  private a = 0;
  private va = 0;
  private b = 0;
  private vb = 0;
  private target = 0;
  private raf = 0;
  private last = 0;
  private size = 300;
  private reduced = false;
  private drag: DragState | null = null;
  private clickBlock = false;
  private wheel = 0;
  private wheelAt = 0;
  private stepAt = 0;
  private cleanup: (() => void)[] = [];

  constructor() {
    // Repaint whenever the slides appear or change; clamp the target if the list shrank.
    effect(() => {
      const n = this.items().length;
      this.slides();
      untracked(() => {
        if (n && this.target > n - 1) this.setTarget(n - 1);
        else if (this.active() > n - 1) this.active.set(Math.max(0, n - 1));
        this.paint();
      });
    });

    effect(() => {
      const rootEl = this.root()?.nativeElement;
      const stageEl = this.stage()?.nativeElement;
      if (!rootEl || !stageEl) return;
      untracked(() => this.attach(rootEl, stageEl));
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    for (const fn of this.cleanup) fn();
  }

  // ── Labels for discs without cover art ──────────────────────────────────────────────────────

  palette(i: number): readonly [string, string, string] {
    return PALETTES[i % PALETTES.length];
  }

  ink(i: number): string {
    return inkFor(this.palette(i)[0]);
  }

  labelSize(title: string): number {
    return fitSize(title.length, 226 * 0.86, 21);
  }

  labelWidth(title: string): number {
    return textWidth(title.length, this.labelSize(title));
  }

  readonly rings = [100, 93, 86, 79, 72, 65, 58, 51, 44];

  // ── Input ───────────────────────────────────────────────────────────────────────────────────

  next(): void {
    this.step(1);
  }

  prev(): void {
    this.step(-1);
  }

  onSlideClick(i: number): void {
    if (this.clickBlock) return;
    if (i === this.active()) this.selected.emit(i);
    else this.goTo(i);
  }

  onKeydown(event: KeyboardEvent): void {
    const n = this.items().length;
    let handled = true;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') this.step(1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') this.step(-1);
    else if (event.key === 'Home') this.goTo(0);
    else if (event.key === 'End') this.goTo(n - 1);
    else handled = false;
    if (handled) event.preventDefault();
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !this.items().length) return;
    if ((event.target as Element).closest('[data-dcc-ui]')) return;
    this.drag = {
      id: event.pointerId,
      x0: event.clientX,
      pos0: this.a,
      moved: false,
      samples: [{ t: event.timeStamp, x: event.clientX }],
    };
  }

  onPointerMove(event: PointerEvent): void {
    const rootEl = this.root()?.nativeElement;
    const stageEl = this.stage()?.nativeElement;
    const d = this.drag;
    // The glint and the chosen disc's lean follow a mouse, never a finger.
    if (event.pointerType === 'mouse' && !d?.moved && rootEl && stageEl) {
      const box = stageEl.getBoundingClientRect();
      const cx = clamp((event.clientX - (box.left + box.width / 2)) / box.width);
      const cy = clamp((event.clientY - (box.top + box.height / 2)) / box.height);
      rootEl.style.setProperty('--dcc-px', cx.toFixed(3));
      rootEl.style.setProperty('--dcc-py', cy.toFixed(3));
    }
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      d.x0 = event.clientX;
      d.pos0 = this.a;
      this.va = 0;
      rootEl?.setPointerCapture?.(event.pointerId);
      this.dragging.set(true);
    }
    const n = this.items().length;
    const raw = d.pos0 - (event.clientX - d.x0) / (this.size * POSE.spacing);
    this.a = rubber(raw, n);
    d.samples.push({ t: event.timeStamp, x: event.clientX });
    if (d.samples.length > 6) d.samples.shift();
    this.syncActive(indexAt(this.a, n, true));
    this.kick();
  }

  onPointerUp(event: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== event.pointerId) return;
    this.drag = null;
    if (!d.moved) return;
    this.dragging.set(false);
    this.clickBlock = true;
    setTimeout(() => {
      this.clickBlock = false;
    }, 0);
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const ms = Math.max(last.t - first.t, 1);
    // px per ms → slides per second, against the drag direction
    const v =
      event.type === 'pointercancel'
        ? 0
        : (-(last.x - first.x) / ms / (this.size * POSE.spacing)) * 1000;
    this.va = v;
    this.setTarget(releaseTarget(this.a, v, this.items().length, true));
  }

  onPointerLeave(): void {
    const rootEl = this.root()?.nativeElement;
    rootEl?.style.setProperty('--dcc-px', '0');
    rootEl?.style.setProperty('--dcc-py', '0');
  }

  // ── Motion ──────────────────────────────────────────────────────────────────────────────────

  private attach(rootEl: HTMLElement, stageEl: HTMLElement): void {
    for (const fn of this.cleanup) fn();
    this.cleanup = [];

    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = mq.matches;
      const onChange = () => {
        this.reduced = mq.matches;
      };
      mq.addEventListener?.('change', onChange);
      this.cleanup.push(() => mq.removeEventListener?.('change', onChange));
    }

    if (typeof ResizeObserver !== 'undefined') {
      const measure = () => {
        this.size = stageEl.offsetWidth || 300;
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(stageEl);
      this.cleanup.push(() => ro.disconnect());
    }

    // Horizontal trackpad swipes step through; the vertical wheel is left to the page.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now - this.wheelAt > 160) this.wheel = 0;
      this.wheelAt = now;
      this.wheel += e.deltaX;
      if (Math.abs(this.wheel) > 50 && now - this.stepAt > 320) {
        this.step(Math.sign(this.wheel));
        this.wheel = 0;
        this.stepAt = now;
      }
    };
    this.zone.runOutsideAngular(() =>
      rootEl.addEventListener('wheel', onWheel, { passive: false }),
    );
    this.cleanup.push(() => rootEl.removeEventListener('wheel', onWheel));
  }

  private goTo(i: number): void {
    this.setTarget(targetFor(i, this.target, this.items().length, true));
  }

  private step(by: number): void {
    this.setTarget(Math.round(this.target) + by);
  }

  private setTarget(t: number): void {
    const n = this.items().length;
    if (!n) return;
    this.target = t;
    this.syncActive(indexAt(t, n, true));
    this.kick();
  }

  private syncActive(i: number): void {
    if (i === this.active()) return;
    this.active.set(i);
    this.activeChange.emit(i);
  }

  private kick(): void {
    if (this.raf) return;
    this.zone.runOutsideAngular(() => {
      this.raf = requestAnimationFrame((now) => this.frame(now));
    });
  }

  private frame(now: number): void {
    const dt = Math.min((now - (this.last || now)) / 1000, 1 / 20);
    this.last = now;
    const s = springOf(BOUNCE, DURATION);
    if (this.reduced && !this.drag) {
      this.a = this.b = this.target;
      this.va = this.vb = 0;
    } else {
      // While dragging the line is under the finger and only the swing chases it.
      if (!this.drag)
        [this.a, this.va] = springStep(this.a, this.va, this.target, s.omega, s.slide, dt);
      [this.b, this.vb] = springStep(this.b, this.vb, this.a, s.omega * 1.05, s.tilt, dt);
    }
    this.paint();
    const settled =
      !this.drag &&
      Math.abs(this.a - this.target) < 1e-3 &&
      Math.abs(this.va) < 1e-2 &&
      Math.abs(this.b - this.a) < 1e-3 &&
      Math.abs(this.vb) < 1e-2;
    if (settled) {
      this.a = this.b = this.target;
      this.va = this.vb = 0;
      this.paint();
      this.raf = 0;
      this.last = 0;
      return;
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private paint(): void {
    const n = this.items().length;
    const slides = this.slides();
    for (let i = 0; i < slides.length; i++) {
      const el = slides[i].nativeElement;
      const p = poseOf(offsetOf(i, this.a, n, true), offsetOf(i, this.b, n, true), POSE);
      el.style.transform =
        `translate3d(calc(${p.x.toFixed(4)} * var(--dcc-s)), calc(${p.y.toFixed(4)} * var(--dcc-s)), ` +
        `calc(${p.z.toFixed(4)} * var(--dcc-s))) rotateZ(${TILT}deg) rotateY(${p.yaw.toFixed(3)}deg) rotateX(8deg)`;
      el.style.zIndex = String(p.zIndex);
      el.style.opacity = p.opacity < 1 ? p.opacity.toFixed(3) : '';
      el.style.visibility = p.hidden || p.opacity <= 0 ? 'hidden' : '';
      el.style.setProperty('--dcc-roll', `${p.roll.toFixed(2)}deg`);
      el.style.setProperty('--dcc-glint', `${(p.yaw * 3 + p.x * 40).toFixed(1)}deg`);
    }
  }

  /** Test seam: where the line currently rests, as a wrapped index. */
  get resting(): number {
    return wrapIndex(Math.round(this.target), this.items().length);
  }
}

function clamp(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
