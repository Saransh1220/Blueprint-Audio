import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { CartItem } from '../../../services/cart.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

/** One line of the cart: the cover, what it is, which license, the price, and a way to remove it. */
@Component({
  selector: 'app-cart-item',
  imports: [MoneyPipe],
  templateUrl: './cart-item.component.html',
  styleUrl: './cart-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItemComponent {
  readonly item = input.required<CartItem>();
  readonly remove = output<void>();

  /** The file types the license includes, e.g. "MP3 / WAV". */
  readonly formats = computed(() => {
    const types = this.item().license.fileTypes;
    return types?.length ? types.join(' / ') : 'Licensed audio';
  });
}
