import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Dark glass popover that follows the pointer (viewport coordinates, `position: fixed`). */
@Component({
  selector: 'app-bento-tooltip',
  template: `<ng-content />`,
  styles: `
    :host {
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      min-width: 120px;
      padding: 9px 12px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 14px;
      background: rgba(12, 12, 14, 0.94);
      color: #fff;
      font: 400 12px var(--bento-font, system-ui);
      pointer-events: none;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.transform]': '"translate(" + left() + "px," + top() + "px)"',
    role: 'tooltip',
  },
})
export class BentoTooltipComponent {
  readonly x = input(0);
  readonly y = input(0);

  /** Keeps the popover inside the viewport, preferring the right/below of the pointer. */
  protected left() {
    const room = typeof window === 'undefined' ? 1024 : window.innerWidth;
    const x = this.x() + 16;
    return x + 200 > room ? Math.max(8, this.x() - 216) : x;
  }

  protected top() {
    return Math.max(8, this.y() - 18);
  }
}
