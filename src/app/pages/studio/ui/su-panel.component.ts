import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SuAccent } from './su-stat.component';

/**
 * A titled section container. Default content is the body; anything marked `panelActions`
 * sits at the right of the header. `flush` removes body padding for lists and tables.
 * `tone="dark"` turns it into an inverted anchor panel; `accent` adds a small colour marker
 * beside the title.
 */
@Component({
  selector: 'su-panel',
  templateUrl: './su-panel.component.html',
  styleUrl: './su-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-tone]': 'tone()',
    '[attr.data-accent]': 'accent() || null',
  },
})
export class SuPanelComponent {
  readonly heading = input.required<string>();
  readonly hint = input('');
  readonly flush = input(false);
  readonly tone = input<'default' | 'dark' | 'soft'>('default');
  readonly accent = input<SuAccent | ''>('');
}
