import '../../../test-setup';
import { NgZone } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { HairlineBasketComponent } from './hairline-basket';

const calls = vi.hoisted(() => ({
  created: [] as { el: HTMLElement; options: Record<string, unknown>; inZone: boolean }[],
  update: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock('@lucasmarkes/hairline', async () => {
  const { NgZone: Zone } = await import('@angular/core');
  return {
    basket: (el: HTMLElement, options: Record<string, unknown>) => {
      calls.created.push({ el, options, inZone: Zone.isInAngularZone() });
      return { update: calls.update, destroy: calls.destroy };
    },
  };
});

describe('HairlineBasketComponent', () => {
  let fixture: ComponentFixture<HairlineBasketComponent>;

  beforeEach(() => {
    calls.created.length = 0;
    calls.update.mockClear();
    calls.destroy.mockClear();
    fixture = TestBed.createComponent(HairlineBasketComponent);
  });

  // Mounting waits for the view, then for the library to load as its own chunk.
  const mount = async () => {
    fixture.detectChanges();
    await vi.waitFor(() => expect(calls.created).toHaveLength(1));
  };

  it('mounts one figure into its own element with the dark theme and sensible defaults', async () => {
    await mount();
    expect(calls.created).toHaveLength(1);
    expect(calls.created[0].el).toBe(fixture.nativeElement.querySelector('.figure'));
    expect(calls.created[0].options).toEqual({
      label: 'An empty wire basket',
      intensity: 0.5,
      play: false,
      theme: 'dark',
    });
  });

  it('mounts outside Angular, so the pointer never triggers change detection', async () => {
    expect(NgZone.isInAngularZone()).toBe(false);
    await mount();
    expect(calls.created[0].inZone).toBe(false);
  });

  it('passes input changes on to the running figure', async () => {
    await mount();
    fixture.componentRef.setInput('intensity', 0.9);
    fixture.componentRef.setInput('label', 'Nothing yet');
    fixture.componentRef.setInput('play', true);
    fixture.detectChanges();
    await vi.waitFor(() => expect(calls.update).toHaveBeenCalled());

    expect(calls.created).toHaveLength(1);
    expect(calls.update).toHaveBeenLastCalledWith({
      label: 'Nothing yet',
      intensity: 0.9,
      play: true,
      theme: 'dark',
    });
  });

  it('removes the figure when destroyed, and only once', async () => {
    await mount();
    fixture.destroy();
    expect(calls.destroy).toHaveBeenCalledTimes(1);
  });

  it('is safe to destroy before the figure was ever mounted', () => {
    fixture.destroy();
    expect(calls.destroy).not.toHaveBeenCalled();
  });

  it('draws nothing if it is destroyed while the library is still loading', async () => {
    fixture.detectChanges();
    fixture.destroy();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls.created).toHaveLength(0);
    expect(calls.destroy).not.toHaveBeenCalled();
  });
});
