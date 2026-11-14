import { Directive, ElementRef, inject, OnDestroy, output } from '@angular/core';

@Directive({
  selector: '[appHoverPopup]',
  host: {
    '(pointerenter)': 'enter($event)',
    '(pointerleave)': 'leave($event)',
  },
})
export class HoverPopupDirective implements OnDestroy {
  readonly hoverPopupChange = output<boolean>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private closeTimer?: ReturnType<typeof setTimeout>;

  enter(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(this.closeTimer);
    this.hoverPopupChange.emit(true);
  }

  leave(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(this.closeTimer);
    // Give the pointer time to cross the gap or move diagonally into the panel.
    this.closeTimer = setTimeout(() => {
      if (!this.host.nativeElement.querySelector(':focus-visible')) {
        this.hoverPopupChange.emit(false);
      }
    }, 160);
  }

  ngOnDestroy() {
    clearTimeout(this.closeTimer);
  }
}

export function isKeyboardOrTouchActivation(event?: MouseEvent): boolean {
  return !event || event.detail === 0 || ('pointerType' in event && event.pointerType !== 'mouse');
}
