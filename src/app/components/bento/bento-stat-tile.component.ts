import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BentoCardComponent } from './bento-card.component';
import { BentoWaveComponent } from './bento-wave.component';

/**
 * KPI tile: caption, big light numeral, change chip and an optional sparkline.
 * `accent` paints the solid lime tile; otherwise it is a glass tile.
 */
@Component({
  selector: 'app-bento-stat-tile',
  imports: [BentoCardComponent, BentoWaveComponent, RouterLink],
  template: `
    <app-bento-card
      [palette]="accent() ? 'accent' : 'glass'"
      [span]="3"
      [spanMd]="6"
      [spanSm]="6"
      [spanXs]="12"
      [height]="168"
      [index]="index()"
    >
      <div class="tile" [class.accent]="accent()">
        <div class="cap">
          @if (icon()) {
            <i [class]="icon()" aria-hidden="true"></i>
          }
          <span>{{ label() }}</span>
          @if (link()) {
            <a class="go" [routerLink]="link()" [attr.aria-label]="'Open ' + label()">
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </a>
          }
        </div>

        @switch (state()) {
          @case ('loading') {
            <p class="status" role="status">Loading…</p>
          }
          @case ('unavailable') {
            <p class="status" role="status">Unavailable</p>
          }
          @default {
            <strong class="num">{{ value() }}</strong>
            <div class="foot">
              @if (delta()) {
                <span class="chip" [class.up]="up() === true" [class.down]="up() === false">
                  @if (up() !== null) {
                    <i
                      [class]="up() ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'"
                      aria-hidden="true"
                    ></i>
                  }
                  {{ delta() }}
                </span>
              }
              @if (hint()) {
                <span class="hint">{{ hint() }}</span>
              }
            </div>
            @if (spark().length > 1) {
              <app-bento-wave
                class="spark"
                [values]="spark()"
                [compact]="true"
                [ariaLabel]="label() + ' trend'"
              />
            }
          }
        }
      </div>
    </app-bento-card>
  `,
  styles: `
    :host {
      display: contents;
    }
    .tile {
      container-type: inline-size;
      position: relative;
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 6px;
    }
    .cap {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.78;
    }
    .go {
      margin-left: auto;
      color: inherit;
      opacity: 0.7;
    }
    .go:hover {
      opacity: 1;
    }
    .go:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 3px;
      border-radius: 4px;
    }
    .num {
      margin-top: auto;
      font-size: clamp(32px, 3.4vw, 46px);
      font-weight: 200;
      letter-spacing: -0.03em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .status {
      margin: auto 0 0;
      opacity: 0.6;
      font-size: 14px;
    }
    .foot {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 20px;
      font-size: 12px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      font: 500 11px var(--bento-mono, monospace);
    }
    .tile.accent .chip {
      background: rgba(0, 0, 0, 0.12);
    }
    .hint {
      opacity: 0.6;
    }
    @container (max-width: 230px) {
      .spark {
        display: none;
      }
    }
    .spark {
      position: absolute;
      right: 0;
      top: 38px;
      width: 46%;
      height: 46px;
      opacity: 0.85;
      --bento-wave: currentColor;
      --wave-h: 46px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BentoStatTileComponent {
  readonly label = input.required<string>();
  readonly value = input('');
  readonly state = input<'ready' | 'loading' | 'unavailable'>('ready');
  readonly delta = input('');
  /** true = up, false = down, null = neutral. */
  readonly up = input<boolean | null>(null);
  readonly hint = input('');
  readonly icon = input('');
  readonly spark = input<number[]>([]);
  readonly accent = input(false);
  readonly link = input('');
  readonly index = input(0);
}
