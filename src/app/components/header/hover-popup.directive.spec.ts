import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { HoverPopupDirective, isKeyboardOrTouchActivation } from './hover-popup.directive';

@Component({
  imports: [HoverPopupDirective],
  template:
    '<div appHoverPopup (hoverPopupChange)="changes.push($event)"><button>Menu</button></div>',
})
class HoverPopupHost {
  readonly changes: boolean[] = [];
}

describe('HoverPopupDirective', () => {
  let fixture: ComponentFixture<HoverPopupHost>;
  let popup: HTMLElement;
  const pointer = (type: string, pointerType = 'mouse') =>
    popup.dispatchEvent(new PointerEvent(type, { pointerType }));
  const changes = () => fixture.componentInstance.changes;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fixture = TestBed.createComponent(HoverPopupHost);
    fixture.detectChanges();
    popup = fixture.nativeElement.querySelector('div');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays closing and cancels the pending close if the mouse returns', () => {
    pointer('pointerenter');
    pointer('pointerleave');
    vi.advanceTimersByTime(159);
    expect(changes()).toEqual([true]);
    pointer('pointerenter');
    vi.advanceTimersByTime(160);
    expect(changes()).toEqual([true, true]);

    pointer('pointerleave');
    vi.advanceTimersByTime(160);
    expect(changes()).toEqual([true, true, false]);
  });

  it('ignores touch and pen hover', () => {
    pointer('pointerenter', 'touch');
    pointer('pointerleave', 'pen');
    vi.runAllTimers();
    expect(changes()).toEqual([]);
  });

  it('keeps the popup open while a keyboard-focused control is inside', () => {
    popup.querySelector('button')!.focus();
    expect(popup.querySelector(':focus-visible')).toBeTruthy();
    pointer('pointerenter');
    pointer('pointerleave');
    vi.advanceTimersByTime(160);
    expect(changes()).toEqual([true]);
  });

  it('clears the close timer when the host is destroyed', () => {
    const schedule = vi.spyOn(globalThis, 'setTimeout');
    const cancel = vi.spyOn(globalThis, 'clearTimeout');
    pointer('pointerenter');
    pointer('pointerleave');
    const timerIndex = schedule.mock.calls.findIndex(([, delay]) => delay === 160);
    expect(timerIndex).toBeGreaterThanOrEqual(0);
    const timer = schedule.mock.results[timerIndex].value;
    cancel.mockClear();
    fixture.destroy();
    expect(cancel).toHaveBeenCalledWith(timer);
    schedule.mockRestore();
    cancel.mockRestore();
  });
});

describe('isKeyboardOrTouchActivation', () => {
  it('accepts keyboard, touch and pen clicks while leaving the mouse to hover', () => {
    expect(isKeyboardOrTouchActivation(new MouseEvent('click', { detail: 0 }))).toBe(true);
    expect(isKeyboardOrTouchActivation(new MouseEvent('click', { detail: 1 }))).toBe(false);
    for (const pointerType of ['mouse', 'touch', 'pen']) {
      const event = new PointerEvent('click', { pointerType, detail: 1 });
      expect(isKeyboardOrTouchActivation(event)).toBe(pointerType !== 'mouse');
    }
  });
});
