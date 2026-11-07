import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BentoFeedRow {
  id: string;
  title: string;
  text?: string;
  /** Right-aligned figure (already formatted). */
  trailing?: string;
  /** Small caption under the trailing figure. */
  time?: string;
  tone?: 'ok' | 'warn' | 'bad' | 'info';
  /** FontAwesome classes shown in the avatar instead of a letter. */
  icon?: string;
  /** Avatar letter source; falls back to the title. */
  avatar?: string;
  link?: string | null;
  /** Shows a small action button; emits the row id through `act`. */
  actionLabel?: string;
}

/** Compact list rows for orders, sales, notifications and purchases. */
@Component({
  selector: 'app-bento-feed',
  imports: [RouterLink],
  template: `
    @if (rows().length) {
      <ul [style.--cols]="columns()">
        @for (r of rows(); track r.id) {
          <li [attr.data-tone]="r.tone ?? 'info'">
            <span class="av" aria-hidden="true">
              @if (r.icon) {
                <i [class]="r.icon"></i>
              } @else {
                {{ (r.avatar || r.title).charAt(0) }}
              }
            </span>
            <span class="txt">
              @if (r.link && !r.actionLabel) {
                <a [routerLink]="r.link">{{ r.title }}</a>
              } @else {
                <strong>{{ r.title }}</strong>
              }
              @if (r.text) {
                <small>{{ r.text }}</small>
              }
            </span>
            @if (r.trailing || r.time) {
              <span class="end">
                @if (r.trailing) {
                  <b>{{ r.trailing }}</b>
                }
                @if (r.time) {
                  <small>{{ r.time }}</small>
                }
              </span>
            }
            @if (r.actionLabel) {
              @if (r.link) {
                <a class="act" [routerLink]="r.link" (click)="act.emit(r.id)">{{
                  r.actionLabel
                }}</a>
              } @else {
                <button type="button" class="act" (click)="act.emit(r.id)">
                  {{ r.actionLabel }}
                </button>
              }
            }
          </li>
        }
      </ul>
    } @else {
      <div class="empty-wrap">
        @if (emptyIcon()) {
          <i [class]="emptyIcon()" aria-hidden="true"></i>
        }
        <p class="empty" role="status">{{ empty() }}</p>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }
    ul {
      display: grid;
      grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr));
      gap: 12px 24px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .av {
      display: grid;
      flex: none;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      font: 500 13px var(--bento-font, sans-serif);
      text-transform: uppercase;
    }
    li[data-tone='ok'] .av {
      background: rgba(120, 220, 160, 0.22);
    }
    li[data-tone='warn'] .av {
      background: rgba(255, 179, 122, 0.25);
    }
    li[data-tone='bad'] .av {
      background: rgba(255, 90, 110, 0.28);
    }
    .txt {
      display: grid;
      flex: 1;
      min-width: 0;
    }
    .txt a,
    .txt strong {
      overflow: hidden;
      color: #fff;
      font-size: 13.5px;
      font-weight: 500;
      text-decoration: none;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .txt a:hover {
      text-decoration: underline;
    }
    small {
      overflow: hidden;
      color: rgba(255, 255, 255, 0.5);
      font-size: 11.5px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .end {
      display: grid;
      justify-items: end;
    }
    .end b {
      font: 400 13px var(--bento-mono, monospace);
      font-variant-numeric: tabular-nums;
    }
    .act {
      padding: 5px 12px;
      border: 1px solid var(--bento-glass-line, rgba(255, 255, 255, 0.2));
      border-radius: 999px;
      background: transparent;
      color: #fff;
      font: 500 11.5px var(--bento-font, sans-serif);
      text-decoration: none;
      cursor: pointer;
    }
    .act:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .act:focus-visible,
    .txt a:focus-visible {
      outline: 2px solid var(--bento-accent, #e8ff1f);
      outline-offset: 2px;
    }
    @media (max-width: 767px) {
      ul {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .empty-wrap {
      display: grid;
      flex: 1;
      place-content: center;
      justify-items: center;
      gap: 10px;
    }
    .empty-wrap i {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      font-size: 18px;
    }
    .empty {
      margin: 0;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoFeedComponent {
  readonly rows = input<BentoFeedRow[]>([]);
  readonly empty = input('Nothing here yet.');
  /** FontAwesome classes drawn above the empty message. */
  readonly emptyIcon = input('');
  /** Columns on wide screens (collapses to one on small screens). */
  readonly columns = input(1);
  readonly act = output<string>();
}
