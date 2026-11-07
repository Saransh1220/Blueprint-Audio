import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BentoTickBarComponent } from './bento-tick-bar.component';

export interface BentoRankRow {
  id: string;
  title: string;
  /** Already-formatted main figure (plays, money via CurrencyService, ...). */
  value: string;
  /** Smaller line under the title. */
  meta?: string;
  /** 0 to 100, drives the tick bar. */
  percent: number;
  imageUrl?: string | null;
  link?: string | unknown[] | null;
}

/** Ranked rows with a cover (or letter), a tick bar for relative size and a trailing figure. */
@Component({
  selector: 'app-bento-rank-list',
  imports: [BentoTickBarComponent, RouterLink],
  template: `
    @if (rows().length) {
      <ol>
        @for (r of rows(); track r.id; let i = $index) {
          <li>
            <span class="rank">{{ i + 1 }}</span>
            <span class="cover">
              @if (r.imageUrl) {
                <img [src]="r.imageUrl" [alt]="r.title" loading="lazy" />
              } @else {
                <span class="letter" aria-hidden="true">{{ r.title.charAt(0) }}</span>
              }
            </span>
            <span class="info">
              @if (r.link) {
                <a [routerLink]="r.link">{{ r.title }}</a>
              } @else {
                <strong>{{ r.title }}</strong>
              }
              <app-bento-tick-bar [percent]="r.percent" [count]="26" [label]="r.title + ' share'" />
              @if (r.meta) {
                <small>{{ r.meta }}</small>
              }
            </span>
            <span class="val">{{ r.value }}</span>
          </li>
        }
      </ol>
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
    ol {
      display: grid;
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: 16px 38px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
    }
    .rank {
      color: rgba(255, 255, 255, 0.45);
      font: 400 11px var(--bento-mono, monospace);
    }
    .cover {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      overflow: hidden;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
    }
    .cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .letter {
      font-weight: 500;
      text-transform: uppercase;
    }
    .info {
      display: grid;
      gap: 5px;
      min-width: 0;
      --bento-tick: var(--bento-s2, #a9b2ff);
      color: rgba(255, 255, 255, 0.9);
    }
    .info a,
    .info strong {
      overflow: hidden;
      color: #fff;
      font-size: 13.5px;
      font-weight: 500;
      text-decoration: none;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .info a:hover {
      text-decoration: underline;
    }
    .info a:focus-visible {
      outline: 2px solid var(--bento-accent, #e8ff1f);
      outline-offset: 2px;
      border-radius: 4px;
    }
    small {
      color: rgba(255, 255, 255, 0.5);
      font-size: 11.5px;
    }
    .val {
      font: 400 13px var(--bento-mono, monospace);
      font-variant-numeric: tabular-nums;
    }
    .empty {
      margin: auto;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoRankListComponent {
  readonly rows = input<BentoRankRow[]>([]);
  readonly empty = input('Nothing here yet.');
}
