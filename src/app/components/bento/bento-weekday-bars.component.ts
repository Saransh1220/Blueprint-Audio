import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { WEEKDAYS } from '../../utils/bento-chart';
import { BentoTooltipComponent } from './bento-tooltip.component';

/** Capsule bars, one per weekday; the highlighted day is drawn in the accent colour. */
@Component({
  selector: 'app-bento-weekday-bars',
  imports: [BentoTooltipComponent],
  template: `
    @if (hasData()) {
      <div class="bars" role="img" [attr.aria-label]="summary()">
        @for (b of bars(); track b.label) {
          <div
            class="col"
            (pointermove)="hover.set({ i: b.i, x: $event.clientX, y: $event.clientY })"
            (pointerleave)="hover.set(null)"
          >
            <span class="track">
              <span
                class="fill"
                [class.hi]="b.i === highlight()"
                [style.height.%]="b.pct"
                [style.animation-delay.ms]="b.i * 50"
              ></span>
            </span>
            <span class="lab">{{ b.label }}</span>
          </div>
        }
      </div>
      @if (hover(); as hv) {
        <app-bento-tooltip [x]="hv.x" [y]="hv.y">
          <span class="tt-label">{{ bars()[hv.i].label }}</span>
          <strong class="tt-value">{{ format()(values()[hv.i]) }} {{ unit() }}</strong>
        </app-bento-tooltip>
      }
    } @else {
      <p class="empty" role="status">{{ empty() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }
    .bars {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      flex: 1;
      gap: 8px;
      min-height: 150px;
    }
    .col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
    }
    .track {
      display: flex;
      flex: 1;
      align-items: flex-end;
      width: 100%;
      max-width: 30px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }
    .fill {
      width: 100%;
      min-height: 6px;
      border-radius: 999px;
      background: #fff;
      transform-origin: bottom;
      animation: rise 0.8s cubic-bezier(0.215, 0.61, 0.355, 1) both;
    }
    .fill.hi {
      background: var(--bento-accent, #e8ff1f);
    }
    .lab {
      color: rgba(255, 255, 255, 0.7);
      font: 400 10.5px var(--bento-mono, monospace);
    }
    .empty {
      margin: auto;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      text-align: center;
    }
    .tt-label {
      display: block;
      color: rgba(255, 255, 255, 0.55);
      font-size: 11px;
    }
    .tt-value {
      font-size: 15px;
      font-weight: 500;
    }
    @keyframes rise {
      from {
        transform: scaleY(0);
      }
      to {
        transform: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .fill {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoWeekdayBarsComponent {
  readonly values = input.required<number[]>();
  readonly highlight = input(-1);
  readonly format = input<(value: number) => string>((v) => String(v));
  readonly unit = input('');
  readonly empty = input('No activity in this period yet.');

  protected readonly hover = signal<{ i: number; x: number; y: number } | null>(null);

  protected readonly hasData = computed(() => this.values().some((v) => v > 0));

  protected readonly bars = computed(() => {
    const values = this.values();
    const max = Math.max(...values, 0) || 1;
    return WEEKDAYS.map((label, i) => ({
      i,
      label,
      pct: ((values[i] ?? 0) / max) * 100,
    }));
  });

  protected readonly summary = computed(() =>
    this.bars()
      .map((b) => `${b.label} ${this.format()(this.values()[b.i] ?? 0)}`)
      .join(', '),
  );
}
