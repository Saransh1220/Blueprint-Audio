import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SuAccent = 'hot' | 'cobalt' | 'lime' | 'sun' | 'lavender' | 'tangerine';

/**
 * A single metric: label, value, optional change indicator, hint and sparkline.
 * `spark` is a ready-made `points` string for a 80×22 polyline.
 */
@Component({
  selector: 'su-stat',
  templateUrl: './su-stat.component.html',
  styleUrl: './su-stat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuStatComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly delta = input('');
  /** true = up (good), false = down, null = neutral. */
  readonly up = input<boolean | null>(null);
  readonly hint = input('');
  readonly spark = input('');
  readonly accent = input<SuAccent>('hot');
}
