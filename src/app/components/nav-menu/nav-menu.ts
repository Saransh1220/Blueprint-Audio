import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import type { NavMenuItem } from './nav-menu.items';

/**
 * The panel under a navbar link: a heading, a grid of destinations, and a slot for a footer.
 * It only draws; the navbar decides where it sits and when it shows. The current page's link is
 * marked by the router.
 */
@Component({
  selector: 'app-nav-menu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-menu.html',
  styleUrl: './nav-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavMenuComponent {
  readonly heading = input.required<string>();
  /** The last word of the heading, set in the accent face. */
  readonly accent = input('');
  readonly label = input('Menu');
  readonly items = input.required<readonly NavMenuItem[]>();

  /** A destination was chosen. */
  readonly selected = output<NavMenuItem>();
}
