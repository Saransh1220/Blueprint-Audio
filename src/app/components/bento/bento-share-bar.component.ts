import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { tickOwners } from '../../utils/bento-chart';

export interface BentoShareSegment {
  label: string;
  /** Share of the total, 0 to 100. */
  share: number;
  color: string;
}

/** One row of tick marks coloured by share, with a caption per segment underneath. */
@Component({
  selector: 'app-bento-share-bar',
  template: `
    @if (segments().length) {
      <svg viewBox="0 0 240 12" preserveAspectRatio="none" role="img" [attr.aria-label]="summary()">
        @for (t of ticks(); track t.i) {
          <line [attr.x1]="t.x" y1="1" [attr.x2]="t.x" y2="11" [attr.stroke]="t.color" />
        }
      </svg>
      <ul>
        @for (s of segments(); track s.label) {
          <li><i [style.background]="s.color"></i>{{ s.label }} {{ s.share }}%</li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: 12px;
    }
    line {
      stroke-width: 2;
      stroke-linecap: round;
    }
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 14px;
      margin: 8px 0 0;
      padding: 0;
      list-style: none;
      color: rgba(255, 255, 255, 0.7);
      font: 400 11px var(--bento-mono, monospace);
    }
    li {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    i {
      width: 7px;
      height: 7px;
      border-radius: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoShareBarComponent {
  readonly segments = input<BentoShareSegment[]>([]);
  readonly count = input(48);

  protected readonly summary = computed(() =>
    this.segments()
      .map((s) => `${s.label} ${s.share}%`)
      .join(', '),
  );

  protected readonly ticks = computed(() => {
    const segments = this.segments();
    const n = this.count();
    const owners = tickOwners(
      segments.map((s) => s.share),
      n,
    );
    return Array.from({ length: n }, (_, i) => ({
      i,
      x: 1 + (i / (n - 1)) * 238,
      color: owners[i] === undefined ? 'rgba(255,255,255,0.18)' : segments[owners[i]].color,
    }));
  });
}
