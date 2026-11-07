// The disc carousel's motion: one number, the position, chased by two springs — a stiff one for the
// slide along the line and a looser one for depth, turn and roll. Pure functions, so the component
// only has to write frames to the DOM.

export function wrapIndex(i: number, n: number): number {
  if (n <= 0) return 0;
  return ((i % n) + n) % n;
}

/** The slide showing at a position. Without looping, a drag past an end still means the end slide. */
export function indexAt(pos: number, n: number, loop: boolean): number {
  if (n <= 0) return 0;
  const i = Math.round(pos);
  return loop ? wrapIndex(i, n) : Math.min(Math.max(i, 0), n - 1);
}

/** Signed distance from the position to slide i, in slides. Looping takes the short way round. */
export function offsetOf(i: number, pos: number, n: number, loop: boolean): number {
  const d = i - pos;
  return loop && n > 0 ? d - n * Math.round(d / n) : d;
}

/** Past either end the line still follows a drag, at a third of the speed. */
export function rubber(pos: number, n: number): number {
  if (pos < 0) return pos / 3;
  if (pos > n - 1) return n - 1 + (pos - (n - 1)) / 3;
  return pos;
}

/** Natural frequency and damping ratios from a bounce and a duration in seconds. */
export function springOf(
  bounce: number,
  duration: number,
): { omega: number; slide: number; tilt: number } {
  const b = Math.min(Math.max(bounce, 0), 0.9);
  return { omega: (2 * Math.PI) / Math.max(duration, 0.1), slide: 1 - b / 2, tilt: 1 - b };
}

/** One semi-implicit Euler step, sub-stepped so a long frame can't blow it up. */
export function springStep(
  x: number,
  v: number,
  target: number,
  omega: number,
  zeta: number,
  dt: number,
): [number, number] {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let k = 0; k < steps; k++) {
    v += (-omega * omega * (x - target) - 2 * zeta * omega * v) * h;
    x += v * h;
  }
  return [x, v];
}

/** Where a released drag comes to rest: about a fifth of a second of the flick, at most three on. */
export function releaseTarget(pos: number, velocity: number, n: number, loop: boolean): number {
  const here = Math.round(pos);
  const t = Math.min(Math.max(Math.round(pos + velocity * 0.2), here - 3), here + 3);
  return loop ? t : Math.min(Math.max(t, 0), n - 1);
}

/** The nearest position showing slide i, from where the target is now. */
export function targetFor(i: number, target: number, n: number, loop: boolean): number {
  if (!loop) return Math.min(Math.max(i, 0), n - 1);
  const here = Math.round(target);
  let d = i - wrapIndex(here, n);
  d -= n * Math.round(d / n);
  return here + d;
}

export interface PoseConfig {
  spacing: number;
  rise: number;
  depth: number;
  yaw: number;
  fan: number;
  roll: number;
}

/**
 * A disc's pose. `dx` is its distance from the sliding line, `d` from the trailing spring. Position
 * follows the line; depth, turn and roll follow the trailing spring, which is what makes the discs
 * swing. Discs coming toward the viewer stop approaching two steps out so perspective can't explode.
 */
export function poseOf(dx: number, d: number, c: PoseConfig) {
  const near = Math.min(d, 2.2);
  return {
    x: dx * c.spacing,
    y: -dx * c.rise,
    z: near * c.depth,
    yaw: c.yaw + d * c.fan,
    roll: d * c.roll,
    zIndex: 100 + Math.round(d * 10),
    opacity: d < -2.5 ? Math.max(0, 1 - (-d - 2.5) / 1.2) : 1,
    hidden: dx < -4 || dx > 2.8,
  };
}

// ── Generated label art (for beats without cover art) ──────────────────────────────────────────

/** Black or white print against a hex background. Anything unparseable gets white. */
export function inkFor(bg: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(bg.trim());
  if (!m) return '#ffffff';
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const lin = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  return luminance > 0.36 ? '#111111' : '#ffffff';
}

/** Font size (in the 200-unit disc) for `chars` condensed caps across `room` units, capped at `max`. */
export function fitSize(chars: number, room: number, max: number): number {
  return Math.max(6, Math.min(max, room / (Math.max(chars, 1) * 0.56)));
}

/** The width `chars` condensed caps take at size `fs`: what the label is pinned to whatever font arrives. */
export function textWidth(chars: number, fs: number): number {
  return Math.max(chars, 1) * fs * 0.56;
}
