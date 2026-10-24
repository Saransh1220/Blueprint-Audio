import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Page heading for studio pages: eyebrow, title with an italic accent, optional subtitle,
 * and a slot (default content) for the page's actions.
 */
@Component({
  selector: 'su-page-head',
  templateUrl: './su-page-head.component.html',
  styleUrl: './su-page-head.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuPageHeadComponent {
  readonly eyebrow = input('');
  readonly heading = input.required<string>();
  /** Rendered in the italic serif accent after the title. */
  readonly accent = input('');
  readonly subtitle = input('');
}
