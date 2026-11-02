import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HairlineBasketComponent } from '../../hairline-basket/hairline-basket';

/** The empty cart: a large drawn basket, a short line, and one clear way forward. */
@Component({
  selector: 'app-cart-empty',
  imports: [RouterLink, HairlineBasketComponent],
  templateUrl: './cart-empty.component.html',
  styleUrl: './cart-empty.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartEmptyComponent {}
