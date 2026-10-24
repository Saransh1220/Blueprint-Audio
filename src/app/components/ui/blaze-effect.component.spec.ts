import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BlazeEffectComponent } from './blaze-effect.component';
import { createBlaze } from './blaze';

vi.mock('./blaze', () => ({ createBlaze: vi.fn() }));

describe('BlazeEffectComponent', () => {
  const instance = { setOptions: vi.fn(), destroy: vi.fn(), resize: vi.fn() };

  beforeEach(() => {
    vi.mocked(createBlaze).mockReset();
    vi.mocked(createBlaze).mockReturnValue(instance as any);
    instance.setOptions.mockClear();
    instance.destroy.mockClear();
  });

  it('creates the effect after view init and forwards options', () => {
    const fixture = TestBed.createComponent(BlazeEffectComponent);
    fixture.componentRef.setInput('height', 0.5);
    fixture.detectChanges();
    expect(createBlaze).toHaveBeenCalledTimes(1);
    const [els, opts] = vi.mocked(createBlaze).mock.calls[0];
    expect(els.output.tagName).toBe('CANVAS');
    expect(els.source.tagName).toBe('CANVAS');
    expect(els.content.tagName).toBe('DIV');
    expect(opts!.height).toBe(0.5);
    expect(opts!.sparkColor).toEqual([1, 0.4, 0.05]);
  });

  it('pushes option changes to the instance and destroys on teardown', () => {
    const fixture = TestBed.createComponent(BlazeEffectComponent);
    fixture.detectChanges();
    fixture.componentRef.setInput('glow', 3);
    fixture.detectChanges();
    expect(instance.setOptions).toHaveBeenCalledWith(expect.objectContaining({ glow: 3 }));
    fixture.destroy();
    expect(instance.destroy).toHaveBeenCalled();
  });

  it('survives createBlaze throwing', () => {
    vi.mocked(createBlaze).mockImplementation(() => {
      throw new Error('no webgl');
    });
    const fixture = TestBed.createComponent(BlazeEffectComponent);
    expect(() => fixture.detectChanges()).not.toThrow();
    fixture.componentInstance.ngOnChanges({});
    expect(instance.setOptions).not.toHaveBeenCalled();
    fixture.destroy();
    expect(instance.destroy).not.toHaveBeenCalled();
  });

  it('does nothing on the server', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const fixture = TestBed.createComponent(BlazeEffectComponent);
    fixture.detectChanges();
    expect(createBlaze).not.toHaveBeenCalled();
  });
});
