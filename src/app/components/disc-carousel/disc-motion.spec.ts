import {
  fitSize,
  indexAt,
  inkFor,
  offsetOf,
  poseOf,
  releaseTarget,
  rubber,
  springOf,
  springStep,
  targetFor,
  textWidth,
  wrapIndex,
} from './disc-motion';

const pose = { spacing: 1, rise: 0.25, depth: 0.4, yaw: 20, fan: -10, roll: 100 };

describe('disc motion', () => {
  it('wraps indexes', () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(7, 5)).toBe(2);
    expect(wrapIndex(3, 0)).toBe(0);
  });

  it('maps a position to a slide, clamped unless looping', () => {
    expect(indexAt(2.4, 5, false)).toBe(2);
    expect(indexAt(-3, 5, false)).toBe(0);
    expect(indexAt(9, 5, false)).toBe(4);
    expect(indexAt(6, 5, true)).toBe(1);
    expect(indexAt(1, 0, true)).toBe(0);
  });

  it('measures offsets the short way round when looping', () => {
    expect(offsetOf(4, 0, 5, true)).toBe(-1);
    expect(offsetOf(4, 0, 5, false)).toBe(4);
    expect(offsetOf(1, 0, 0, true)).toBe(1);
  });

  it('follows a drag past the ends at a third of the speed', () => {
    expect(rubber(-3, 5)).toBe(-1);
    expect(rubber(7, 5)).toBe(5);
    expect(rubber(2, 5)).toBe(2);
  });

  it('derives spring constants and clamps bounce', () => {
    const s = springOf(0.22, 0.9);
    expect(s.omega).toBeCloseTo((2 * Math.PI) / 0.9);
    expect(s.slide).toBeCloseTo(0.89);
    expect(s.tilt).toBeCloseTo(0.78);
    expect(springOf(5, 0).tilt).toBeCloseTo(0.1);
    expect(springOf(-1, 1).slide).toBe(1);
  });

  it('settles on its target without blowing up on a long frame', () => {
    const s = springOf(0.22, 0.9);
    let x = 0;
    let v = 0;
    for (let i = 0; i < 400; i++) [x, v] = springStep(x, v, 3, s.omega, s.slide, 1 / 60);
    expect(x).toBeCloseTo(3, 3);
    expect(Math.abs(v)).toBeLessThan(1e-3);
    const [big] = springStep(0, 0, 1, s.omega, s.slide, 5);
    expect(Number.isFinite(big)).toBe(true);
  });

  it('lands a flick at most three slides on', () => {
    expect(releaseTarget(2, 0, 10, true)).toBe(2);
    expect(releaseTarget(2, 100, 10, true)).toBe(5);
    expect(releaseTarget(2, -100, 10, true)).toBe(-1);
    expect(releaseTarget(0.2, -100, 10, false)).toBe(0);
    expect(releaseTarget(8.6, 100, 10, false)).toBe(9);
  });

  it('finds the nearest position showing a slide', () => {
    expect(targetFor(9, 0, 10, true)).toBe(-1);
    expect(targetFor(1, 9, 10, true)).toBe(11);
    expect(targetFor(7, 3, 5, false)).toBe(4);
  });

  it('poses discs along the climbing line', () => {
    const mid = poseOf(0, 0, pose);
    expect(mid).toMatchObject({
      x: 0,
      z: 0,
      yaw: 20,
      roll: 0,
      zIndex: 100,
      opacity: 1,
      hidden: false,
    });
    const ahead = poseOf(1, 1, pose);
    expect(ahead.y).toBe(-0.25);
    expect(ahead.z).toBeCloseTo(0.4);
    expect(poseOf(3, 5, pose).z).toBeCloseTo(0.88);
    expect(poseOf(-3, -3, pose).opacity).toBeCloseTo(1 - 0.5 / 1.2);
    expect(poseOf(-4.5, -9, pose)).toMatchObject({ opacity: 0, hidden: true });
    expect(poseOf(3, 3, pose).hidden).toBe(true);
  });

  it('picks print that reads against a label', () => {
    expect(inkFor('#ffffff')).toBe('#111111');
    expect(inkFor('#000')).toBe('#ffffff');
    expect(inkFor('#1b1d1f')).toBe('#ffffff');
    expect(inkFor('rebeccapurple')).toBe('#ffffff');
  });

  it('sizes label text to fit', () => {
    expect(fitSize(3, 200, 21)).toBe(21);
    expect(fitSize(30, 200, 21)).toBeCloseTo(200 / (30 * 0.56));
    expect(fitSize(1000, 10, 21)).toBe(6);
    expect(textWidth(10, 20)).toBeCloseTo(112);
    expect(textWidth(0, 20)).toBeCloseTo(11.2);
  });
});
