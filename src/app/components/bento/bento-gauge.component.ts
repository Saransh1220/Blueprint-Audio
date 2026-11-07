import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { tickOwners } from '../../utils/bento-chart';

export interface BentoShare {
  label: string;
  /** Share of the total, 0 to 100. */
  share: number;
  /** Already-formatted amount (money goes through CurrencyService before it gets here). */
  amount: string;
  color: string;
}

const TICKS = 56;
const CX = 120;
const CY = 118;
const R_IN = 78;
const R_OUT = 98;

/**
 * Allocation gauge: 56 tick marks over a half circle coloured by share, the leading share's
 * percentage in the middle and a legend underneath.
 */
@Component({
  selector: 'app-bento-gauge',
  template: `
    @if (shares().length) {
      <svg viewBox="0 0 240 130" role="img" [attr.aria-label]="summary()">
        @for (t of ticks(); track t.i) {
          <line
            [attr.x1]="t.x1"
            [attr.y1]="t.y1"
            [attr.x2]="t.x2"
            [attr.y2]="t.y2"
            [attr.stroke]="t.color"
            [style.animation-delay.ms]="t.i * 8"
          />
        }
        <text class="pct" [attr.x]="cx" y="104" text-anchor="middle">{{ lead() }}%</text>
        <text class="cap" [attr.x]="cx" y="124" text-anchor="middle">{{ caption() }}</text>
      </svg>
      <ul>
        @for (s of shares(); track s.label) {
          <li>
            <i [style.background]="s.color"></i>
            <span class="name">{{ s.label }}</span>
            <span class="amt">{{ s.amount }}</span>
            <strong>{{ s.share }}%</strong>
          </li>
        }
      </ul>
    } @else {
      <p class="empty" role="status">{{ empty() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
    }
    svg {
      display: block;
      width: 100%;
      max-height: 170px;
    }
    line {
      stroke-width: 3;
      stroke-linecap: round;
      animation: tick-in 0.5s ease-out both;
    }
    .pct {
      fill: #fff;
      font: 200 38px var(--bento-font, sans-serif);
      letter-spacing: -0.03em;
    }
    .cap {
      fill: rgba(255, 255, 255, 0.6);
      font: 500 9.5px var(--bento-mono, monospace);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    ul {
      display: grid;
      gap: 7px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 12.5px;
    }
    li {
      display: grid;
      grid-template-columns: 8px minmax(0, 1fr) auto 38px;
      align-items: center;
      gap: 8px;
    }
    li i {
      width: 8px;
      height: 8px;
      border-radius: 2px;
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-transform: capitalize;
    }
    .amt {
      color: rgba(255, 255, 255, 0.6);
      font: 400 11.5px var(--bento-mono, monospace);
    }
    strong {
      text-align: right;
      font: 500 12px var(--bento-mono, monospace);
    }
    .empty {
      margin: auto;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      text-align: center;
    }
    @keyframes tick-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      line {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoGaugeComponent {
  protected readonly cx = CX;

  readonly shares = input<BentoShare[]>([]);
  readonly caption = input('Top share');
  readonly empty = input('Nothing to show yet.');

  protected readonly lead = computed(() => this.shares()[0]?.share ?? 0);

  protected readonly summary = computed(() => {
    const parts = this.shares().map((s) => `${s.label} ${s.share}%`);
    return `${this.caption()}: ${parts.join(', ')}`;
  });

  protected readonly ticks = computed(() => {
    const shares = this.shares();
    const owners = tickOwners(
      shares.map((s) => s.share),
      TICKS,
    );
    return Array.from({ length: TICKS }, (_, i) => {
      const angle = Math.PI - (i / (TICKS - 1)) * Math.PI;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const owner = owners[i];
      return {
        i,
        x1: +(CX + cos * R_IN).toFixed(2),
        y1: +(CY - sin * R_IN).toFixed(2),
        x2: +(CX + cos * R_OUT).toFixed(2),
        y2: +(CY - sin * R_OUT).toFixed(2),
        color: owner === undefined ? 'rgba(255,255,255,0.18)' : shares[owner].color,
      };
    });
  });
}
