import '../../../test-setup';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WarpDialogComponent } from './warp-dialog';

@Component({
  imports: [WarpDialogComponent],
  template: `
    <button id="outside">outside</button>
    <app-warp-dialog [open]="open()" label="Test dialog" (dismissed)="dismissed = dismissed + 1">
      <button id="first">first</button>
      <button id="last">last</button>
    </app-warp-dialog>
  `,
})
class HostComponent {
  readonly open = signal(false);
  dismissed = 0;
}

describe('WarpDialogComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  const warp = () => el.querySelector('.warp');
  const panel = () => el.querySelector<HTMLElement>('.panel');
  const setOpen = (open: boolean) => {
    host.open.set(open);
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  it('renders nothing while closed', () => {
    expect(warp()).toBeNull();
  });

  it('opens as a modal dialog with the orbs, locking page scroll', () => {
    setOpen(true);
    expect(warp()).toBeTruthy();
    expect(el.querySelectorAll('.orb')).toHaveLength(3);
    expect(panel()?.getAttribute('role')).toBe('dialog');
    expect(panel()?.getAttribute('aria-modal')).toBe('true');
    expect(panel()?.getAttribute('aria-label')).toBe('Test dialog');
    expect(el.querySelector('#first')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('plays the exit before removing itself, then restores scroll', () => {
    document.body.style.overflow = 'scroll';
    setOpen(true);
    setOpen(false);
    expect(warp()?.classList.contains('closing')).toBe(true);
    vi.advanceTimersByTime(400);
    fixture.detectChanges();
    expect(warp()).toBeNull();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('reopens cleanly in the middle of closing', () => {
    setOpen(true);
    setOpen(false);
    setOpen(true);
    vi.advanceTimersByTime(400);
    fixture.detectChanges();
    expect(warp()).toBeTruthy();
    expect(warp()?.classList.contains('closing')).toBe(false);
  });

  it('closes at once with reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q) =>
        ({
          matches: true,
          media: q,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );
    setOpen(true);
    setOpen(false);
    expect(warp()).toBeNull();
  });

  it('asks to dismiss on Escape and on a click outside the content, not inside it', () => {
    setOpen(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.dismissed).toBe(1);
    (el.querySelector('.stage') as HTMLElement).click();
    expect(host.dismissed).toBe(2);
    (el.querySelector('#first') as HTMLElement).click();
    expect(host.dismissed).toBe(2);
  });

  it('dismisses from the close button', () => {
    setOpen(true);
    (el.querySelector('.warp-close') as HTMLButtonElement).click();
    expect(host.dismissed).toBe(1);
  });

  it('ignores Escape while closed or closing', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    setOpen(true);
    setOpen(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.dismissed).toBe(0);
  });

  it('focuses the dialog on open and returns focus on close', () => {
    const outside = el.querySelector<HTMLElement>('#outside') as HTMLElement;
    outside.focus();
    setOpen(true);
    vi.advanceTimersByTime(1);
    expect(document.activeElement).toBe(panel());
    setOpen(false);
    vi.advanceTimersByTime(400);
    expect(document.activeElement).toBe(outside);
  });

  describe('Tab trap', () => {
    const tab = (shiftKey = false) => {
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey,
        cancelable: true,
        bubbles: true,
      });
      panel()?.dispatchEvent(event);
      return event.defaultPrevented;
    };

    beforeEach(() => setOpen(true));

    it('wraps from the close button to the first control and back', () => {
      (el.querySelector('.warp-close') as HTMLElement).focus();
      expect(tab()).toBe(true);
      expect(document.activeElement?.id).toBe('first');
      expect(tab(true)).toBe(true);
      expect(document.activeElement?.classList.contains('warp-close')).toBe(true);
    });

    it('lets Tab move normally between controls, and ignores other keys', () => {
      (el.querySelector('#first') as HTMLElement).focus();
      expect(tab()).toBe(false);
      const other = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
      panel()?.dispatchEvent(other);
      expect(other.defaultPrevented).toBe(false);
    });

    it('keeps focus on the panel when it has no controls', () => {
      for (const b of Array.from(el.querySelectorAll('#first, #last, .warp-close'))) b.remove();
      expect(tab()).toBe(true);
      expect(document.activeElement).toBe(panel());
    });
  });

  it('releases the scroll lock if destroyed while open', () => {
    setOpen(true);
    fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });
});
