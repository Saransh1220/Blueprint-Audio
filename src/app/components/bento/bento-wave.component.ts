import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { areaPath, linePoints, smoothPath } from '../../utils/bento-chart';
import { BentoTooltipComponent } from './bento-tooltip.component';

const W = 400;
const H = 140;

/**
 * Single-series smooth wave (area + line). `compact` drops axes, hover and tooltip so it can be
 * used as a sparkline inside tiles. Values arrive in display order; `format` renders one value.
 */
@Component({
  selector: 'app-bento-wave',
  imports: [BentoTooltipComponent],
  template: `
    <div class="wrap" (pointermove)="onMove($event)" (pointerleave)="hover.set(null)">
      <svg
        [attr.viewBox]="'0 0 ' + w + ' ' + h"
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="ariaLabel()"
      >
        @if (!compact()) {
          <line class="base" x1="0" [attr.y1]="h - 1" [attr.x2]="w" [attr.y2]="h - 1" />
        }
        @if (area()) {
          <g class="draw" [class.alt]="phase() === 1">
            <defs>
              <linearGradient [attr.id]="gid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="currentColor" stop-opacity="0.38" />
                <stop offset="1" stop-color="currentColor" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path [attr.d]="area()" [attr.fill]="'url(#' + gid + ')'" />
            <path class="line" [attr.d]="line()" />
          </g>
        }
        @if (hoverPoint(); as p) {
          <line class="guide" [attr.x1]="p.x" y1="0" [attr.x2]="p.x" [attr.y2]="h" />
        }
      </svg>
      @if (hoverPoint(); as p) {
        <span class="dot" [style.left.%]="(p.x / w) * 100" [style.top.%]="(p.y / h) * 100"></span>
      }
      @if (hover(); as hv) {
        <app-bento-tooltip [x]="hv.x" [y]="hv.y">
          <span class="tt-label">{{ labels()[hv.index] }}</span>
          <strong class="tt-value">{{ format()(values()[hv.index]) }}</strong>
        </app-bento-tooltip>
      }
    </div>
    @if (!compact() && axis().length) {
      <div class="axis" aria-hidden="true">
        @for (a of axis(); track $index) {
          <span>{{ a }}</span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      color: var(--bento-wave, #fff);
    }
    .wrap {
      position: relative;
      height: var(--wave-h, 100%);
      min-height: 40px;
      touch-action: pan-y;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .line {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
      stroke-linejoin: round;
    }
    .base {
      stroke: rgba(255, 255, 255, 0.14);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }
    .guide {
      stroke: rgba(255, 255, 255, 0.4);
      stroke-width: 1;
      stroke-dasharray: 3 3;
      vector-effect: non-scaling-stroke;
    }
    .dot {
      position: absolute;
      width: 10px;
      height: 10px;
      margin: -5px 0 0 -5px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.5);
      pointer-events: none;
    }
    .draw {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      animation: wave-grow-a 1.1s cubic-bezier(0.215, 0.61, 0.355, 1) both;
    }
    .draw.alt {
      animation-name: wave-grow-b;
    }
    .axis {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      color: var(--bento-faint, rgba(255, 255, 255, 0.4));
      font: 400 11px var(--bento-mono, monospace);
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
    @keyframes wave-grow-a {
      from {
        transform: scaleY(0);
        opacity: 0;
      }
      to {
        transform: none;
        opacity: 1;
      }
    }
    @keyframes wave-grow-b {
      from {
        transform: scaleY(0);
        opacity: 0;
      }
      to {
        transform: none;
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .draw {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoWaveComponent {
  private static uid = 0;
  protected readonly gid = `bento-wave-${BentoWaveComponent.uid++}`;
  protected readonly w = W;
  protected readonly h = H;

  readonly values = input.required<number[]>();
  readonly labels = input<string[]>([]);
  readonly format = input<(value: number) => string>((v) => String(v));
  readonly compact = input(false);
  readonly ariaLabel = input('Trend');
  /** Changing this replays the grow animation (for example when the period changes). */
  readonly animateKey = input('');

  /** Flips on every `animateKey` change so the CSS entrance animation restarts. */
  protected readonly phase = linkedSignal<string, number>({
    source: this.animateKey,
    computation: (_, previous) => ((previous?.value ?? 0) + 1) % 2,
  });

  protected readonly hover = signal<{ index: number; x: number; y: number } | null>(null);

  private readonly points = computed(() =>
    linePoints(this.values(), W, H - 6, { pad: 0 }).map((p) => ({ x: p.x, y: p.y + 3 })),
  );
  protected readonly line = computed(() => smoothPath(this.points()));
  protected readonly area = computed(() => areaPath(this.points(), H));
  protected readonly hoverPoint = computed(() => {
    const hv = this.hover();
    return hv ? this.points()[hv.index] : null;
  });
  protected readonly axis = computed(() => {
    const l = this.labels();
    return l.length > 1 ? [l[0], l[Math.floor(l.length / 2)], l[l.length - 1]] : [];
  });

  protected onMove(event: PointerEvent) {
    const n = this.values().length;
    if (this.compact() || !n) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const index = Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    this.hover.set({ index, x: event.clientX, y: event.clientY });
  }
}
