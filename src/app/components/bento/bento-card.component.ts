import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BentoPalette =
  | 'glass'
  | 'accent'
  | 'blue'
  | 'graphite'
  | 'pink'
  | 'copper'
  | 'green'
  | 'lime';

/**
 * One rounded tile of the bento grid. `span*` are column counts at the desktop, <=1199px,
 * <=767px and <=520px breakpoints. `index` staggers the entrance by 60ms steps.
 */
@Component({
  selector: 'app-bento-card',
  template: `
    @if (heading()) {
      <header class="top">
        <div class="titles">
          <h2>{{ heading() }}</h2>
          @if (hint()) {
            <p>{{ hint() }}</p>
          }
        </div>
        <div class="actions"><ng-content select="[cardActions]" /></div>
      </header>
    }
    <div class="body"><ng-content /></div>
  `,
  styleUrl: './bento-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-palette]': 'palette()',
    '[style.--s]': 'span()',
    '[style.--s-md]': 'spanMd()',
    '[style.--s-sm]': 'spanSm()',
    '[style.--s-xs]': 'spanXs()',
    '[style.--h]': 'height() ? height() + "px" : null',
    '[style.--delay]': 'index() * 60 + "ms"',
  },
})
export class BentoCardComponent {
  readonly heading = input('');
  readonly hint = input('');
  readonly palette = input<BentoPalette>('glass');
  readonly span = input(12);
  readonly spanMd = input(12);
  readonly spanSm = input(12);
  readonly spanXs = input(12);
  /** Card height in px on desktop; omitted = content height. */
  readonly height = input<number | null>(null);
  readonly index = input(0);
}
