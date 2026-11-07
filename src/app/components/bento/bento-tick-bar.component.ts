import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Progress bar drawn as a row of tick marks (used for shares and goals). */
@Component({
  selector: 'app-bento-tick-bar',
  template: `
    <svg viewBox="0 0 120 10" preserveAspectRatio="none" role="img" [attr.aria-label]="summary()">
      @for (tick of ticks(); track tick.i) {
        <line [attr.x1]="tick.x" y1="1" [attr.x2]="tick.x" y2="9" [class.on]="tick.on" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      height: 10px;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    line {
      stroke: currentColor;
      stroke-width: 1.4;
      stroke-linecap: round;
      opacity: 0.22;
    }
    line.on {
      opacity: 1;
      stroke: var(--bento-tick, currentColor);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoTickBarComponent {
  /** 0 to 100. */
  readonly percent = input(0);
  readonly count = input(30);
  readonly label = input('Share');

  readonly summary = computed(() => `${this.label()}: ${Math.round(this.clamped())}%`);
  private readonly clamped = computed(() => Math.min(100, Math.max(0, this.percent())));

  readonly ticks = computed(() => {
    const n = this.count();
    const filled = Math.round((this.clamped() / 100) * n);
    return Array.from({ length: n }, (_, i) => ({
      i,
      x: n > 1 ? 1 + (i / (n - 1)) * 118 : 60,
      on: i < filled,
    }));
  });
}
