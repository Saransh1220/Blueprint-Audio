import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlameWrapEffectComponent } from './flame-wrap-effect.component';
import { createFlameWrap } from './flame-wrap';

vi.mock('./flame-wrap', () => ({ createFlameWrap: vi.fn() }));

describe('FlameWrapEffectComponent', () => {
  const instance = { setOptions: vi.fn(), destroy: vi.fn(), resize: vi.fn() };

  beforeEach(() => {
    vi.mocked(createFlameWrap).mockReset();
    vi.mocked(createFlameWrap).mockReturnValue(instance as any);
    instance.setOptions.mockClear();
    instance.destroy.mockClear();
  });

  it('creates the effect after view init and forwards options', () => {
    const fixture = TestBed.createComponent(FlameWrapEffectComponent);
    fixture.componentRef.setInput('height', 50);
    fixture.detectChanges();
    expect(createFlameWrap).toHaveBeenCalledTimes(1);
    const [els, opts] = vi.mocked(createFlameWrap).mock.calls[0];
    expect(els.output.tagName).toBe('CANVAS');
    expect(els.source.tagName).toBe('CANVAS');
    expect(els.content.tagName).toBe('DIV');
    expect(opts!.height).toBe(50);
    expect(opts!.color).toEqual([1, 0.24, 0.36]);
  });

  it('pushes option changes to the instance and destroys on teardown', () => {
    const fixture = TestBed.createComponent(FlameWrapEffectComponent);
    fixture.detectChanges();
    fixture.componentRef.setInput('ember', 3);
    fixture.detectChanges();
    expect(instance.setOptions).toHaveBeenCalledWith(expect.objectContaining({ ember: 3 }));
    fixture.destroy();
    expect(instance.destroy).toHaveBeenCalled();
  });

  it('survives createFlameWrap throwing', () => {
    vi.mocked(createFlameWrap).mockImplementation(() => {
      throw new Error('no webgl');
    });
    const fixture = TestBed.createComponent(FlameWrapEffectComponent);
    expect(() => fixture.detectChanges()).not.toThrow();
    fixture.componentInstance.ngOnChanges({});
    expect(instance.setOptions).not.toHaveBeenCalled();
    fixture.destroy();
    expect(instance.destroy).not.toHaveBeenCalled();
  });

  it('computes reach values with minimums', () => {
    const c = TestBed.createComponent(FlameWrapEffectComponent).componentInstance;
    expect(c.reach).toBe(Math.round(90 * 1.5) + 40);
    expect(c.glowReach).toBe(46);
    c.height = 1;
    c.spread = 1;
    expect(c.reach).toBe(76);
    expect(c.glowReach).toBe(40);
  });

  it('does nothing on the server', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const fixture = TestBed.createComponent(FlameWrapEffectComponent);
    fixture.detectChanges();
    expect(createFlameWrap).not.toHaveBeenCalled();
  });
});
