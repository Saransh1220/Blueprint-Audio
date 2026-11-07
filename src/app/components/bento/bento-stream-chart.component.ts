import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { bandPath, streamLayers } from '../../utils/bento-chart';
import { BentoTooltipComponent } from './bento-tooltip.component';

export interface BentoSeries {
  label: string;
  color: string;
  values: number[];
}

const W = 800;
const H = 300;

/**
 * Stream graph: series are stacked symmetrically around a centre line, smoothed with
 * Catmull-Rom curves, and grow outwards from the centre when the data or `animateKey` changes.
 * Hovering shows a guideline and a pointer-following tooltip with each series' value.
 */
@Component({
  selector: 'app-bento-stream-chart',
  imports: [BentoTooltipComponent],
  template: `
    @if (hasData()) {
      <div class="legend">
        @for (s of series(); track s.label) {
          <span><i [style.background]="s.color"></i>{{ s.label }}</span>
        }
      </div>
      <div class="wrap" (pointermove)="onMove($event)" (pointerleave)="hover.set(null)">
        <svg
          [attr.viewBox]="'0 0 ' + w + ' ' + h"
          preserveAspectRatio="none"
          role="img"
          [attr.aria-label]="ariaLabel()"
        >
          <line class="mid" x1="0" [attr.y1]="h / 2" [attr.x2]="w" [attr.y2]="h / 2" />
          <g class="layers" [class.alt]="phase() === 1">
            @for (l of layers(); track l.label) {
              <path [attr.d]="l.d" [attr.fill]="l.color" />
            }
          </g>
          @if (hoverX(); as x) {
            <line class="guide" [attr.x1]="x" y1="0" [attr.x2]="x" [attr.y2]="h" />
          }
        </svg>
        @if (hover(); as hv) {
          <app-bento-tooltip [x]="hv.x" [y]="hv.y">
            <span class="tt-label">{{ labels()[hv.index] }}</span>
            @for (s of series(); track s.label) {
              <span class="tt-row">
                <i [style.background]="s.color"></i>{{ s.label }}
                <strong>{{ format()(s.values[hv.index] || 0) }}</strong>
              </span>
            }
          </app-bento-tooltip>
        }
      </div>
      <div class="axis" aria-hidden="true">
        @for (a of axis(); track $index) {
          <span>{{ a }}</span>
        }
      </div>
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
    .legend {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.78);
      font-size: 12px;
    }
    .legend span,
    .tt-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .legend i,
    .tt-row i {
      width: 8px;
      height: 8px;
      border-radius: 2px;
    }
    .wrap {
      position: relative;
      flex: 1;
      min-height: 160px;
      touch-action: pan-y;
    }
    svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .mid {
      stroke: rgba(255, 255, 255, 0.22);
      stroke-dasharray: 2 5;
      vector-effect: non-scaling-stroke;
    }
    .guide {
      stroke: rgba(255, 255, 255, 0.55);
      stroke-width: 1;
      vector-effect: non-scaling-stroke;
    }
    .layers {
      transform-box: view-box;
      transform-origin: 50% 50%;
      animation: stream-grow-a 1.1s cubic-bezier(0.215, 0.61, 0.355, 1) both;
    }
    .layers.alt {
      animation-name: stream-grow-b;
    }
    .layers path {
      fill-opacity: 0.88;
    }
    .axis {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      color: rgba(255, 255, 255, 0.55);
      font: 400 11px var(--bento-mono, monospace);
    }
    .empty {
      margin: auto;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      text-align: center;
    }
    .tt-label {
      display: block;
      margin-bottom: 4px;
      color: rgba(255, 255, 255, 0.55);
      font-size: 11px;
    }
    .tt-row {
      display: flex;
      gap: 6px;
      padding: 1px 0;
    }
    .tt-row strong {
      margin-left: auto;
      padding-left: 14px;
      font-weight: 500;
    }
    @keyframes stream-grow-a {
      from {
        transform: scaleY(0);
        opacity: 0;
      }
      to {
        transform: none;
        opacity: 1;
      }
    }
    @keyframes stream-grow-b {
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
      .layers {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoStreamChartComponent {
  protected readonly w = W;
  protected readonly h = H;

  readonly series = input.required<BentoSeries[]>();
  readonly labels = input<string[]>([]);
  readonly format = input<(value: number) => string>((v) => String(v));
  readonly ariaLabel = input('Trend over time');
  readonly animateKey = input('');
  readonly empty = input('No data in this period yet.');

  /** Flips on every `animateKey` change so the CSS entrance animation restarts. */
  protected readonly phase = linkedSignal<string, number>({
    source: this.animateKey,
    computation: (_, previous) => ((previous?.value ?? 0) + 1) % 2,
  });

  protected readonly hover = signal<{ index: number; x: number; y: number } | null>(null);

  protected readonly hasData = computed(() =>
    this.series().some((s) => s.values.some((v) => v > 0)),
  );

  private readonly geometry = computed(() =>
    streamLayers(
      this.series().map((s) => s.values),
      W,
      H,
    ),
  );

  protected readonly layers = computed(() =>
    this.geometry().map((layer, i) => ({
      label: this.series()[i].label,
      color: this.series()[i].color,
      d: bandPath(layer.top, layer.bottom),
    })),
  );

  protected readonly hoverX = computed(() => {
    const hv = this.hover();
    return hv ? (this.geometry()[0]?.top[hv.index]?.x ?? null) : null;
  });

  protected readonly axis = computed(() => {
    const l = this.labels();
    return l.length > 1 ? [l[0], l[Math.floor(l.length / 2)], l[l.length - 1]] : [];
  });

  protected onMove(event: PointerEvent) {
    const n = Math.max(0, ...this.series().map((s) => s.values.length));
    if (!n) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const index = Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    this.hover.set({ index, x: event.clientX, y: event.clientY });
  }
}
