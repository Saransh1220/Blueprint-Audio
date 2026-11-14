import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import type { NavMenuItem } from './nav-menu.items';

@Component({
  selector: 'app-nav-menu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-menu.html',
  styleUrl: './nav-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavMenuComponent {
  readonly label = input.required<string>();
  readonly items = input.required<readonly NavMenuItem[]>();
  readonly featuredRoute = input('');
}
