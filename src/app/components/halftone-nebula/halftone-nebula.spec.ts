import '../../../test-setup';
import { TestBed } from '@angular/core/testing';

import {
  HalftoneNebulaComponent,
  MAX_SPARKS,
  driftPos,
  hexToRgb,
  layoutSparkles,
  mulberry32,
  pushSparkle,
} from './halftone-nebula';

describe('halftone nebula helpers', () => {
  it('hangs the same sky for the same seed', () => {
    expect(layoutSparkles(11, 9)).toEqual(layoutSparkles(11, 9));
    expect(layoutSparkles(11, 9)).not.toEqual(layoutSparkles(12, 9));
    expect(mulberry32(3)()).toBe(mulberry32(3)());
  });

  it('caps sparkles and makes the first one the hero', () => {
    const sky = layoutSparkles(11, 99);
    expect(sky).toHaveLength(MAX_SPARKS);
    expect(sky[0].reach).toBeGreaterThan(sky[2].reach);
  });

  it('evicts the oldest user sparkle but never the seeded sky', () => {
    const seeded = layoutSparkles(1, 2);
    const mine = (x: number) => ({ ...seeded[0], x, user: true });
    let list = [...seeded, mine(0.1), mine(0.2)];
    list = pushSparkle(list, mine(0.3), 4);
    expect(list.map((s) => s.x).slice(2)).toEqual([0.2, 0.3]);
    expect(pushSparkle(seeded, mine(0.9), 2)).toEqual(seeded);
  });

  it('parses hex colours and treats junk as black', () => {
    expect(hexToRgb('#f00')).toEqual([1, 0, 0]);
    expect(hexToRgb('#00ff00')).toEqual([0, 1, 0]);
    expect(hexToRgb('nope')).toEqual([0, 0, 0]);
  });

  it('keeps the idle lamp inside the sky', () => {
    for (let t = 0; t < 300; t += 7) {
      const [x, y] = driftPos(t);
      expect(x).toBeGreaterThanOrEqual(0.05);
      expect(x).toBeLessThanOrEqual(0.95);
      expect(y).toBeGreaterThanOrEqual(0.05);
      expect(y).toBeLessThanOrEqual(0.95);
    }
  });
});

describe('HalftoneNebulaComponent', () => {
  it('falls back to a still sky when WebGL2 is unavailable', async () => {
    await TestBed.configureTestingModule({
      imports: [HalftoneNebulaComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(HalftoneNebulaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.failed()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.fallback')).toBeTruthy();
  });
});
